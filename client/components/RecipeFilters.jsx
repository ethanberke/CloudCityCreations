import { Button, MenuItem, Stack, TextField } from "@mui/material";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Recipe name (A–Z)" },
  { value: "contributor", label: "Contributor (A–Z)" },
];

// Mirrors the server's defaults — sending no filters and `sort=newest` is the
// same request the API makes when the params are left off entirely.
export const DEFAULT_FILTERS = { style: "", contributor: "", sort: "newest" };

export default function RecipeFilters({
  value,
  onChange,
  styles = [],
  contributors = [],
}) {
  const fieldSx = { minWidth: { xs: "100%", sm: "18ch" } };
  const isDefault =
    !value.style && !value.contributor && value.sort === DEFAULT_FILTERS.sort;

  const setField = (field) => (event) =>
    onChange({ ...value, [field]: event.target.value });

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="center"
      sx={{ mb: 3 }}
    >
      <TextField
        select
        size="small"
        label="Style"
        variant="outlined"
        sx={fieldSx}
        value={value.style}
        onChange={setField("style")}
      >
        <MenuItem value="">All styles</MenuItem>
        {styles.map((style) => (
          <MenuItem key={style} value={style}>
            {style}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Contributor"
        variant="outlined"
        sx={fieldSx}
        value={value.contributor}
        onChange={setField("contributor")}
      >
        <MenuItem value="">All contributors</MenuItem>
        {contributors.map((contributor) => (
          <MenuItem key={contributor} value={contributor}>
            {contributor}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Sort by"
        variant="outlined"
        sx={fieldSx}
        value={value.sort}
        onChange={setField("sort")}
      >
        {SORT_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <Button
        size="small"
        onClick={() => onChange(DEFAULT_FILTERS)}
        disabled={isDefault}
      >
        Reset
      </Button>
    </Stack>
  );
}
