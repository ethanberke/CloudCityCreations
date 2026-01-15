import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const Contribute = ({ onRecipeSubmit }) => {
  const navigate = useNavigate();

  const [newRecipe, setNewRecipe] = useState({
    contributor: "",
    recipe_name: "",
    style: "",
    image_url: "",
    ingredients: [""],
    instructions: [""],
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirm = window.confirm("Are you ready to submit your recipe?");
    if (confirm) {
      await onRecipeSubmit(newRecipe);
      alert("Recipe submitted successfully!");
      navigate("/");
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
            rows={2}
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
    </Box>
  );
};

export default Contribute;
