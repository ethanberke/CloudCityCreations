import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RecipeTile from "../components/RecipeTile";
import {
  filterByContributor,
  getContributorName,
  setContributorName,
} from "../utils/contributor";

export default function MyRecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [name, setName] = useState(getContributorName);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load recipes (${res.status})`);
        return res.json();
      })
      .then((data) => setRecipes(data))
      .catch((err) => {
        console.error(err);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const myRecipes = useMemo(
    () => filterByContributor(recipes, name),
    [recipes, name],
  );

  const handleSaveName = (e) => {
    e.preventDefault();
    const nextName = draftName.trim();
    if (!nextName) return;
    setName(nextName);
    setContributorName(nextName);
    setEditingName(false);
  };

  const askingForName = !name || editingName;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ textAlign: "center" }}
      >
        My Recipes
      </Typography>

      {askingForName ? (
        <Box
          component="form"
          onSubmit={handleSaveName}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "60ch",
            mx: "auto",
          }}
        >
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", mb: 2 }}
          >
            There’s no sign-in yet, so tell us the name you contribute under and
            we’ll remember it on this device.
          </Typography>
          <TextField
            label="Contributor name"
            variant="filled"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            sx={{ width: "40ch", mb: 2 }}
          />
          <Stack direction="row" spacing={2}>
            {editingName && (
              <Button onClick={() => setEditingName(false)}>Cancel</Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={!draftName.trim()}
            >
              Save
            </Button>
          </Stack>
        </Box>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 2 }}
          >
            <Typography color="text.secondary">Viewing as {name}</Typography>
            <Button
              size="small"
              onClick={() => {
                setDraftName(name);
                setEditingName(true);
              }}
            >
              Change
            </Button>
          </Stack>

          {loadFailed && (
            <Alert severity="error" sx={{ maxWidth: "60ch", mx: "auto" }}>
              Could not load recipes. Please refresh and try again.
            </Alert>
          )}

          {!loadFailed && loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!loadFailed && !loading && myRecipes.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography sx={{ mb: 2 }}>
                Nothing here yet — no recipes are credited to {name}.
              </Typography>
              <Button component={Link} to="/contribute" variant="contained">
                Contribute a recipe
              </Button>
            </Box>
          )}

          {!loadFailed && !loading && myRecipes.length > 0 && (
            <RecipeTile
              recipes={myRecipes}
              showOwnerActions
              onRecipeDeleted={(recipeId) =>
                setRecipes((current) =>
                  current.filter((recipe) => recipe.recipe_id !== recipeId),
                )
              }
            />
          )}
        </>
      )}
    </Box>
  );
}
