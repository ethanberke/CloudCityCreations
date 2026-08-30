import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { IMAGE_ACCEPT } from "../utils/image";

// The fields only. Layout container, heading and submit controls belong to the
// caller, so the same markup serves the full Contribute page and the edit view
// inside a modal.
export default function RecipeForm({ form }) {
  const {
    values,
    setField,
    setListItem,
    addListItem,
    imagePreview,
    imageError,
    processingImage,
    handleFileChange,
    removeImage,
  } = form;

  const fieldSx = { width: "100%", maxWidth: "50ch", margin: "10px 0" };

  return (
    <>
      <TextField
        sx={fieldSx}
        name="contributor"
        label="Contributor Name*"
        variant="filled"
        value={values.contributor}
        onChange={(e) => setField("contributor", e.target.value)}
      />

      <TextField
        sx={fieldSx}
        name="recipe_name"
        label="Recipe Title*"
        variant="filled"
        value={values.recipe_name}
        onChange={(e) => setField("recipe_name", e.target.value)}
      />

      <TextField
        sx={fieldSx}
        name="style"
        label="Style* (e.g., Dessert, Appetizer)"
        variant="filled"
        value={values.style}
        onChange={(e) => setField("style", e.target.value)}
      />

      <Stack
        spacing={1}
        alignItems="center"
        sx={{ width: "100%", maxWidth: "50ch", mt: 1 }}
      >
        <Button
          variant="outlined"
          component="label"
          disabled={processingImage}
          sx={{ width: "22ch" }}
        >
          {processingImage ? "Processing…" : "Upload a photo"}
          <input
            hidden
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleFileChange}
          />
        </Button>

        {imagePreview && (
          <>
            <Box
              component="img"
              src={imagePreview}
              alt="Selected recipe photo"
              sx={{
                width: "100%",
                maxHeight: 220,
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
            <Button size="small" color="error" onClick={removeImage}>
              Remove photo
            </Button>
          </>
        )}

        {imageError && (
          <Alert severity="error" sx={{ width: "100%" }}>
            {imageError}
          </Alert>
        )}
      </Stack>

      <TextField
        sx={fieldSx}
        name="image_url"
        label="Image URL"
        variant="filled"
        disabled={Boolean(imagePreview)}
        helperText={
          imagePreview
            ? "Using the uploaded photo. Remove it to paste a link instead."
            : "Or paste a link to an existing image."
        }
        value={values.image_url}
        onChange={(e) => setField("image_url", e.target.value)}
      />

      {values.ingredients.map((ingredient, index) => (
        <TextField
          key={index}
          sx={fieldSx}
          variant="filled"
          multiline
          label={`Ingredient ${index + 1}`}
          value={ingredient}
          onChange={(e) => setListItem("ingredients", index, e.target.value)}
        />
      ))}

      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        onClick={() => addListItem("ingredients")}
      >
        Add Ingredient
      </Button>

      {values.instructions.map((instruction, index) => (
        <TextField
          key={index}
          sx={fieldSx}
          variant="filled"
          multiline
          label={`Step ${index + 1}`}
          value={instruction}
          onChange={(e) => setListItem("instructions", index, e.target.value)}
        />
      ))}

      <Button
        variant="contained"
        sx={{ margin: "10px 0", width: "22ch" }}
        onClick={() => addListItem("instructions")}
      >
        Add Instruction
      </Button>
    </>
  );
}
