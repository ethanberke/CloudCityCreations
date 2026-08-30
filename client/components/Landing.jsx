import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import RecipeFilters, { DEFAULT_FILTERS } from "./RecipeFilters";
import RecipeTile from "./RecipeTile";

// `style` and `contributor` are free text, so the dropdowns are built from the
// values actually in use rather than from a fixed list the DB knows nothing about.
function collectOptions(recipes, field) {
  const values = recipes.map((recipe) => (recipe[field] ?? "").trim());
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export default function Landing() {
  const [recipes, setRecipes] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ styles: [], contributors: [] });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const isFiltered = Boolean(filters.style || filters.contributor);

  useEffect(() => {
    const params = new URLSearchParams({ sort: filters.sort });
    if (filters.style) params.set("style", filters.style);
    if (filters.contributor) params.set("contributor", filters.contributor);

    // A slow response for an abandoned filter must not overwrite the current one.
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    fetch(`${import.meta.env.VITE_API_URL}/recipes?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load recipes (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRecipes(data);

        // Only an unfiltered response describes the whole collection; refreshing
        // the options from a filtered one would drop the option just chosen.
        if (!filters.style && !filters.contributor) {
          setOptions({
            styles: collectOptions(data, "style"),
            contributors: collectOptions(data, "contributor"),
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <Box className="landing" sx={{ padding: 2 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ textAlign: "center" }}
      >
        Your squad’s recipes, all in one place.
      </Typography>

      <RecipeFilters
        value={filters}
        onChange={setFilters}
        styles={options.styles}
        contributors={options.contributors}
      />

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

      {!loadFailed && !loading && recipes.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          {isFiltered
            ? "No recipes match those filters."
            : "No recipes yet — be the first to contribute one."}
        </Typography>
      )}

      {/* Read-only on purpose: delete lives on My Recipes now. */}
      {!loadFailed && !loading && recipes.length > 0 && (
        <RecipeTile recipes={recipes} />
      )}
    </Box>
  );
}
