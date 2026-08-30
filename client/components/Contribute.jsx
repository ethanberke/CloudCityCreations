import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { getContributorName, setContributorName } from "../utils/contributor";
import SubmissionPreviewModal from "./SubmissionPreviewModal";

const Contribute = ({ onRecipeSubmit }) => {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [newRecipe, setNewRecipe] = useState({
    contributor: getContributorName(),
    recipe_name: "",
    style: "",
    image_url: "",
    ingredients: [""],
    instructions: [],
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  // What the preview shows is exactly what gets submitted: blank ingredient
  // and step rows are dropped here rather than only being hidden from view.
  const previewRecipe = {
    ...newRecipe,
    contributor: newRecipe.contributor.trim(),
    recipe_name: newRecipe.recipe_name.trim(),
    style: newRecipe.style.trim(),
    image_url: newRecipe.image_url.trim(),
    ingredients: newRecipe.ingredients.map((i) => i.trim()).filter(Boolean),
    instructions: newRecipe.instructions.map((s) => s.trim()).filter(Boolean),
  };

  const handleAddIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, ""],
    });
  };

  const handleAddInstruction = () => {
    setNewRecipe({
      ...newRecipe,
      instructions: [...newRecipe.instructions, ""],
    });
  };

  const handleIngredientChange = (e, index) => {
    const updatedIngredients = [...newRecipe.ingredients];
    updatedIngredients[index] = e.target.value;
    setNewRecipe({ ...newRecipe, ingredients: updatedIngredients });
  };

  const handleInstructionChange = (e, index) => {
    const updatedInstructions = [...newRecipe.instructions];
    updatedInstructions[index] = e.target.value;
    setNewRecipe({ ...newRecipe, instructions: updatedInstructions });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotice(null);
    setPreviewOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      await onRecipeSubmit(previewRecipe);
      // Remembered so My Recipes has a name to filter on until auth lands.
      setContributorName(previewRecipe.contributor);
      setPreviewOpen(false);
      setNotice({
        severity: "success",
        message: `Successfully submitted "${previewRecipe.recipe_name}".`,
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
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        autoComplete: "off",
      }}
    >
      <Typography
        variant="h4"
        sx={{ width: "50ch", textAlign: "center", marginTop: 2 }}
      >
        Contribute a Recipe
      </Typography>
      <TextField
        sx={{ width: "50ch", margin: "10px 0" }}
        name="contributor"
        label="Contibutor Name*"
        variant="filled"
        value={newRecipe.contributor}
        onChange={(e) =>
          setNewRecipe({ ...newRecipe, contributor: e.target.value })
        }
      />

      <TextField
        sx={{ width: "50ch", margin: "10px 0" }}
        name="recipe_name"
        label="Recipe Title*"
        variant="filled"
        value={newRecipe.recipe_name}
        onChange={(e) =>
          setNewRecipe({ ...newRecipe, recipe_name: e.target.value })
        }
      />
      <TextField
        sx={{ width: "50ch", margin: "10px 0" }}
        name="style"
        label="Style* (e.g., Dessert, Appetizer)"
        variant="filled"
        value={newRecipe.style}
        onChange={(e) => setNewRecipe({ ...newRecipe, style: e.target.value })}
      />
      <TextField
        sx={{ width: "50ch", margin: "10px 0" }}
        name="image_url"
        label="Image URL"
        variant="filled"
        value={newRecipe.image_url}
        onChange={(e) =>
          setNewRecipe({ ...newRecipe, image_url: e.target.value })
        }
      />
      {newRecipe.ingredients.map((ingredient, index) => (
        <Box key={index}>
          <TextField
            value={ingredient}
            onChange={(e) => handleIngredientChange(e, index)}
            sx={{ width: "50ch", margin: "10px 0" }}
            variant="filled"
            multiline
            label={`Ingredient ${index + 1}`}
          />
        </Box>
      ))}
      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        onClick={handleAddIngredient}
      >
        Add Ingredient
      </Button>
      {newRecipe.instructions.map((instruction, index) => (
        <Box key={index}>
          <TextField
            value={instruction}
            onChange={(e) => handleInstructionChange(e, index)}
            sx={{ width: "50ch", margin: "10px 0" }}
            variant="filled"
            multiline
            label={`Step ${index + 1}`}
          />
        </Box>
      ))}

      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        onClick={handleAddInstruction}
      >
        Add Instruction
      </Button>
      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        type="submit"
      >
        Submit Recipe
      </Button>

      <SubmissionPreviewModal
        open={previewOpen}
        recipe={previewRecipe}
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
