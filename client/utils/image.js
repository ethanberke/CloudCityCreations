import { apiBase, postJson } from "./api";

// Contributors photograph their dinner, so what arrives here is a raw phone
// photo: several megabytes, rotated by an EXIF flag, and tagged with the GPS
// coordinates of wherever it was taken. Everything below exists to deal with
// that before a single byte leaves the browser.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_ACCEPT = ACCEPTED_TYPES.join(",");
export const FALLBACK_IMAGE = "/images/grogu_peak.jpg";

// `image_url` holds two shapes: absolute links someone pasted, and paths this
// server issued for uploads. Only the second needs the API base attached.
export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return FALLBACK_IMAGE;
  if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/api/uploads/")) {
    return `${apiBase()}${imageUrl.slice("/api".length)}`;
  }
  return imageUrl;
}

export async function prepareImage(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
      throw new Error(
        "HEIC photos can't be read here. Sharing straight from an iPhone " +
          "usually converts to JPEG — otherwise export it as JPEG first.",
      );
    }
    throw new Error("Pick a JPEG, PNG, or WebP image.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("That image is too large to process. Try one under 25 MB.");
  }

  // `from-image` applies the EXIF rotation flag while decoding. Without it the
  // re-encode below would silently drop the flag and portrait photos would
  // come out sideways.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Re-encoding is also what discards the metadata block, GPS included.
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not process that image.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  return blob;
}

export async function uploadImage(blob) {
  const body = new FormData();
  body.append("image", blob, "upload.jpg");

  const res = await fetch(`${apiBase()}/uploads`, { method: "POST", body });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url;
}

// Copies a photo from an imported recipe page onto our own disk, so the recipe
// keeps its picture when the source site moves it or starts refusing hotlinks.
// The server does the fetching: it's the side that can check where the link
// actually resolves before opening a socket.
export async function storeImageFromUrl(url) {
  const stored = await postJson("/uploads/from-url", { url });
  return stored.url;
}
