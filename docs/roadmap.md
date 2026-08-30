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

- **Edit & delete recipes** — _UI done, ownership pending._
  Both routes are wired up from the recipe grid on `/my-recipes`. Delete puts a confirmation
  modal naming the recipe on each tile. Edit (#20) turns the detail modal into a prefilled
  form; saving opens the same preview modal the Contribute page uses, and confirming `PATCH`es
  and re-reads the recipe so the list matches what was written.

  Owner actions are gated behind `showOwnerActions`, so neither appears on the public landing
  grid. Still open: neither route checks who is asking — any caller can edit or delete any
  recipe until auth lands (#7).

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

- **Sorting & filtering** (#10) — _done._
  `GET /api/recipes` takes optional `style`, `contributor` and `sort` params, and the landing
  page puts a filter bar above the tile grid that drives them. Filtering happens in SQL, not
  in the client, and both filters match case-insensitively since the columns are free text.
  Sorting by submission date needed a `created_at` column, which is now on `recipes`; the
  `lower(style)`/`lower(contributor)` indexes went in alongside — see
  [data-model.md](./data-model.md#indexes).

  The dropdown options are built from the values in the first unfiltered response, so a new
  style becomes filterable the moment a recipe uses it. `/my-recipes` was left alone.

- **Import a recipe by URL** (#33) — _done._
  Paste a recipe link on `/contribute` and the form fills itself in — name, style,
  ingredients, steps and photo — with every field still editable and the existing preview
  modal still the thing that writes it. Parsing runs in a separate Python service
  (`scraper/`, FastAPI + `recipe-scrapers` with a schema.org JSON-LD fallback) because that
  is where the maintained recipe parsers live; Express proxies it at `POST /api/scrape` so
  the browser keeps one origin.

  This is the app's first outbound internet dependency, and the only one — see
  [architecture.md](./architecture.md#deployment-model-and-threat-model) for the SSRF guards
  that come with letting a LAN box fetch a pasted URL. Still open: the route is
  unauthenticated like every other one, so it wants the proxy's user header when #5 lands.

  Not included: storing the source URL as attribution (needs a `recipes` column, and
  `migration.sql` is destructive — its own issue), and sites that render recipes in
  JavaScript or publish them as pictures of a page, which fail with a message saying to type
  it in by hand.

- **Favorites / upvotes** (#9)
  Upvote recipes and sort by most-liked. Blocked on auth — a vote needs an identity behind it,
  and `localStorage` names would not stop anyone voting twice. The sort itself plugs into the
  `sort` param #10 added.

## Tech debt (not in the README, found while documenting the code)

- ~~**Consolidate the duplicate `/` and `/recipes` implementations.**~~ _Done._
  `pages/HomePage.jsx`, `pages/RecipesPage.jsx` and `components/Recipes.jsx` are deleted along
  with the `/recipes` route. The landing grid gaining filtering (#10) removed the last reason
  that page existed, and the navbar had not linked it since #17. See
  [architecture.md](./architecture.md#frontend-one-implementation-per-route).
- ~~**Root `.env` mixes the GitHub PAT with app config** (#27).~~ _Done._
  `GH_TOKEN` moved to `.env.tooling`, read only by the shell. The repo-root `.env` is gone:
  `server/.env` is the server's only config source, and `client/vite.config.js` no longer
  calls `dotenv` at all. `.gitignore` now ignores every `.env*` variant by default.
- **No test suite in either JS workspace.** `scraper/test_extract.py` (#33) is the first
  automated test in the repo, and CI now runs it — but it covers the Python parsing layer
  only. Express and the React client are still verified by hand, which is the largest
  remaining item here: #10 and #27 were both checked that way and none of it is captured.

## Explicitly out of scope for now

- Multi-tenant / multi-org support — this is a single-team internal tool.
- Recipe versioning or edit history.
- Any deploy automation past the Docker Hub image push — nothing currently pulls `:latest`
  onto a running host.
