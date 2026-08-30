# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Cloud City Culinary Creations (C3 Creations) — a Star Wars-themed recipe sharing app for internal team potlucks. Stack: React (Vite) + Material UI on the frontend, Express + `postgres` (porsager/postgres, not raw `pg`) on the backend, PostgreSQL for storage. One more service sits beside them: `scraper/`, a Python (FastAPI) recipe importer that turns a pasted recipe URL into Contribute-form fields (#33). It is not an npm workspace and has no database access.

## Commands

This is an npm workspaces monorepo (`server`, `client`) with root scripts driving both.

```bash
# from repo root
npm install                # installs root + workspace deps
npm run dev                 # runs client and server dev servers concurrently
npm run lint                 # prettier --check across the whole repo

# client (from client/)
npm run dev                  # vite dev server, http://localhost:5173
npm run build                # vite production build
npm run lint                  # eslint .
npm run prettier               # prettier . --check

# server (from server/)
npm run dev                  # nodemon server.js
npm start                     # node server.js
npm run lint                   # eslint .
npm run prettier                # prettier . --check
```

```bash
# scraper (from scraper/) — Python, not an npm workspace
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn main:app --port 8001 --reload   # dev server
.venv/bin/python -m pytest -q                      # the repo's only test suite
.venv/bin/ruff check . && .venv/bin/ruff format .  # lint + format (CI runs both)
```

Neither JS workspace has tests. `scraper/test_extract.py` is the only automated test in the
repo, and CI runs it inside the `lint` job.

### Database

```bash
createdb recipes
psql -d recipes -f server/migration.sql   # drops/recreates tables and seeds sample recipes
```

`migration.sql` is destructive (`DROP TABLE IF EXISTS`) and reseeds fixed sample data — expect it to wipe local data on every run.

### GitHub authentication

A fine-grained PAT for `gh`/`git` operations (commits, pushes, issues, PRs, Actions) lives in
a root-level `.env.tooling` as `GH_TOKEN`. Source it explicitly before running `gh` commands
(`set -a; source .env.tooling; set +a`); never print its value.

**The boundary is real now (#27), not a naming convention.** There is no repo-root `.env` at
all — `server/.env` holds the app config and is the only file the server reads
(`dotenv.config()`, resolved from the working directory), and `client/vite.config.js` reads no
env whatsoever. `.env.tooling` is loaded by nothing but the shell, so the PAT cannot reach the
server's or the Vite build's process environment even by accident.

`.gitignore` ignores every `.env*` variant and re-includes only `*.env.template`, so a new
secrets file is ignored by default rather than needing a new rule. Each of `client/` and
`server/` has its own `.env` (see the `.env.template` beside it); `compose.yaml` overrides
`POSTGRES_HOST`/`DATABASE_URL` for the containerised server, since `server/.env` carries
`localhost` values for host-side `npm run dev`.

### Docker

Uploaded recipe photos are written to `UPLOAD_DIR` (default `server/uploads`, gitignored) and served from `/api/uploads/`. In Docker they land in `./server/uploads` on the host via the existing `./server:/app` bind mount — a real deploy without that bind mount would need a named volume, or photos vanish on rebuild.

`compose.yaml` defines four services: `client` (Vite dev server on 5173), `server` (Express on 5000), `db` (postgres:15 on 5432, auto-seeded from `server/migration.sql` via `docker-entrypoint-initdb.d`), and `scraper` (FastAPI on 8001, published as `127.0.0.1:8001` only — the containerised server reaches it as `scraper:8001`, and the host-side server through the loopback binding; nothing on the LAN needs it). Each of `client/` and `server/` needs its own `.env` (see `.env.template` in each dir) since `env_file` is scoped per-service; `scraper` needs none.

CI (`.github/workflows/cicd.yml`) runs ESLint + Prettier for both JS workspaces plus ruff and pytest for `scraper` on push/PR to `main`, then on success builds and pushes `client`, `server` and `scraper` Docker images to Docker Hub as `cloudcitycreations-client`/`-server`/`-scraper`.

## Architecture

### Data model

Three tables, one-to-many from `recipes`: `recipes(id, contributor, recipe_name, style, image_url, created_at)`, `ingredients(id, recipe_id, ingredient)`, `instructions(id, recipe_id, step_order, step)`. There is no `users`/auth table yet. `created_at` defaults to `now()` and is never written explicitly — `PATCH` leaves it alone, so it means "submitted", not "last touched".

### API (`server/server.js`)

Single-file Express server, no router modules, no ORM/query builder — uses `postgres` tagged-template SQL directly.

- `GET /api/recipes` — recipes, each with `ingredients` and `instructions` aggregated via correlated subqueries (`json_agg`) into nested JSON. Optional query params: `style` and `contributor` (case-insensitive exact match, matching the `lower(...)` indexes in `migration.sql`), and `sort` (`newest` default, `oldest`, `name`, `contributor`; unknown values `400`). Sort fragments are a fixed lookup map — nothing from the URL is interpolated as an identifier.
- `GET /api/recipes/:recipe_id` — same shape, single recipe.
- `POST /api/recipes` — inserts into `recipes`, then loops individual `INSERT`s into `ingredients` and `instructions`, all inside `sql.begin(...)` so a partial insert rolls back.
- `PATCH /api/recipes/:recipe_id` — replaces the recipe and re-inserts all of its children (not a merge — `step_order` is renumbered from the new array). Every field is required: `postgres` rejects `undefined`, so a partial body 500s and rolls back rather than clearing columns.
- `DELETE /api/recipes/:recipe_id` — deletes the recipe's `ingredients`/`instructions` rows then the recipe itself, in one transaction; the schema has no `ON DELETE CASCADE`. Both respond `404` when the id doesn't exist.
- Neither `PATCH` nor `DELETE` checks ownership — there's no auth, so any caller can modify any recipe.
- `POST /api/scrape` — proxies `{ url }` to the `scraper` service (`SCRAPER_URL`, default `http://localhost:8001`) and returns Contribute-form fields. Reads nothing, writes nothing; `503` when the importer isn't running, and the importer's own message passes through on `400`/`422`/`502`/`504`.
- `POST /api/uploads/from-url` — copies a remote photo onto local disk through the same `sniffImage`/`saveImage` path as an upload, returning `{ url }`. Called when the submission preview is confirmed, not at import time, so an abandoned import writes no file.
- Serves `client/dist` as static files (post-build), and allows CORS only from `localhost:5173` / `127.0.0.1:5173`.

### Outbound requests and SSRF

`/api/scrape` and `/api/uploads/from-url` are the app's only outbound internet calls, and both fetch a URL that came from a person or from someone else's page. `server/lib/remoteImage.js` and `scraper/fetching.py` each: allow only http/https, resolve the host and refuse non-public addresses (loopback, RFC1918, CGNAT, link-local, multicast, reserved; IPv4 and IPv6), re-check every redirect hop instead of letting the HTTP client follow them, and cap body size and time. Keep both guards in place when touching either path — a LAN box fetching arbitrary URLs is the whole risk here. Note this is about the _server_ reaching the internet; `image_url` has always accepted external links that viewers' browsers load themselves.

### Frontend (`client/`)

Entry: `index.jsx` → wraps `App` in `ThemeWrapper` (`components/DarkMode.jsx`, MUI light/dark theme + `ColorModeContext`) → `App.jsx` defines routes with `react-router-dom`.

Routes (`App.jsx`): `/` → `components/Landing.jsx`, `/my-recipes` → `pages/MyRecipesPage.jsx`, `/contribute` → `pages/ContributePage.jsx`, `/about` → `pages/About.jsx`. `Navbar` is rendered outside `<Routes>` so it's present on every page.

The "pages vs components" duplication left over from an earlier refactor is **gone**. `pages/HomePage.jsx` was deleted previously; `pages/RecipesPage.jsx` + `components/Recipes.jsx` (a bare `<select>` of recipe names, unlinked from the navbar since #17) were deleted once the landing grid gained filtering in #10, which is what `/recipes` had been for. There is now one implementation per route.

When extending recipe browsing/detail UI, build on `RecipeTile.jsx`'s pattern (MUI `Card`/`Grid`/`Modal`).

`RecipeTile.jsx` fetches `/api/recipes` independently of `Landing.jsx` (which also fetches and passes `recipes` as a prop it doesn't use) — another artifact of the in-progress refactor.

`components/RecipeImport.jsx` sits above the form on `/contribute`: it POSTs a pasted URL to `/api/scrape` and hands the result to `form.applyImportedRecipe` (`hooks/useRecipeForm.js`), which replaces every field except `contributor` — whoever is filling in the form is the contributor, not the site's author. Imports only prefill; `SubmissionPreviewModal` is still what writes. `buildSubmission` copies an imported photo to local disk at confirm time, and only when the image field still matches what the import returned, so a hand-edited link stays a hand-edited link.

`components/Contribute.jsx` builds a recipe object client-side (ingredients/instructions as growable arrays of text fields) and calls `onRecipeSubmit` passed down from `pages/ContributePage.jsx`, which POSTs to `/api/recipes`.

Import order is enforced by `@ianvs/prettier-plugin-sort-imports` per `prettier.config.cjs`: `react` → `@mui/*` → `@/components/*` → `@/utils/*` → relative imports, each group separated by a blank line.

### Planned but not yet implemented (per README)

Auth and favorites/upvotes. Don't assume either exists in the code yet.

Already landed (don't re-plan these): the `PATCH`/`DELETE` API routes (unowned and unauthenticated), the delete confirmation UI, the submission preview modal, `/my-recipes`, image upload, the edit-recipe modal, sorting/filtering (#10), and recipe import by URL (#33).

Sorting/filtering is server-side: `components/RecipeFilters.jsx` sits above the grid on the landing page and drives query params on `GET /api/recipes`. Its dropdown options are built from the first _unfiltered_ response — rebuilding them from a filtered one would remove the option just chosen. `/my-recipes` still filters client-side by `localStorage` name (`utils/contributor.js`); that's a different mechanism, not an oversight.

The README's auth section is current; older references to "Supabase" for auth or image storage are out of date wherever they survive (`client/utils/contributor.js` still names it in a comment). The app is intended to run LAN-only for two people, so the plan is reverse-proxy forward auth and images on local disk in a Docker volume, not a hosted provider. See `docs/architecture.md` → "Deployment model and threat model" before proposing cloud services.
