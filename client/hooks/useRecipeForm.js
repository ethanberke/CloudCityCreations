import { useEffect, useState } from "react";
import { prepareImage, storeImageFromUrl, uploadImage } from "../utils/image";

const BLANK = {
  contributor: "",
  recipe_name: "",
  style: "",
  image_url: "",
  ingredients: [""],
  instructions: [],
};

// Reads come back with ingredients/instructions as row objects; the form edits
// plain strings. Accepts either so the same hook backs both create and edit.
export function recipeToFormValues(recipe) {
  if (!recipe) return { ...BLANK };

  return {
    contributor: recipe.contributor ?? "",
    recipe_name: recipe.recipe_name ?? "",
    style: recipe.style ?? "",
    image_url: recipe.image_url ?? "",
    ingredients: (recipe.ingredients ?? []).map((item) =>
      typeof item === "string" ? item : item.ingredient,
    ),
    instructions: (recipe.instructions ?? []).map((item) =>
      typeof item === "string" ? item : item.step,
    ),
  };
}

export function useRecipeForm(initialRecipe) {
  const [values, setValues] = useState(() => recipeToFormValues(initialRecipe));
  const [imageBlob, setImageBlob] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  // The photo URL an import brought in, remembered so buildSubmission can tell
  // it apart from a link someone pasted by hand: only the imported one gets
  // copied onto our disk. Editing the field clears the match, and the link is
  // then treated as pasted.
  const [importedImageUrl, setImportedImageUrl] = useState("");

  useEffect(() => {
    if (!imagePreview) return undefined;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const setField = (name, value) =>
    setValues((current) => ({ ...current, [name]: value }));

  const setListItem = (name, index, value) =>
    setValues((current) => {
      const next = [...current[name]];
      next[index] = value;
      return { ...current, [name]: next };
    });

  const addListItem = (name) =>
    setValues((current) => ({ ...current, [name]: [...current[name], ""] }));

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file twice still fires a change event.
    e.target.value = "";
    if (!file) return;

    setImageError(null);
    setProcessingImage(true);

    try {
      const blob = await prepareImage(file);
      setImageBlob(blob);
      setImagePreview(URL.createObjectURL(blob));
      setField("image_url", "");
    } catch (err) {
      console.error(err);
      setImageBlob(null);
      setImagePreview(null);
      setImageError(err.message);
    } finally {
      setProcessingImage(false);
    }
  };

  const removeImage = () => {
    setImageBlob(null);
    setImagePreview(null);
    setImageError(null);
  };

  // Fills the form from an imported page. The contributor is deliberately kept:
  // whoever is filling this in is the contributor, not the site's author. An
  // import replaces the recipe fields wholesale, which is what makes a second
  // import after a bad first one leave nothing behind.
  const applyImportedRecipe = (recipe) => {
    setValues((current) => ({
      ...recipeToFormValues(recipe),
      contributor: current.contributor,
      // The form needs a row to type into; a page that gave us no ingredients
      // should still leave an empty field rather than nothing at all.
      ingredients: recipe.ingredients?.length ? recipe.ingredients : [""],
    }));

    // A staged photo would otherwise win over the imported one in buildSubmission.
    setImageBlob(null);
    setImagePreview(null);
    setImageError(null);
    setImportedImageUrl(recipe.image_url ?? "");
  };

  // Blank ingredient and step rows are dropped here rather than only being
  // hidden, so what the preview shows is what gets written.
  const previewRecipe = {
    contributor: values.contributor.trim(),
    recipe_name: values.recipe_name.trim(),
    style: values.style.trim(),
    ingredients: values.ingredients.map((item) => item.trim()).filter(Boolean),
    instructions: values.instructions
      .map((item) => item.trim())
      .filter(Boolean),
    // A staged photo previews from a blob URL that only exists in this tab.
    // buildSubmission swaps it for the stored path.
    image_url: imagePreview ?? values.image_url.trim(),
  };

  // Uploads the staged photo, if there is one, and returns the request body.
  // Kept separate from previewRecipe so nothing is written to disk until the
  // user confirms.
  const buildSubmission = async () => {
    if (imageBlob) {
      return { ...previewRecipe, image_url: await uploadImage(imageBlob) };
    }

    const pasted = values.image_url.trim();

    // An imported photo is copied to local disk here rather than at import
    // time, so abandoning a preview writes no file. If the copy fails the
    // original link still renders in a browser, so it is kept rather than
    // dropping the photo over a fetch we could not make.
    if (pasted && pasted === importedImageUrl) {
      try {
        return { ...previewRecipe, image_url: await storeImageFromUrl(pasted) };
      } catch (err) {
        console.error("Could not copy the imported photo:", err);
      }
    }

    return { ...previewRecipe, image_url: pasted };
  };

  return {
    values,
    setField,
    setListItem,
    addListItem,
    imagePreview,
    imageError,
    processingImage,
    handleFileChange,
    removeImage,
    applyImportedRecipe,
    previewRecipe,
    buildSubmission,
  };
}
