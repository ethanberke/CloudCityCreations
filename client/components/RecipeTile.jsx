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
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
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
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={recipe.id}>
            <Card onClick={() => handleOpen(recipe)}>
              <CardActionArea>
                <CardMedia
                  component="img"
                  height="150"
                  image={recipe.image_url || "/images/grogu_peak.jpg"}
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
              image={selectedRecipe.image_url || "/images/grogu_peak.jpg"}
              alt={selectedRecipe.recipe_name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/grogu_peak.jpg";
              }}
            />

            <Typography>Ingredients</Typography>
            <List sx={{ listStyleType: 'disc', pl: 4 }}>
              {[...new Map(
                (selectedRecipe?.ingredients || []).map(i => [i.ingredient, i])
              ).values()].map((ingredient) => (
                <ListItem sx={{ display: 'list-item' }} key={ingredient.ingredient}>
                  <ListItemText primary={ingredient.ingredient} />
                </ListItem>
              ))}
            </List>

            <Typography>Steps</Typography>
          <List component="ol" sx={{ listStyleType: "decimal", pl: 4 }}>
            {[...new Map(
              (selectedRecipe?.instructions || []).map(i => [i.step_order, i])
            ).values()].map((instruction) => (
              <ListItem component="li" key={instruction.id}>
                <ListItemText primary={instruction.step} sx={{ display: "list-item" }}/>
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
