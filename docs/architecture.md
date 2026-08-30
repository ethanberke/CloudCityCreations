# C3 Creations Architecture

## Goals driving the design

- Small, single-team internal tool — no public signup, no scale concerns, built for one
  office's potlucks and chili cookoffs.
- Keep the stack boring: React (Vite) + MUI on the front end, a single Express file on the
  back end, Postgres for storage. No ORM, no router modules, no state library.
- Ship fast, iterate later — auth and image upload are explicitly deferred (see
  [roadmap.md](./roadmap.md)) rather than blocking the first usable version. Edit/delete
  exist at the API level but are unowned and unauthenticated for the same reason.

## Services

| Service  | Stack                                 | Responsibility                                                                 |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `client` | React + Vite, Material UI             | Browse recipes (grid + modal), submit new recipes                              |
| `server` | Node + Express, `postgres` (porsager) | Single-file REST API over three tables, serves `client/dist` in prod           |
| `db`     | PostgreSQL 15                         | `recipes` / `ingredients` / `instructions`, seeded from `server/migration.sql` |

This is an npm workspaces monorepo (`server`, `client`) with root scripts running both dev
servers concurrently. Each service also has its own `Dockerfile`; `compose.yaml` wires all
three together for local dev, auto-seeding Postgres via `docker-entrypoint-initdb.d`.

## Dataflow

```mermaid
flowchart LR
    subgraph Client["client — React + MUI (Vite, :5173)"]
        Landing[Landing.jsx]
        Tile[RecipeTile.jsx]
        Contribute[Contribute.jsx]
    end

    Landing -- "GET /api/recipes" --> API["server — Express (:5000)"]
    Tile -- "GET /api/recipes\n(fetches independently)" --> API
    Contribute -- "POST /api/recipes" --> API

    API -- "tagged-template SQL\n(postgres/porsager)" --> DB[(PostgreSQL:\nrecipes / ingredients / instructions)]
```

**Read path:** client fetches `GET /api/recipes` (list, with `ingredients`/`instructions`
nested via correlated `json_agg` subqueries) or `GET /api/recipes/:recipe_id` (single recipe,
same shape). The list route takes optional `style`, `contributor` and `sort` params, which the
landing page drives from a filter bar above the grid; there is no pagination.

**Write path:** `Contribute.jsx` builds a recipe object client-side (growable arrays of
ingredient/instruction text fields) and `ContributePage.jsx` POSTs it to `/api/recipes`. The
server inserts the `recipes` row first to get an id, then loops individual `INSERT`s into
`ingredients` and `instructions`, the whole sequence wrapped in `sql.begin(...)` so a failure
part-way through rolls back instead of orphaning a `recipes` row. `PATCH` and `DELETE` on
`/api/recipes/:recipe_id` are transactional for the same reason — see
[api-routes.md](./api-routes.md).

**Production serving:** the Express server also serves `client/dist` as static files
post-build, so in a deployed setting `client` and `server` can be the same origin — CORS is
currently locked to `localhost:5173` / `127.0.0.1:5173` for local dev only.

## Deployment model and threat model

**Today:** two users on a private home network, reachable only from that LAN (a hidden SSID),
never exposed to the public internet.

**Where it's headed:** self-hosted in a homelab and opened to a small group of coworkers over
the LAN or a VPN. Not a public platform, and not built to go past that.

That ceiling is why several choices here look under-engineered on purpose: local disk instead
of object storage for images, a reverse proxy instead of a hosted identity provider, no CDN,
no rate limiting, no pagination. Read those as deliberate, not as gaps waiting to be filled.

The one that isn't optional is auth. While the only two people who can reach the app are
trusted, unauthenticated write routes are an accident risk at worst. The moment anyone else
gets access, `PATCH`/`DELETE` being open to any caller becomes a real hole — so #5 lands
before other people do, not after.

Nothing currently deploys it: CI pushes images to Docker Hub and no host pulls them.

## No auth (yet)

There is no `users` table and no login flow. Every visitor can view and submit recipes;
contributor name is a free-text field, not an identity.

`client/utils/contributor.js` holds a name in `localStorage` so `/my-recipes` has something to
filter on. That is attribution, not authentication — nothing verifies it, and the API has no
ownership checks either way. Real identity is planned via reverse-proxy forward auth
(see [roadmap.md](./roadmap.md)); until then, don't assume any request is authenticated or
attribute-checked server-side.

## Shared recipe form

`hooks/useRecipeForm.js` owns the field state, the growable ingredient/step arrays, and the
staged-photo lifecycle; `components/RecipeForm.jsx` renders the fields. Both the Contribute
page and the edit view inside the recipe modal (`components/RecipeEditor.jsx`) use them, so
there is one definition of what a recipe form is.

Two details worth knowing before changing it:

- Reads return `ingredients`/`instructions` as row objects while the form edits plain strings.
  `recipeToFormValues` converts either shape, which is what lets the same hook back both
  create and edit.
- `previewRecipe` drops blank rows and trims, and `buildSubmission` returns that same object
  with the staged photo uploaded and swapped in. What the preview modal shows is what gets
  written — that invariant is the reason they're derived from one place.

## Frontend: one implementation per route

The "pages vs components" duplication left over from an earlier refactor has been removed.
`pages/HomePage.jsx` went first; `pages/RecipesPage.jsx` + `components/Recipes.jsx` — a bare
`<select>` of recipe names, wired to `/recipes` and unlinked from the navbar since #17 —
followed once the landing grid gained filtering (#10), which is what that page had been for.
The `/recipes` route is gone with them.

Recipe browsing and detail now live in one place: `components/Landing.jsx` fetches
`/api/recipes` with the filter params and renders `components/RecipeTile.jsx`'s grid + modal,
with `components/RecipeFilters.jsx` above it. `/my-recipes` reuses the same `RecipeTile` with
`showOwnerActions` set. Build new browsing UI on that pattern. See
[data-model.md](./data-model.md) for the schema these components consume and
[api-routes.md](./api-routes.md) for the endpoints they call.

## CI/CD

`.github/workflows/cicd.yml` runs on push/PR to `main`:

1. **lint** — ESLint + Prettier for both `client` and `server` workspaces.
2. **docker** (needs `lint` to pass) — builds and pushes `client`/`server` images to Docker
   Hub as `cloudcitycreations-client` / `cloudcitycreations-server:latest`.

There is no test suite configured in either workspace, and no deploy step past the image push
— nothing currently pulls `:latest` onto a running host.

## Open questions / decide-later

- Whether the containerised `server` service is exercised at all. `compose.yaml` now sets
  `POSTGRES_HOST`/`DATABASE_URL` explicitly for it, but day-to-day work runs only the `db`
  service in Docker with the client and server on the host, so the full-stack path is the
  least-tested one.
- Whether `contributor` should stay free text once #5 lands, or collapse into the
  authenticated username. `docs/data-model.md` assumes it stays as a display name.
