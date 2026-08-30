import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import { useRecipeForm } from "../hooks/useRecipeForm";
import { getContributorName, setContributorName } from "../utils/contributor";
import RecipeForm from "./RecipeForm";
import RecipeImport from "./RecipeImport";
import SubmissionPreviewModal from "./SubmissionPreviewModal";

const Contribute = ({ onRecipeSubmit }) => {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const form = useRecipeForm({
    contributor: getContributorName(),
    ingredients: [""],
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotice(null);
    setPreviewOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      const body = await form.buildSubmission();

      await onRecipeSubmit(body);
      // Remembered so My Recipes has a name to filter on until auth lands.
      setContributorName(body.contributor);
      setPreviewOpen(false);
      setNotice({
        severity: "success",
        message: `Successfully submitted "${body.recipe_name}".`,
      });
      // Let the confirmation land before leaving the page for the recipe list.
      redirectTimer.current = setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error(err);
      setNotice({
        severity: "error",
        message: "Could not submit your recipe. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      className="contribute"
      component="form"
      onSubmit={handleSubmit}
      autoComplete="off"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h4"
        sx={{ width: "50ch", textAlign: "center", marginTop: 2 }}
      >
        Contribute a Recipe
      </Typography>

      <RecipeImport onImported={form.applyImportedRecipe} />

      <RecipeForm form={form} />

      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        type="submit"
      >
        Submit Recipe
      </Button>

      <SubmissionPreviewModal
        open={previewOpen}
        recipe={form.previewRecipe}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice?.severity}
          variant="filled"
          onClose={() => setNotice(null)}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Contribute;
