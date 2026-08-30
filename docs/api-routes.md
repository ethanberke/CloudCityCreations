# C3 Creations API Routes

One service, one file (`server/server.js`) — no router modules, no ORM, no auth middleware.
All routes are mounted directly on the Express app and use `postgres` (porsager) tagged-
template SQL. See [data-model.md](./data-model.md) for the underlying schema and
[architecture.md](./architecture.md) for how these are called from the client.

## `server` (Express) — base path `/api`

| Method | Route                     | Purpose                                                                                                                              |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/recipes`            | Recipes, each with `ingredients`/`instructions` nested via `json_agg` subqueries. Optional `style`/`contributor`/`sort` query params |
| GET    | `/api/recipes/:recipe_id` | Same shape as above, single recipe. `404` if the id doesn't exist                                                                    |
| POST   | `/api/recipes`            | Creates a recipe: `{ contributor, recipe_name, style, image_url, ingredients[], instructions[] }`                                    |
| PATCH  | `/api/recipes/:recipe_id` | Replaces a recipe and all of its children. `404` if the id doesn't exist                                                             |
| DELETE | `/api/recipes/:recipe_id` | Deletes a recipe and its `ingredients`/`instructions`. `404` if the id doesn't exist                                                 |
| POST   | `/api/uploads`            | Stores one recipe photo, returns `{ url }` to put in `image_url`                                                                     |
| POST   | `/api/uploads/from-url`   | Copies a photo from a remote URL onto local disk, returns `{ url }` in the same shape                                                |
| GET    | `/api/uploads/:filename`  | Serves a stored photo (static)                                                                                                       |
| POST   | `/api/scrape`             | Reads a public recipe URL and returns Contribute-form fields (#33). Proxies the `scraper` service                                    |

### `GET /api/recipes` filtering and sorting

Three optional query params, all safe to omit:

| Param         | Values                                              | Behaviour                                             |
| ------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `style`       | any style in use, e.g. `Main Dish`                  | Case-insensitive exact match on `recipes.style`       |
| `contributor` | any contributor in use, e.g. `Mitchell`             | Case-insensitive exact match on `recipes.contributor` |
| `sort`        | `newest` (default), `oldest`, `name`, `contributor` | Order of the returned array                           |

Both filters are exact matches, not substring searches — the client's dropdowns are built
from values already in the data, so there is nothing to search for. The match is
case-insensitive because both columns are free text typed by hand, and the indexes in
`migration.sql` are on the same `lower()` expressions the query uses.

Supplying an unrecognised `sort` responds `400` with the list of accepted values rather than
silently falling back, so a typo in a bookmarked URL is visible instead of returning
plausible-looking rows in the wrong order. Empty params (`?style=`) count as absent, as does a
repeated param (`?style=a&style=b`), which Express hands over as an array.

Every sort ends in a unique tiebreaker (`r.id`). Without one, rows with equal sort keys come
back in whatever order the heap holds them, which an unrelated `PATCH` can quietly change.
There was no `ORDER BY` at all before this route took params, so the grid order was already
undefined; `newest` is now the default.

Filtering is done in SQL rather than in the client so the response stays the source of truth
as the collection grows. `/my-recipes` still filters client-side by contributor
(`client/utils/contributor.js`) because it is matching a `localStorage` name, not a chosen
facet.

### `POST /api/recipes` detail

Inserts the `recipes` row first (`RETURNING id`), then loops individual `INSERT`s into
`ingredients` (one per array entry) and `instructions` (one per array entry, `step_order` set
from array index + 1). The whole sequence is wrapped in `sql.begin(...)`, so a mid-loop
failure rolls the `recipes` row back rather than orphaning it. Responds
`{ message: "Recipe created", recipe_id }` on success, `500` with
`{ error: "Internal server error" }` on failure.

### `PATCH /api/recipes/:recipe_id` detail

Replace, not merge: inside `sql.begin(...)` it `UPDATE`s the `recipes` row, then deletes and
re-inserts every `ingredients`/`instructions` row from the request body, so `step_order` is
renumbered from the new array order rather than preserved.

Every field is required. `postgres` rejects `undefined` bindings, so a body missing any of
`contributor`/`recipe_name`/`style`/`image_url` responds `500`, not a partial update — the
transaction rolls back and the recipe is left untouched. Responds `404` if the id doesn't
exist, otherwise `{ message: "Recipe updated", recipe_id }`.

### `DELETE /api/recipes/:recipe_id` detail

Inside `sql.begin(...)`, deletes the recipe's `ingredients` and `instructions` rows first,
then the `recipes` row (`RETURNING id`) — the schema has no `ON DELETE CASCADE`, so the
children are removed explicitly (see
[data-model.md](./data-model.md#no-cascade-delete-no-unique-constraints)). An empty
`RETURNING` means nothing matched, which responds `404`; success responds
`{ message: "Recipe deleted", recipe_id }`.

### `POST /api/uploads` detail

Multipart, field name `image`, one file, 5 MB cap. Held in memory so the bytes can be checked
before anything reaches disk. Responds `201 { url: "/api/uploads/<uuid>.<ext>" }`, and the
client puts that string in `image_url` — the same column a pasted link uses, so there is no
schema change and no second code path for reads.

Two things are deliberately not trusted:

- **The supplied filename is discarded.** Files are stored as `crypto.randomUUID()` plus an
  extension the server chose. A name we generated can't traverse out of the upload directory,
  which removes the bug class rather than filtering for it.
- **The declared MIME type is ignored.** The format comes from sniffing magic bytes (JPEG,
  PNG, WebP). HTML uploaded as `.jpg` and served back from our own origin would be stored
  XSS; `415` is returned instead. Responses also carry `X-Content-Type-Options: nosniff`.

Failure modes: `400` no file or malformed upload, `413` over the size cap, `415` not a
recognised image, `500` write failure.

Uploads live in `UPLOAD_DIR` (default `server/uploads`, gitignored). `DELETE` unlinks a
recipe's photo, and `PATCH` unlinks the previous one when the image changes — both best-effort
and only after the transaction commits, since an unlink can't be rolled back. Pasted external
URLs are never touched.

**This route is unauthenticated like every other write route**, so anyone who can reach the
server can fill the disk. Acceptable on a private LAN (see
[architecture.md](./architecture.md#deployment-model-and-threat-model)); it needs the proxy's
user header as soon as #5 lands.

### `POST /api/scrape` detail

Body `{ url }`. Responds with the fields the Contribute form edits, so the client can put
them straight into it:

```json
{
  "recipe_name": "Easy classic lasagne",
  "style": "Dinner",
  "ingredients": ["1 tbsp olive oil", "..."],
  "instructions": ["Heat the oil in a large saucepan...", "..."],
  "image_url": "https://images.immediate.co.uk/.../classic-lasagne.jpg",
  "source_url": "https://www.bbcgoodfood.com/recipes/classic-lasagne",
  "parser": "recipe-scrapers"
}
```

Express does no parsing: it forwards the URL to the `scraper` service (see
[architecture.md](./architecture.md#recipe-import-33)) and passes the answer back. Nothing
is written — an import prefills a form, and the recipe is only created when the contributor
confirms the preview and the usual `POST /api/recipes` runs.

`contributor` is absent from the response on purpose. Whoever is filling in the form is the
contributor; the site's author is not.

Failure modes, with the importer's wording passed through because it describes the link
someone pasted rather than an internal fault: `400` not a public http(s) URL, `422` the page
has no recipe we can read, `502` the site refused or failed, `504` it timed out, `503` the
importer service isn't running.

### `POST /api/uploads/from-url` detail

Body `{ url }`, responds `201 { url: "/api/uploads/<uuid>.<ext>" }` — the same shape as the
multipart upload route, so the client stores the result in `image_url` the same way.

Used for the photo on an imported recipe page, so a saved recipe keeps its picture when the
source moves it or starts refusing hotlinks. The client calls it when the preview is
confirmed rather than at import time, so an abandoned import writes no file.

The bytes go through the same checks as an upload: format decided by sniffing magic bytes
(`415` otherwise), filename generated server-side, 5 MB cap. On top of that, this route makes
an outbound request to a URL that came off someone else's page, so before opening a socket it
resolves the host and refuses any non-public address, and re-checks each redirect hop rather
than letting `fetch` follow them (`server/lib/remoteImage.js`).

Failure modes: `400` no URL, non-http(s), or a host resolving to a private address, `413`
over the size cap, `415` not a JPEG/PNG/WebP, `502` unreachable or an error status, `504`
timeout.

## `scraper` (FastAPI) — internal, not browser-facing

| Method | Route     | Purpose                                                      |
| ------ | --------- | ------------------------------------------------------------ |
| POST   | `/scrape` | `{ url }` → the recipe fields above, or a `{ detail }` error |
| GET    | `/health` | `{ "status": "ok" }` — liveness for compose                  |

Only Express calls this. It has no CORS middleware for that reason: if a page in a browser
can reach it, something is misconfigured. In compose it is reachable as `scraper:8001`, and
its published port is bound to `127.0.0.1` so a server running on the host can use it without
putting it on the LAN.

Its errors use FastAPI's `{ "detail": "..." }`, which `/api/scrape` re-wraps as
`{ "error": "..." }`.

## Static file serving

`server.js` also does `app.use(express.static("../client/dist"))` — after `npm run build`,
the Express server can serve the built client directly, so `client` and `server` can share an
origin in a deployed setting. In local dev (`npm run dev` at the root), `client` and `server`
run as separate processes on `5173`/`5000` and CORS is opened only for
`localhost:5173` / `127.0.0.1:5173`.

## Notes

- No auth on any route — every request is treated as trusted. `contributor` is a free-text
  field the client sends, not a verified identity. This is scoped to change once forward auth
  lands (#5, see [roadmap.md](./roadmap.md)); the app is meanwhile expected to be reachable
  only from a private LAN (see
  [architecture.md](./architecture.md#deployment-model-and-threat-model)).
- `PATCH`/`DELETE` exist but are unauthenticated and unowned — any caller can edit or delete
  any recipe. Ownership checks are blocked on auth (#7, see [roadmap.md](./roadmap.md)). The
  delete button was moved off the public landing grid onto `/my-recipes`, which removes the
  accident, not the hole.
- `/api/scrape` and `/api/uploads/from-url` are the only routes that make outbound requests,
  and both are unauthenticated like everything else — anyone who can reach the server can
  make it fetch a public URL. The SSRF guards are what keep that from being a way to reach
  the homelab's own services (#33).
- No pagination — `GET /api/recipes` returns every matching row. Filtering and sorting
  landed in #10; a `limit`/`offset` would only matter well past potluck scale.
- Response shapes aren't versioned or validated against a schema (no Zod/Joi/etc.) — the
  client and server shapes are kept in sync by hand.
