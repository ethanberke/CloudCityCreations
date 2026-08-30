import { postJson } from "./api";

// Reads a public recipe page and returns the same shape the form edits, so the
// result can go straight into it. Nothing is saved by this call: the import
// fills the fields, the contributor corrects whatever the page got wrong, and
// the existing preview modal is still what commits the recipe.
export async function importRecipeFromUrl(url) {
  const recipe = await postJson("/scrape", { url });

  return {
    recipe_name: recipe.recipe_name ?? "",
    style: recipe.style ?? "",
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    image_url: recipe.image_url ?? "",
    source_url: recipe.source_url ?? url,
  };
}
