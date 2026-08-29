# C3 Creations API Routes

One service, one file (`server/server.js`) — no router modules, no ORM, no auth middleware.
All routes are mounted directly on the Express app and use `postgres` (porsager) tagged-
template SQL. See [data-model.md](./data-model.md) for the underlying schema and
[architecture.md](./architecture.md) for how these are called from the client.

## `server` (Express) — base path `/api`

| Method | Route                   | Purpose                                                                 |
|--------|--------------------------|----------------------------------------------------------------------------|
| GET    | `/api/recipes`          | All recipes, each with `ingredients`/`instructions` nested via `json_agg` subqueries |
| GET    | `/api/recipes/:recipe_id` | Same shape as above, single recipe. `404` if the id doesn't exist        |
| POST   | `/api/recipes`          | Creates a recipe: `{ contributor, recipe_name, style, image_url, ingredients[], instructions[] }` |
| PATCH  | `/api/recipes/:recipe_id` | Replaces a recipe and all of its children. `404` if the id doesn't exist |
| DELETE | `/api/recipes/:recipe_id` | Deletes a recipe and its `ingredients`/`instructions`. `404` if the id doesn't exist |

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

## Static file serving

`server.js` also does `app.use(express.static("../client/dist"))` — after `npm run build`,
the Express server can serve the built client directly, so `client` and `server` can share an
origin in a deployed setting. In local dev (`npm run dev` at the root), `client` and `server`
run as separate processes on `5173`/`5000` and CORS is opened only for
`localhost:5173` / `127.0.0.1:5173`.

## Notes

- No auth on any route — every request is treated as trusted. `contributor` is a free-text
  field the client sends, not a verified identity. This is scoped to change once Supabase Auth
  lands (see [roadmap.md](./roadmap.md)).
- `PATCH`/`DELETE` exist but are unauthenticated and unowned — any caller can edit or delete
  any recipe. Ownership checks are blocked on Supabase Auth (see [roadmap.md](./roadmap.md)).
- No query params for filtering/sorting/pagination — `GET /api/recipes` always returns
  everything.
- Response shapes aren't versioned or validated against a schema (no Zod/Joi/etc.) — the
  client and server shapes are kept in sync by hand.
