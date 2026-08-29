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

| Service  | Stack                                    | Responsibility                                            |
|----------|--------------------------------------------|--------------------------------------------------------------|
| `client` | React + Vite, Material UI                | Browse recipes (grid + modal), submit new recipes            |
| `server` | Node + Express, `postgres` (porsager)   | Single-file REST API over three tables, serves `client/dist` in prod |
| `db`     | PostgreSQL 15                            | `recipes` / `ingredients` / `instructions`, seeded from `server/migration.sql` |

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
same shape). No pagination, filtering, or sorting yet.

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

## No auth (yet)

There is no `users` table and no login flow. Every visitor can view and submit recipes;
contributor name is a free-text field, not an identity. Supabase Auth is the planned addition
(see [roadmap.md](./roadmap.md)) — until then, don't assume any request is authenticated or
attribute-checked server-side.

## Known duplication: two implementations per route

The frontend has two parallel "pages vs components" implementations left over from
in-progress refactoring — not an intentional pattern:

- `components/Landing.jsx` (MUI, fetches `/api/recipes`, renders `RecipeTile`) is wired to
  `/`. `pages/HomePage.jsx` (plain unstyled HTML) exists but is **not routed anywhere**.
- `pages/RecipesPage.jsx` + `components/Recipes.jsx` (a bare `<select>` of recipe names) is
  wired to `/recipes`, and is far less developed than `RecipeTile.jsx`'s grid+modal view used
  on the landing page.

When extending recipe browsing/detail UI, build on `RecipeTile.jsx`'s pattern (MUI
`Card`/`Grid`/`Modal`), not `Recipes.jsx`. See [data-model.md](./data-model.md) for the schema
these components consume and [api-routes.md](./api-routes.md) for the endpoints they call.

## CI/CD

`.github/workflows/cicd.yml` runs on push/PR to `main`:

1. **lint** — ESLint + Prettier for both `client` and `server` workspaces.
2. **docker** (needs `lint` to pass) — builds and pushes `client`/`server` images to Docker
   Hub as `cloudcitycreations-client` / `cloudcitycreations-server:latest`.

There is no test suite configured in either workspace, and no deploy step past the image push
— nothing currently pulls `:latest` onto a running host.

## Open questions / decide-later

- Whether to delete `pages/HomePage.jsx` and `components/Recipes.jsx` outright or migrate
  `/recipes` onto `RecipeTile.jsx`'s pattern — flag this rather than assuming either is
  intentional if asked to consolidate.
- Image storage strategy once Supabase Storage lands — current `image_url` is just a free-text
  external URL with a local fallback image in the UI.
