# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Cloud City Culinary Creations (C3 Creations) — a Star Wars-themed recipe sharing app for internal team potlucks. Stack: React (Vite) + Material UI on the frontend, Express + `postgres` (porsager/postgres, not raw `pg`) on the backend, PostgreSQL for storage.

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

There is no test suite configured in either workspace.

### Database

```bash
createdb recipes
psql -d recipes -f server/migration.sql   # drops/recreates tables and seeds sample recipes
```

`migration.sql` is destructive (`DROP TABLE IF EXISTS`) and reseeds fixed sample data — expect it to wipe local data on every run.

### GitHub authentication

A fine-grained PAT for `gh`/`git` operations (commits, pushes, issues, PRs, Actions) lives in
a root-level `.env` as `GH_TOKEN` — gitignored (`**/.env`). Source it from that file before
running `gh` commands; never print its value.

**The separation this file used to claim doesn't exist (#27).** The root `.env` also holds
`DATABASE_URL` and the `POSTGRES_*` vars, `server/.env` is an empty file, and
`client/vite.config.js` calls `dotenv.config({ path: "../.env" })` — so the PAT is loaded into
both the server's and the Vite build's process environment. Nothing leaks today, since Vite
only inlines `VITE_`-prefixed vars and the built bundle is clean, but the boundary is a naming
convention rather than an actual barrier.

### Docker

`compose.yaml` defines three services: `client` (Vite dev server on 5173), `server` (Express on 5000), `db` (postgres:15 on 5432, auto-seeded from `server/migration.sql` via `docker-entrypoint-initdb.d`). Each of `client/` and `server/` needs its own `.env` (see `.env.template` in each dir) since `env_file` is scoped per-service.

CI (`.github/workflows/cicd.yml`) runs ESLint + Prettier for both workspaces on push/PR to `main`, then on success builds and pushes `client` and `server` Docker images to Docker Hub as `cloudcitycreations-client`/`cloudcitycreations-server`.

## Architecture

### Data model

Three tables, one-to-many from `recipes`: `recipes(id, contributor, recipe_name, style, image_url)`, `ingredients(id, recipe_id, ingredient)`, `instructions(id, recipe_id, step_order, step)`. There is no `users`/auth table yet.

### API (`server/server.js`)

Single-file Express server, no router modules, no ORM/query builder — uses `postgres` tagged-template SQL directly.

- `GET /api/recipes` — all recipes, each with `ingredients` and `instructions` aggregated via correlated subqueries (`json_agg`) into nested JSON.
- `GET /api/recipes/:recipe_id` — same shape, single recipe.
- `POST /api/recipes` — inserts into `recipes`, then loops individual `INSERT`s into `ingredients` and `instructions`, all inside `sql.begin(...)` so a partial insert rolls back.
- `PATCH /api/recipes/:recipe_id` — replaces the recipe and re-inserts all of its children (not a merge — `step_order` is renumbered from the new array). Every field is required: `postgres` rejects `undefined`, so a partial body 500s and rolls back rather than clearing columns.
- `DELETE /api/recipes/:recipe_id` — deletes the recipe's `ingredients`/`instructions` rows then the recipe itself, in one transaction; the schema has no `ON DELETE CASCADE`. Both respond `404` when the id doesn't exist.
- Neither `PATCH` nor `DELETE` checks ownership — there's no auth, so any caller can modify any recipe.
- Serves `client/dist` as static files (post-build), and allows CORS only from `localhost:5173` / `127.0.0.1:5173`.

### Frontend (`client/`)

Entry: `index.jsx` → wraps `App` in `ThemeWrapper` (`components/DarkMode.jsx`, MUI light/dark theme + `ColorModeContext`) → `App.jsx` defines routes with `react-router-dom`.

Routes (`App.jsx`): `/` → `components/Landing.jsx`, `/recipes` → `pages/RecipesPage.jsx`, `/contribute` → `pages/ContributePage.jsx`, `/about` → `pages/About.jsx`. `Navbar` is rendered outside `<Routes>` so it's present on every page.

Two parallel "pages vs components" implementations exist for the same routes — this is left over from in-progress refactoring, not an intentional pattern:
- `components/Landing.jsx` (MUI, fetches `/api/recipes`, renders `RecipeTile`) is what's actually wired to `/` — `pages/HomePage.jsx` (plain HTML, unstyled) is not used anywhere.
- `pages/RecipesPage.jsx` + `components/Recipes.jsx` (plain `<select>` of recipe names, minimal) is what's wired to `/recipes`, and is far less developed than `components/RecipeTile.jsx`'s grid+modal view used on the landing page.

When extending recipe browsing/detail UI, prefer building on `RecipeTile.jsx`'s pattern (MUI `Card`/`Grid`/`Modal`) over `Recipes.jsx`. If asked to consolidate, flag the `HomePage.jsx`/`Recipes.jsx` duplication rather than assuming it's intentional.

`RecipeTile.jsx` fetches `/api/recipes` independently of `Landing.jsx` (which also fetches and passes `recipes` as a prop it doesn't use) — another artifact of the in-progress refactor.

`components/Contribute.jsx` builds a recipe object client-side (ingredients/instructions as growable arrays of text fields) and calls `onRecipeSubmit` passed down from `pages/ContributePage.jsx`, which POSTs to `/api/recipes`.

Import order is enforced by `@ianvs/prettier-plugin-sort-imports` per `prettier.config.cjs`: `react` → `@mui/*` → `@/components/*` → `@/utils/*` → relative imports, each group separated by a blank line.

### Planned but not yet implemented (per README)

Auth, image upload, edit UI, favorites/upvotes, sorting/filtering. Don't assume any of this exists in the code yet.

Already landed (don't re-plan these): the `PATCH`/`DELETE` API routes (unowned and unauthenticated), the delete confirmation UI, the submission preview modal, and `/my-recipes`.

The README still describes auth and image storage as "Supabase" — that is out of date. The app is intended to run LAN-only for two people, so the plan is reverse-proxy forward auth and images on local disk in a Docker volume, not a hosted provider. See `docs/architecture.md` → "Deployment model and threat model" before proposing cloud services.
