# C3 Creations Roadmap

Rough order, not strict — pulled from the README's "Future Features" section plus tech debt
surfaced while documenting the current architecture. Treat each bullet as a candidate
Epic/issue, not a commitment.

- **Auth & user accounts (Supabase Auth)**
  Full login flow, users manage their own recipes, admin-level permissions for elevated
  management. This is the prerequisite for edit/delete and for making `contributor` a real
  identity instead of free text — see [data-model.md](./data-model.md).

- **Image upload (Supabase Storage)**
  Direct image uploads instead of relying on external `image_url` links, with automatic
  optimization and previewing. Replaces the current "paste a URL, fall back to a placeholder
  image if it 404s" behavior in `RecipeTile.jsx`.

- **Edit & delete recipes** — _delete UI landed, edit UI and ownership pending._
  `DELETE /api/recipes/:recipe_id` is wired up from the recipe grid: a delete icon on each
  tile opens a confirmation modal naming the recipe, and confirming removes the tile without
  a refetch. Still open: no edit UI, and neither route checks who is asking — any visitor can
  delete any recipe until Supabase Auth lands.

- **Submission preview modal**
  Before final submission on the Contribute page, show a preview (name, style, contributor,
  ingredients, instructions, image) so users can check formatting before it hits the database.

- **Favorites / upvotes + sorting & filtering**
  Upvote recipes, sort by most-liked, filter/sort by style, contributor, or submission date.
  Depends on auth for favorites; sorting/filtering by `style` would want an index — see
  [data-model.md](./data-model.md#indexes-to-add-ifwhen-this-needs-to-scale).

## Tech debt (not in the README, found while documenting the code)

- **Consolidate the duplicate `/` and `/recipes` implementations.** `pages/HomePage.jsx` is
  dead code (unrouted); `components/Recipes.jsx` (bare `<select>`) is far less developed than
  `RecipeTile.jsx`'s grid+modal pattern used on the landing page. See
  [architecture.md](./architecture.md#known-duplication-two-implementations-per-route).
- **Wrap `POST /api/recipes`'s multi-table insert in a transaction.** Currently three
  sequential inserts with no `sql.begin(...)` — a mid-loop failure leaves an orphaned
  `recipes` row with partial or no children. Low-stakes today, more visible once recipes have
  real owners. See [api-routes.md](./api-routes.md#post-apirecipes-detail).
- **No test suite in either workspace.** CI currently only runs ESLint + Prettier
  (`.github/workflows/cicd.yml`) — no test job exists to add to.

## Explicitly out of scope for now

- Multi-tenant / multi-org support — this is a single-team internal tool.
- Recipe versioning or edit history.
- Any deploy automation past the Docker Hub image push — nothing currently pulls `:latest`
  onto a running host.
