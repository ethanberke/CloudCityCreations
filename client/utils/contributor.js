const STORAGE_KEY = "c3.contributor";

// Stand-in identity until Supabase Auth (#5) lands. This is a per-device
// convenience, not a login — nothing here is verified, and the API has no
// ownership checks either way. Every access is wrapped because localStorage is
// absent outside the browser and throws outright in some privacy modes.

export function getContributorName() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setContributorName(name) {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // A name we can't remember isn't worth failing a recipe submit over.
  }
}

// `contributor` is free text, so matching forgives casing and stray
// whitespace. It still can't tell two contributors with the same name apart.
export function filterByContributor(recipes, name) {
  const key = name.trim().toLowerCase();
  if (!key) return [];
  return recipes.filter(
    (recipe) => (recipe.contributor ?? "").trim().toLowerCase() === key,
  );
}
