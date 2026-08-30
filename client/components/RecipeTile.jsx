import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Grid,
  List,
  ListItem,
  ListItemText,
  Modal,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { resolveImageUrl } from "../utils/image";
import DeleteConfirmModal from "./DeleteConfirmModal";
import DeleteRecipe from "./DeleteRecipe";
import RecipeEditor from "./RecipeEditor";
import RecipeImage from "./RecipeImage";

export default function RecipeTile({
  recipes = [],
  showOwnerActions = false,
  onRecipeDeleted,
  onRecipeUpdated,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeToDelete, setRecipeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleOpen = (recipe) => {
    setSelectedRecipe(recipe);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(false);
    setSelectedRecipe(null);
  };

  const handleSaved = (updatedRecipe) => {
    setSelectedRecipe(updatedRecipe);
    onRecipeUpdated?.(updatedRecipe);
    setEditing(false);
    setNotice({
      severity: "success",
      message: `Successfully saved changes to "${updatedRecipe.recipe_name}".`,
    });
  };

  const handleSaveError = (recipeName) => {
    setNotice({
      severity: "error",
      message: `Could not save changes to "${recipeName}". Please try again.`,
    });
  };

  const handleDeleteCancel = () => {
    setRecipeToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setNotice(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/recipes/${recipeToDelete.recipe_id}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`);

      onRecipeDeleted?.(recipeToDelete.recipe_id);
      setNotice({
        severity: "success",
        message: `Successfully deleted "${recipeToDelete.recipe_name}".`,
      });
      setRecipeToDelete(null);
    } catch (err) {
      console.error(err);
      setNotice({
        severity: "error",
        message: `Could not delete "${recipeToDelete.recipe_name}". Please try again.`,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        {recipes.map((recipe) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={recipe.recipe_id}>
            <Card
              onClick={() => handleOpen(recipe)}
              sx={{ position: "relative" }}
            >
              {showOwnerActions && (
                <DeleteRecipe
                  recipeName={recipe.recipe_name}
                  onDelete={() => setRecipeToDelete(recipe)}
                />
              )}
              <CardActionArea>
                <CardMedia
                  component="img"
                  height="175"
                  image={resolveImageUrl(recipe.image_url)}
                  alt={recipe.recipe_name}
                />
                <CardContent
                  sx={{
                    minHeight: 70,
                    maxHeight: 70,
                  }}
                >
                  <Typography
                    variant="h6"
                    align="center"
                    sx={{
                      wordBreak: "break-word",
                      fontSize: {
                        xs: "0.9rem",
                        sm: "1rem",
                        md: "1.1rem",
                      },
                    }}
                  >
                    {recipe.recipe_name}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: "80%", md: "70%" },
            bgcolor: "background.paper",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
          }}
        >
          {selectedRecipe && editing && (
            <RecipeEditor
              recipe={selectedRecipe}
              onCancel={handleClose}
              onSaved={handleSaved}
              onError={handleSaveError}
            />
          )}

          {selectedRecipe && !editing && (
            <>
              {showOwnerActions && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button variant="outlined" onClick={() => setEditing(true)}>
                    Edit recipe
                  </Button>
                </Stack>
              )}

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" mt={2}>
                  {selectedRecipe.recipe_name}
                </Typography>
                <Typography variant="h5" mt={2}>
                  Contributed by {selectedRecipe.contributor}
                </Typography>
                <Typography variant="h6" mt={2}>
                  Style: {selectedRecipe.style}
                </Typography>
              </Box>
              <RecipeImage
                imageUrl={selectedRecipe.image_url}
                alt={selectedRecipe.recipe_name}
              />

              <Typography>Ingredients</Typography>
              <List sx={{ listStyleType: "disc", pl: 4 }}>
                {[
                  ...new Map(
                    (selectedRecipe?.ingredients || []).map((i) => [
                      i.ingredient,
                      i,
                    ]),
                  ).values(),
                ].map((ingredient) => (
                  <ListItem
                    disablePadding
                    sx={{ display: "list-item", py: 0.25 }}
                    key={ingredient.ingredient}
                  >
                    <ListItemText primary={ingredient.ingredient} />
                  </ListItem>
                ))}
              </List>

              <Typography>Steps</Typography>
              <List component="ol" sx={{ listStyleType: "decimal", pl: 4 }}>
                {[
                  ...new Map(
                    (selectedRecipe?.instructions || []).map((i) => [
                      i.step_order,
                      i,
                    ]),
                  ).values(),
                ].map((instruction) => (
                  <ListItem component="li" key={instruction.instruction_id}>
                    <ListItemText
                      primary={instruction.step}
                      sx={{ display: "list-item" }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(recipeToDelete)}
        recipeName={recipeToDelete?.recipe_name}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
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
}
