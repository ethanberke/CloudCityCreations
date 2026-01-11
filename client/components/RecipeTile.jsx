import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Typography,
  Modal,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";

export default function RecipeTile() {
  const [recipes, setRecipes] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/recipes")
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error(err));
  }, []);

  const handleOpen = (recipe) => {
    setSelectedRecipe(recipe);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRecipe(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        {recipes.map((recipe) => (
          <Grid size={{xs: 12, sm: 6, md: 4}} key={recipe.id}>
            <Card onClick={() => handleOpen(recipe)}>
              <CardActionArea>
                <CardMedia
                  component="img"
                  height="150"
                  image={recipe.image_url}
                  alt={recipe.recipe_name}
                />
                <CardContent>
                  <Typography variant="h6" align="center">
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
            width: "80%",
            bgcolor: "background.paper",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: 24,
            p: 2
          }}
        >
          {selectedRecipe && (
            <>
            <Typography variant="h5" mt={2}>
              {selectedRecipe.recipe_name}
              {selectedRecipe.contributor}
              {selectedRecipe.style}
            </Typography>
              <CardMedia
                component="img"
                height="200"
                image={selectedRecipe.image_url}
                alt={selectedRecipe.recipe_name}
              />

            <Typography>Ingredients</Typography>
            <List>
              {[...new Map(
                (selectedRecipe?.ingredients || []).map(i => [i.ingredient, i])
              ).values()].map((ingredient) => (
                <ListItem key={ingredient.ingredient}>
                  <ListItemText primary={ingredient.ingredient} />
                </ListItem>
              ))}
            </List>

            <Typography>Steps</Typography>
            <List>
            {[...new Map (
              (selectedRecipe?.instructions ||[]).map( i => [i.step, i])
            ).values()].map((instruction) => (
                <ListItem key={instruction.id}>
                  <ListItemText primary={instruction.step} />
                </ListItem>
              ))}
            </List>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
