import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Typography,
  Modal
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
          <Grid item xs={12} sm={6} md={3} key={recipe.id}>
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
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2
          }}
        >
          {selectedRecipe && (
            <>
              <CardMedia
                component="img"
                height="200"
                image={selectedRecipe.image_url}
                alt={selectedRecipe.recipe_name}
              />
              <Typography variant="h5" mt={2}>
                {selectedRecipe.recipe_name}
              </Typography>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
