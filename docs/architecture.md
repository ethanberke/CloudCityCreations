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

| Service   | Stack                                 | Responsibility                                                                 |
| --------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `client`  | React + Vite, Material UI             | Browse recipes (grid + modal), submit new recipes                              |
| `server`  | Node + Express, `postgres` (porsager) | Single-file REST API over three tables, serves `client/dist` in prod           |
| `db`      | PostgreSQL 15                         | `recipes` / `ingredients` / `instructions`, seeded from `server/migration.sql` |
| `scraper` | Python 3.12, FastAPI, recipe-scrapers | Reads a public recipe URL and returns Contribute-form fields (#33)             |

This is an npm workspaces monorepo (`server`, `client`) with root scripts running both dev
servers concurrently. `scraper/` is deliberately outside the npm workspaces — it is a Python
service with its own `requirements.txt`, ruff config and pytest suite. Each service has its
own `Dockerfile`; `compose.yaml` wires all four together for local dev, auto-seeding Postgres
via `docker-entrypoint-initdb.d`.

## Dataflow

```mermaid
flowchart LR
    subgraph Client["client — React + MUI (Vite, :5173)"]
        Landing[Landing.jsx]
        Tile[RecipeTile.jsx]
        Contribute[Contribute.jsx]
        Import[RecipeImport.jsx]
    end

    Landing -- "GET /api/recipes" --> API["server — Express (:5000)"]
    Tile -- "GET /api/recipes\n(fetches independently)" --> API
    Contribute -- "POST /api/recipes" --> API
    Import -- "POST /api/scrape" --> API

    API -- "tagged-template SQL\n(postgres/porsager)" --> DB[(PostgreSQL:\nrecipes / ingredients / instructions)]
    API -- "POST /scrape" --> Scraper["scraper — FastAPI (:8001)"]
    Scraper -- "GET (public internet)" --> Site[("recipe site")]
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

## Recipe import (#33)

Pasting a recipe URL on `/contribute` fills the form in. That is all it does: the import is
a prefill, so a page the parser reads badly costs an edit rather than a bad row, and the
preview modal is still the only thing that writes a recipe.

```text
RecipeImport.jsx  --POST /api/scrape-->  Express  --POST /scrape-->  scraper (FastAPI)
                                                                          |
                                                       fetch + parse the recipe page
       form fields  <-------------------------------------------------------
   (contributor kept, everything else replaced and editable)

on preview confirm:  POST /api/uploads/from-url  →  photo copied to UPLOAD_DIR
                     POST /api/recipes           →  the recipe is written
```

**Why a separate Python service.** The maintained recipe parsers live in Python
(`recipe-scrapers` carries per-site parsers for hundreds of food sites, plus a schema.org
reader), and that dependency tree has no business in the Express image. `scraper/` therefore
has no database access and writes nothing: it takes a URL and returns JSON. Express owns
`/api/scrape` and calls it server-to-server, which keeps the browser on one origin, one CORS
config and one port to protect when forward auth lands (#5) — the scraper's published port is
bound to `127.0.0.1` so only the host reaches it.

**Two passes over a page.** `recipe-scrapers` first (with `supported_only=False`, so
unsupported hosts still get its schema.org reader), then a JSON-LD reader of our own for when
that raises. Both feed the same normalisation, because what comes back is other people's
HTML: entity-escaped, tag-riddled, and shaped four different ways for `recipeInstructions`
alone. `scraper/test_extract.py` covers those shapes; it is the only test suite in the repo.

`style` takes the site's `recipeCategory` and falls back to `recipeCuisine`, keeping one
value — it drives the landing page's filter dropdown, where a recipe is one option, not two.

**Photos** are copied onto local disk (`POST /api/uploads/from-url`) rather than hotlinked,
so a saved recipe survives the source site moving the file or blocking hotlinks. The copy
happens when the preview is confirmed, not at import, so an abandoned import leaves no
orphaned file — the same invariant `buildSubmission` already held for staged uploads. Unlike
a browser upload, these bytes are not re-encoded, so a site's photo keeps whatever metadata it
was published with.

## Deployment model and threat model

**Today:** two users on a private home network, reachable only from that LAN (a hidden SSID),
never exposed to the public internet.

**Where it's headed:** self-hosted in a homelab and opened to a small group of coworkers over
the LAN or a VPN. Not a public platform, and not built to go past that.

That ceiling is why several choices here look under-engineered on purpose: local disk instead
of object storage for images, a reverse proxy instead of a hosted identity provider, no CDN,
no rate limiting, no pagination. Read those as deliberate, not as gaps waiting to be filled.

**The one thing that does reach the internet is recipe import (#33).** Everything else in the
app is inbound-only from the LAN; importing a recipe makes the homelab fetch a URL that a
person pasted, which is server-side request forgery unless it is guarded. Both fetching
paths — the Python importer (`scraper/fetching.py`) and the Node image copier
(`server/lib/remoteImage.js`) — allow only http/https, resolve the host and refuse any
non-public address (loopback, RFC1918, CGNAT, link-local including `169.254.169.254`,
multicast, reserved) for IPv4 and IPv6, re-check every redirect hop instead of letting the
HTTP client follow them, and read the body against a byte cap and a timeout. The residual
window is DNS rebinding between the check and the connection, which is accepted here: the
importer holds no credentials and can reach nothing this box couldn't already reach.

Note that `image_url` has always taken external links, and viewers' browsers have always
loaded them — a page's photo needs internet on the viewer's side, never on the server's.
What #33 added is the _server_ making outbound requests.

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

1. **lint** — ESLint + Prettier for both `client` and `server` workspaces, then ruff
   (lint + format check) and pytest for `scraper`.
2. **docker** (needs `lint` to pass) — builds and pushes `client`/`server`/`scraper` images to
   Docker Hub as `cloudcitycreations-client` / `-server` / `-scraper:latest`.

Neither JS workspace has a test suite; `scraper/test_extract.py` is the only one in the repo,
and it runs inside the `lint` job rather than behind a test job that would exist for one
service. There is no deploy step past the image push — nothing currently pulls `:latest` onto
a running host.

## Open questions / decide-later

- Whether the containerised `server` service is exercised at all. `compose.yaml` now sets
  `POSTGRES_HOST`/`DATABASE_URL` explicitly for it, but day-to-day work runs only the `db`
  service in Docker with the client and server on the host, so the full-stack path is the
  least-tested one.
- Whether `contributor` should stay free text once #5 lands, or collapse into the
  authenticated username. `docs/data-model.md` assumes it stays as a display name.
