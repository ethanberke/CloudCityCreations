// One definition of where the API lives. `VITE_API_URL` is a path (`/api`) in
// dev, where Vite proxies it, and can be an absolute origin in a deployment
// that doesn't serve the built client from Express.
export function apiBase() {
  return (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
}

// Server-side failures on these routes describe what the person typed — a dead
// link, a page with no recipe, a photo that isn't an image — so the message in
// the body is worth surfacing rather than a bare status code.
export async function postJson(path, body) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error ?? `Request failed (${res.status})`);
  }

  return payload;
}
