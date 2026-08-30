# C3 Creations Roadmap

Rough order, not strict — pulled from the README's "Future Features" section plus tech debt
surfaced while documenting the current architecture. Treat each bullet as a candidate
Epic/issue, not a commitment.

- **Auth & user accounts** (#5)
  A login flow so `contributor` becomes a real identity instead of free text, and so
  edit/delete can check who is asking — see [data-model.md](./data-model.md).

  **Not Supabase.** The app is intended to run LAN-only (see
  [architecture.md](./architecture.md#deployment-model-and-threat-model)), and a hosted auth
  provider would put an internet dependency — and a free-tier inactivity pause — in front of
  the one component gating all access. The plan is reverse-proxy forward auth
  (Authelia/Authentik) on the same host: the proxy authenticates and passes the username to
  Express as a header, which means no login UI, no session handling, and no token
  verification in this codebase. Its one hard requirement is that the server port must not be
  reachable except through the proxy, or the header can be forged.

  Not urgent while two trusted people share a private LAN, but it is the prerequisite for
  opening the app to coworkers — see
  [architecture.md](./architecture.md#deployment-model-and-threat-model).

  Stack decided in #5: Caddy + Authelia on a Proxmox VM, with real certificates via the
  DNS-01 ACME challenge (no port forwarding) and a Pi-hole local DNS record pointing the
  hostname at the LAN IP.

- **Image upload** (#6 server, #24 client) — _done._
  The Contribute form takes a photo upload or a pasted link; both end up as a string in
  `image_url`. Files are stored on local disk under `UPLOAD_DIR` (default `server/uploads`)
  and served from `/api/uploads/`, with the format decided by sniffing magic bytes and the
  filename generated server-side.

  The browser downscales to 1600px and re-encodes to JPEG before uploading, which also
  discards EXIF — that matters because contributors photograph meals at home and raw phone
  photos carry GPS coordinates. Orientation is applied at decode so stripping the metadata
  doesn't leave portrait photos sideways.

  Still open: the route is unauthenticated, so it needs the proxy's user header when #5
  lands.

- **Edit & delete recipes** — _delete UI landed, edit UI and ownership pending._
  `DELETE /api/recipes/:recipe_id` is wired up from the recipe grid: a delete icon on each
  tile opens a confirmation modal naming the recipe, and confirming removes the tile without
  a refetch. Still open: no client calls `PATCH` yet (#20), and neither route checks who is
  asking — any visitor can delete any recipe until auth lands (#7).

- **"My Recipes" page** (#19) — _done._
  `/my-recipes` shows the tile grid filtered to your own contributions, and delete now lives
  there instead of on the public landing grid. Identity is a `localStorage` name the
  Contribute form remembers on submit — a per-device convenience, not a login, and not
  access control: the API still has no ownership checks (#7). Edit is #20.

- **Submission preview modal** — _done._
  Submitting the Contribute form opens `SubmissionPreviewModal.jsx` (name, style, contributor,
  ingredients, instructions, image) and only confirming from it POSTs to `/api/recipes`. The
  previewed object is the request body, so blank rows are dropped from both rather than only
  hidden from view.

- **Favorites / upvotes + sorting & filtering** (#9, #10)
  Upvote recipes, sort by most-liked, filter/sort by style, contributor, or submission date.
  Depends on auth for favorites; sorting/filtering by `style` would want an index — see
  [data-model.md](./data-model.md#indexes-to-add-ifwhen-this-needs-to-scale).

## Tech debt (not in the README, found while documenting the code)

- **Consolidate the duplicate `/` and `/recipes` implementations.** `pages/HomePage.jsx` is
  dead code (unrouted); `components/Recipes.jsx` (bare `<select>`) is far less developed than
  `RecipeTile.jsx`'s grid+modal pattern used on the landing page. `/recipes` is still routed
  but no longer linked from the navbar (#17), so deleting both is now a smaller decision than
  it was. See
  [architecture.md](./architecture.md#known-duplication-two-implementations-per-route).
- **No test suite in either workspace.** CI currently only runs ESLint + Prettier
  (`.github/workflows/cicd.yml`) — no test job exists to add to.

## Explicitly out of scope for now

- Multi-tenant / multi-org support — this is a single-team internal tool.
- Recipe versioning or edit history.
- Any deploy automation past the Docker Hub image push — nothing currently pulls `:latest`
  onto a running host.
