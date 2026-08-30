import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Placeholder copy — replace with the real story behind the app.
export default function About() {
  return (
    <Box sx={{ padding: 2, maxWidth: "70ch", mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        About C-3 Creations
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        Cloud City Culinary Creations is where our team keeps the recipes we
        bring to potlucks, so the good ones stop living in chat threads and
        half-remembered conversations.
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        Browse what everyone has contributed from the home page, or add your own
        with the + button up top. Each recipe keeps its ingredients and steps
        together, credited to whoever brought it.
      </Typography>
      <Typography component="p" color="text.secondary">
        This page is a placeholder — the real one is still being written.
      </Typography>
    </Box>
  );
}
