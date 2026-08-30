# C3 Creations API Routes

One service, one file (`server/server.js`) — no router modules, no ORM, no auth middleware.
All routes are mounted directly on the Express app and use `postgres` (porsager) tagged-
template SQL. See [data-model.md](./data-model.md) for the underlying schema and
[architecture.md](./architecture.md) for how these are called from the client.

## `server` (Express) — base path `/api`

| Method | Route                     | Purpose                                                                                           |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/recipes`            | All recipes, each with `ingredients`/`instructions` nested via `json_agg` subqueries              |
| GET    | `/api/recipes/:recipe_id` | Same shape as above, single recipe. `404` if the id doesn't exist                                 |
| POST   | `/api/recipes`            | Creates a recipe: `{ contributor, recipe_name, style, image_url, ingredients[], instructions[] }` |
| PATCH  | `/api/recipes/:recipe_id` | Replaces a recipe and all of its children. `404` if the id doesn't exist                          |
| DELETE | `/api/recipes/:recipe_id` | Deletes a recipe and its `ingredients`/`instructions`. `404` if the id doesn't exist              |
| POST   | `/api/uploads`            | Stores one recipe photo, returns `{ url }` to put in `image_url`                                  |
| GET    | `/api/uploads/:filename`  | Serves a stored photo (static)                                                                    |

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
- No query params for filtering/sorting/pagination — `GET /api/recipes` always returns
  everything.
- Response shapes aren't versioned or validated against a schema (no Zod/Joi/etc.) — the
  client and server shapes are kept in sync by hand.
