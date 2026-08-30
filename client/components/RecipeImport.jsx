import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { importRecipeFromUrl } from "../utils/scrape";

// Shown above the Contribute form. Importing only fills the fields in — every
// value stays editable, and the preview modal is still what decides whether a
// recipe is written, so a page the importer read badly costs an edit rather
// than a bad row.
export default function RecipeImport({ onImported }) {
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [importedFrom, setImportedFrom] = useState(null);

  const siteName = (value) => {
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return "that page";
    }
  };

  const handleImport = async () => {
    const target = url.trim();
    if (!target) return;

    setImporting(true);
    setError(null);
    setImportedFrom(null);

    try {
      const recipe = await importRecipeFromUrl(target);
      onImported(recipe);
      setImportedFrom(siteName(recipe.source_url));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{ width: "100%", maxWidth: "50ch", mt: 2, p: 2, borderRadius: 2 }}
    >
      <Typography variant="subtitle1">Import from a recipe link</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Paste a recipe page and the fields below fill themselves in. Check them
        over — sites word their steps in all sorts of ways.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          size="small"
          type="url"
          label="Recipe URL"
          placeholder="https://example.com/recipes/bantha-stew"
          value={url}
          disabled={importing}
          onChange={(e) => setUrl(e.target.value)}
          // This field sits inside the Contribute <form>, where Enter would
          // otherwise open the submit preview on an empty form.
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            handleImport();
          }}
        />

        <Button
          type="button"
          variant="contained"
          onClick={handleImport}
          disabled={importing || !url.trim()}
          sx={{ minWidth: "12ch" }}
        >
          {importing ? "Importing…" : "Import"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {importedFrom && !error && (
        <Alert
          severity="success"
          sx={{ mt: 2 }}
          onClose={() => setImportedFrom(null)}
        >
          Filled in from {importedFrom}. Edit anything below before submitting.
        </Alert>
      )}
    </Paper>
  );
}
