import dns from "node:dns/promises";
import net from "node:net";
import {
  MAX_UPLOAD_BYTES,
  saveImage,
  sniffImage,
  UPLOAD_URL_PREFIX,
} from "./images.js";

// Same reasoning as the importer's fetch guard, on this side of the wire: the
// URL comes from a scraped page, and this process can reach the homelab's own
// subnet. Fetching one is a request we make to wherever it points, so the host
// is resolved and checked before a socket opens and every redirect hop is
// checked again.

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export class RemoteImageError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Everything outside the public unicast ranges, written out because Node has no
// equivalent of Python's ip_address.is_global. Covers loopback, RFC1918, CGNAT,
// link-local (169.254.169.254 included), multicast and the reserved blocks.
function isPublicIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);

  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || b === 0)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;

  return true;
}

function isPublicAddress(ip) {
  if (net.isIPv4(ip)) return isPublicIPv4(ip);
  if (!net.isIPv6(ip)) return false;

  const address = ip.toLowerCase();

  // ::ffff:10.0.0.1 reaches the same host as 10.0.0.1, so it gets the same test.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);

  if (address === "::1" || address === "::") return false;
  if (/^f[cd]/.test(address)) return false; // unique local
  if (/^fe[89ab]/.test(address)) return false; // link local
  if (/^ff/.test(address)) return false; // multicast

  return true;
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new RemoteImageError("That isn't a usable image link.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RemoteImageError(
      "Only http:// and https:// images can be saved.",
      400,
    );
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true }).catch(() => {
        throw new RemoteImageError(`Could not resolve ${host}.`, 400);
      });

  if (!addresses.every(({ address }) => isPublicAddress(address))) {
    throw new RemoteImageError(
      `${host} resolves to a private address, so it wasn't fetched.`,
      400,
    );
  }

  return url;
}

// Read against the same cap the upload route enforces, rather than buffering
// whatever the host decides to send. Content-Length is checked first when it's
// there, but it's a claim, not a promise — the loop is what actually stops.
async function readCapped(response) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > MAX_UPLOAD_BYTES) {
    throw new RemoteImageError("That image is too large to save.", 413);
  }

  const chunks = [];
  let total = 0;

  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      throw new RemoteImageError("That image is too large to save.", 413);
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Copy a remote image onto local disk and return the stored `/api/uploads/...`
 * path, so a saved recipe keeps its photo when the source site moves it, blocks
 * hotlinking, or disappears.
 */
export async function storeRemoteImage(rawUrl) {
  let current = await assertPublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    }).catch((error) => {
      const timedOut = error.name === "TimeoutError";
      throw new RemoteImageError(
        timedOut
          ? "That image took too long to download."
          : "Could not download that image.",
        timedOut ? 504 : 502,
      );
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new RemoteImageError("That image link redirects nowhere.", 502);
      }
      // Cancelled explicitly: an undrained body keeps the socket open.
      await response.body?.cancel();
      current = await assertPublicUrl(new URL(location, current).href);
      continue;
    }

    if (!response.ok) {
      throw new RemoteImageError(
        `That image returned ${response.status}.`,
        502,
      );
    }

    const bytes = await readCapped(response);

    // The declared Content-Type is ignored here for the same reason it is on
    // the upload route: only the magic bytes decide what gets written.
    const signature = sniffImage(bytes);
    if (!signature) {
      throw new RemoteImageError(
        "That link isn't a JPEG, PNG, or WebP image.",
        415,
      );
    }

    return `${UPLOAD_URL_PREFIX}${await saveImage(bytes, signature.ext)}`;
  }

  throw new RemoteImageError("That image link redirected too many times.", 502);
}
