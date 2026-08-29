import {
  Box,
  Button,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  Modal,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function SubmissionPreviewModal({
  open,
  recipe,
  onCancel,
  onConfirm,
  submitting = false,
}) {
  if (!recipe) return null;

  const { ingredients, instructions } = recipe;

  return (
    <Modal open={open} onClose={submitting ? undefined : onCancel}>
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
        <Typography variant="h5" component="h2" align="center">
          Preview your recipe
        </Typography>
        <Typography align="center" color="text.secondary" mt={1}>
          Nothing is saved until you submit.
        </Typography>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" mt={2}>
            {recipe.recipe_name || "Untitled recipe"}
          </Typography>
          <Typography variant="h5" mt={2}>
            Contributed by {recipe.contributor || "Anonymous"}
          </Typography>
          <Typography variant="h6" mt={2}>
            Style: {recipe.style || "Unspecified"}
          </Typography>
        </Box>

        <Paper elevation={8}>
          <CardMedia
            component="img"
            image={recipe.image_url || "/images/grogu_peak.jpg"}
            alt={recipe.recipe_name}
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
        {ingredients.length > 0 ? (
          <List sx={{ listStyleType: "disc", pl: 4 }}>
            {ingredients.map((ingredient, index) => (
              <ListItem
                disablePadding
                sx={{ display: "list-item", py: 0.25 }}
                key={index}
              >
                <ListItemText primary={ingredient} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ pl: 4, py: 1 }}>
            No ingredients added yet.
          </Typography>
        )}

        <Typography>Steps</Typography>
        {instructions.length > 0 ? (
          <List component="ol" sx={{ listStyleType: "decimal", pl: 4 }}>
            {instructions.map((instruction, index) => (
              <ListItem component="li" key={index}>
                <ListItemText
                  primary={instruction}
                  sx={{ display: "list-item" }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ pl: 4, py: 1 }}>
            No steps added yet.
          </Typography>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
          <Button onClick={onCancel} disabled={submitting}>
            Keep editing
          </Button>
          <Button variant="contained" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit recipe"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
