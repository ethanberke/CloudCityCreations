# C3 Creations Data Model (PostgreSQL)

Single database (`recipes`), three tables, one-to-many from `recipes`. Written and read
exclusively by the `server` Express app — no ORM, plain `postgres` (porsager) tagged-template
SQL. Schema and seed data both live in `server/migration.sql`, which is destructive
(`DROP TABLE IF EXISTS`) and re-seeds fixed sample recipes on every run.

## `recipes`

The general-info row for one recipe. `image_url` is a free-text external URL, not an upload —
the client falls back to a local placeholder image (`/images/grogu_peak.jpg`) when it's empty
or fails to load.

```sql
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  contributor TEXT NOT NULL,   -- free text, not a user/auth reference
  recipe_name TEXT NOT NULL,
  style TEXT NOT NULL,         -- free text, e.g. "Main Dish", "Side", "Thai" — not an enum
  image_url TEXT
);
```

## `ingredients`

One row per ingredient line, in whatever order they were inserted (no explicit ordering
column — the UI doesn't need one since ingredients are unordered).

```sql
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL,
  ingredient TEXT NOT NULL,    -- unstructured, e.g. "1.5 cups warm water" — no qty/unit split
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);
```

## `instructions`

One row per step. Unlike `ingredients`, order matters, so `step_order` is explicit and driven
by array index at insert time (`server.js` loops `instructions[i]` as `step_order: i + 1`).

```sql
CREATE TABLE instructions (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL,
  step_order INT NOT NULL,
  step TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);
```

### Why three tables instead of JSON columns on `recipes`?

Ingredients and instructions are both open-ended, user-growable lists (the Contribute form
lets a user add as many of each as they want) — a normalized child table maps directly onto
that "add another row" UI, and lets `GET /api/recipes` aggregate them back into nested JSON
per recipe with a `json_agg` subquery rather than storing/parsing JSON by hand.

### No cascade delete, no unique constraints

Neither FK has `ON DELETE CASCADE`, and there's no `users` table to attach `contributor` to —
recipes have no owner. `DELETE /api/recipes/:recipe_id` therefore removes the
`ingredients`/`instructions` rows explicitly before the `recipes` row, all inside one
`sql.begin(...)` transaction; `PATCH` does the same to replace a recipe's children. Adding the
cascade later would let both drop those explicit deletes, but nothing depends on that today.

Recipes still have no owner, so neither route can check *who* is deleting — that's blocked on
auth (#5, see [roadmap.md](./roadmap.md)). Whatever lands there will add an owner column;
`contributor` stays as the display name.

### Nested read shape

Both `GET /api/recipes` and `GET /api/recipes/:recipe_id` (see
[api-routes.md](./api-routes.md)) return the same nested shape via correlated subqueries:

```jsonc
{
  "recipe_id": 1,
  "contributor": "McKade C.",
  "recipe_name": "Amish Soft Pretzels",
  "style": "Side",
  "image_url": "https://...",
  "ingredients": [
    { "ingredient_id": 1, "ingredient": "1.5 cups warm water" }
    // ...
  ],
  "instructions": [
    { "instruction_id": 1, "step_order": 1, "step": "In a mixing bowl..." }
    // ... ORDER BY step_order
  ]
}
```

## Indexes to add if/when this needs to scale

Currently unindexed beyond the primary keys — fine at potluck scale (a handful of recipes per
event), but worth adding once `style`/contributor filtering (see
[roadmap.md](./roadmap.md)) lands:

- `ingredients.recipe_id`, `instructions.recipe_id` — every read already filters on these via
  the correlated subqueries.
- `recipes.style` — once sorting/filtering by style is built.
