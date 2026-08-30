# C3 Creations Roadmap

Rough order, not strict — pulled from the README's "Future Features" section plus tech debt
surfaced while documenting the current architecture. Treat each bullet as a candidate
Epic/issue, not a commitment.

- **Auth & user accounts (Supabase Auth)** (#5)
  Full login flow, users manage their own recipes, admin-level permissions for elevated
  management. This is the prerequisite for edit/delete and for making `contributor` a real
  identity instead of free text — see [data-model.md](./data-model.md).

- **Image upload (Supabase Storage)** (#6)
  Direct image uploads instead of relying on external `image_url` links, with automatic
  optimization and previewing. Replaces the current "paste a URL, fall back to a placeholder
  image if it 404s" behavior in `RecipeTile.jsx`.

- **Edit & delete recipes** — _delete UI landed, edit UI and ownership pending._
  `DELETE /api/recipes/:recipe_id` is wired up from the recipe grid: a delete icon on each
  tile opens a confirmation modal naming the recipe, and confirming removes the tile without
  a refetch. Still open: no client calls `PATCH` yet (#20), and neither route checks who is
  asking — any visitor can delete any recipe until Supabase Auth lands (#7).

- **"My Recipes" page** (#19) — _done._
  `/my-recipes` shows the tile grid filtered to your own contributions, and delete now lives
  there instead of on the public landing grid. Identity is a `localStorage` name the
  Contribute form remembers on submit — a per-device convenience, not a login, and not
  access control: the API still has no ownership checks (#7). Edit is #20.

- **Submission preview modal** — _done._
  Submitting the Contribute form opens `SubmissionPreviewModal.jsx` (name, style, contributor,
  ingredients, instructions, image) and only confirming from it POSTs to `/api/recipes`. The
  previewed object is the request body, so blank rows are dropped from both rather than only
  hidden from view.

- **Favorites / upvotes + sorting & filtering** (#9, #10)
  Upvote recipes, sort by most-liked, filter/sort by style, contributor, or submission date.
  Depends on auth for favorites; sorting/filtering by `style` would want an index — see
  [data-model.md](./data-model.md#indexes-to-add-ifwhen-this-needs-to-scale).

## Tech debt (not in the README, found while documenting the code)

- **Consolidate the duplicate `/` and `/recipes` implementations.** `pages/HomePage.jsx` is
  dead code (unrouted); `components/Recipes.jsx` (bare `<select>`) is far less developed than
  `RecipeTile.jsx`'s grid+modal pattern used on the landing page. See
  [architecture.md](./architecture.md#known-duplication-two-implementations-per-route).
- **`RecipeTile.jsx` does too much to be reused** (#18). It fetches `/api/recipes` itself
  while `Landing.jsx` fetches the same endpoint and passes a `recipes` prop the component
  ignores, and it hardcodes the delete flow onto every tile. Taking `recipes` as a prop and
  gating owner actions is the prerequisite for #19.
- **The navbar renders no navigation links** (#17). `pages`, `anchorElNav` and its handlers,
  and five imports are declared but unused, and the `settings` menu is rendered with nothing
  to anchor it, so it can never open.
- **No test suite in either workspace.** CI currently only runs ESLint + Prettier
  (`.github/workflows/cicd.yml`) — no test job exists to add to.

## Explicitly out of scope for now

- Multi-tenant / multi-org support — this is a single-team internal tool.
- Recipe versioning or edit history.
- Any deploy automation past the Docker Hub image push — nothing currently pulls `:latest`
  onto a running host.
