import { useEffect, useState } from "react";
import { prepareImage, uploadImage } from "../utils/image";

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
    const image_url = imageBlob
      ? await uploadImage(imageBlob)
      : values.image_url.trim();

    return { ...previewRecipe, image_url };
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
    previewRecipe,
    buildSubmission,
  };
}
