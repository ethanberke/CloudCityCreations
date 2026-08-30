import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Resolved against the server directory rather than cwd, so the location
// doesn't shift depending on where the process was started from.
export const UPLOAD_DIR = path.resolve(
  serverDir,
  process.env.UPLOAD_DIR || "uploads",
);

// Anything stored by this server is referenced by this prefix. Recipes may
// also carry pasted external URLs, which we never touch.
export const UPLOAD_URL_PREFIX = "/api/uploads/";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// The browser's declared MIME type is attacker-controlled. Decide the format
// from the bytes instead: an HTML file named .jpg, served back from our own
// origin, is stored XSS.
const SIGNATURES = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    test: (b) =>
      b.length >= 8 &&
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return SIGNATURES.find((sig) => sig.test(buffer)) ?? null;
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

// The client's filename is never used. A name we generated can't traverse out
// of the upload directory, which removes the bug class instead of filtering
// for it.
export async function saveImage(buffer, ext) {
  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

function localFilename(imageUrl) {
  if (typeof imageUrl !== "string") return null;
  if (!imageUrl.startsWith(UPLOAD_URL_PREFIX)) return null;

  const filename = imageUrl.slice(UPLOAD_URL_PREFIX.length);
  // Reject anything that isn't a bare name we could have generated, so a
  // crafted image_url can't point the unlink at some other file.
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) return null;

  return filename;
}

// Best effort: a recipe delete must not fail because its photo was already
// gone from disk.
export async function deleteImageIfLocal(imageUrl) {
  const filename = localFilename(imageUrl);
  if (!filename) return;

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove upload:", filename, error.message);
    }
  }
}
