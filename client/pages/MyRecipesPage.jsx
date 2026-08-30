import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Placeholder so the navbar link has somewhere to land. #19 replaces this with
// the real owner-scoped grid.
export default function MyRecipesPage() {
  return (
    <Box sx={{ padding: 2, textAlign: "center" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Recipes
      </Typography>
      <Typography color="text.secondary">
        Your own contributions will show up here, with edit and delete on each
        one. Still being built.
      </Typography>
    </Box>
  );
}
