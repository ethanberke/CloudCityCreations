import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Grid,
  List,
  ListItem,
  ListItemText,
  Modal,
  Paper,
  Typography,
} from "@mui/material";

export default function RecipeTile() {
  const [recipes, setRecipes] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
      .then((res) => res.json())
      .then((data) => setRecipes(data))
      .catch((err) => console.error(err));
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
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={recipe.id}>
            <Card onClick={() => handleOpen(recipe)}>
              <CardActionArea>
                <CardMedia
                  component="img"
                  height="175"
                  image={recipe.image_url || "/images/grogu_peak.jpg"}
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
          {selectedRecipe && (
            <>
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
              <Paper elevation={8}>
                <CardMedia
                  component="img"
                  image={selectedRecipe.image_url || "/images/grogu_peak.jpg"}
                  alt={selectedRecipe.recipe_name}
                  sx={{
                    width: "100%",
                    height: "auto",
                    maxHeight: 300,
                    objectFit: "cover",
                    borderRadius: 2,
                    my: 2,
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/grogu_peak.jpg";
                  }}
                />
              </Paper>

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
                  <ListItem component="li" key={instruction.id}>
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
    </Box>
  );
}
