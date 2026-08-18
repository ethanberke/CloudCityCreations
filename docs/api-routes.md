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

### `POST /api/recipes` detail

Inserts the `recipes` row first (`RETURNING id`), then loops individual `INSERT`s into
`ingredients` (one per array entry) and `instructions` (one per array entry, `step_order` set
from array index + 1). **Not wrapped in a SQL transaction** — see
[architecture.md](./architecture.md#write-path) for why that matters if this ever needs
partial-insert consistency. Responds `{ message: "Recipe created", recipe_id }` on success,
`500` with `{ error: "Internal server error" }` on failure.

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
- No `PATCH`/`DELETE` routes yet — editing or removing a recipe isn't implemented.
- No query params for filtering/sorting/pagination — `GET /api/recipes` always returns
  everything.
- Response shapes aren't versioned or validated against a schema (no Zod/Joi/etc.) — the
  client and server shapes are kept in sync by hand.
