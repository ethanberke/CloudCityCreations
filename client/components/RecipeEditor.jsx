import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRecipeForm } from "../hooks/useRecipeForm";
import RecipeForm from "./RecipeForm";
import SubmissionPreviewModal from "./SubmissionPreviewModal";

// Mounted only while editing, so the form state is seeded from the recipe on
// open and thrown away on cancel — no reset plumbing needed.
export default function RecipeEditor({ recipe, onCancel, onSaved, onError }) {
  const form = useRecipeForm(recipe);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setPreviewOpen(true);
  };

  const handleConfirm = async () => {
    setSaving(true);

    try {
      const body = await form.buildSubmission();

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/recipes/${recipe.recipe_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) throw new Error(`Update failed with status ${res.status}`);

      // PATCH replaces the child rows, so ingredient/instruction ids and
      // step_order are all new. Re-read rather than guessing the shape.
      const refreshed = await fetch(
        `${import.meta.env.VITE_API_URL}/recipes/${recipe.recipe_id}`,
      );

      if (!refreshed.ok) {
        throw new Error(`Reload failed with status ${refreshed.status}`);
      }

      setPreviewOpen(false);
      onSaved(await refreshed.json(), body.recipe_name);
    } catch (err) {
      console.error(err);
      onError(form.previewRecipe.recipe_name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Typography variant="h5" component="h2" align="center" mb={1}>
        Edit recipe
      </Typography>

      <RecipeForm form={form} />

      <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          Save changes
        </Button>
      </Stack>

      <SubmissionPreviewModal
        open={previewOpen}
        recipe={form.previewRecipe}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleConfirm}
        submitting={saving}
        title="Review your changes"
        subtitle="Nothing is saved until you confirm."
        cancelLabel="Keep editing"
        confirmLabel="Confirm changes"
        submittingLabel="Saving…"
      />
    </Box>
  );
}
