import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import postgres from "postgres";
import {
  deleteImageIfLocal,
  ensureUploadDir,
  MAX_UPLOAD_BYTES,
  saveImage,
  sniffImage,
  UPLOAD_DIR,
  UPLOAD_URL_PREFIX,
} from "./lib/images.js";

// Reads server/.env — resolved from the working directory, which npm workspaces
// and the Docker WORKDIR both set to the server directory. It deliberately no
// longer reaches up to the root .env: that file also carried a GitHub PAT (#27).
dotenv.config();

const PORT = process.env.PORT || 5000;
const sql = postgres(process.env.DATABASE_URL);
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);

app.use(express.static("../client/dist"));

await ensureUploadDir();

// Uploaded photos are served under the API base so the existing VITE_API_URL
// resolves them without any new client config. nosniff matters because these
// are user-supplied bytes coming back from our own origin.
app.use(
  "/api/uploads",
  express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: "ignore",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  }),
);

// Kept in memory so the bytes can be inspected before anything is written to
// disk — nothing untrusted gets a filename until it's confirmed to be an image.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

app.post("/api/uploads", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? "Image is too large" : "Invalid upload",
      });
    }

    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const signature = sniffImage(req.file.buffer);
    if (!signature) {
      return res
        .status(415)
        .json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." });
    }

    try {
      const filename = await saveImage(req.file.buffer, signature.ext);
      res.status(201).json({ url: `${UPLOAD_URL_PREFIX}${filename}` });
    } catch (error) {
      console.error("Error saving upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

// Shared column list for both recipe reads below — each recipe's ingredients/instructions
// are pulled in as a single scalar json_agg per row, so there's no join-row multiplication
// to deduplicate on the client.
const recipeColumns = sql`
  r.id AS recipe_id,
  r.contributor,
  r.recipe_name,
  r.style,
  r.image_url,
  r.created_at,
  (
    SELECT json_agg(json_build_object(
      'ingredient_id', i.id,
      'ingredient', i.ingredient
    ))
    FROM ingredients i
    WHERE i.recipe_id = r.id
  ) AS ingredients,
  (
    SELECT json_agg(json_build_object(
      'instruction_id', s.id,
      'step_order', s.step_order,
      'step', s.step
    ) ORDER BY s.step_order)
    FROM instructions s
    WHERE s.recipe_id = r.id
  ) AS instructions
`;

// Sort keys map to SQL fragments rather than to column names spliced into the
// query, so nothing from the URL is ever interpolated as an identifier. Every
// option ends in a unique tiebreaker: without one, ties (recipes seeded in the
// same statement) come back in whatever order the heap happens to hold them,
// and an edit can silently reshuffle the grid.
const recipeSorts = {
  newest: sql`r.created_at DESC, r.id DESC`,
  oldest: sql`r.created_at ASC, r.id ASC`,
  name: sql`lower(r.recipe_name) ASC, r.id ASC`,
  contributor: sql`lower(r.contributor) ASC, lower(r.recipe_name) ASC, r.id ASC`,
};
const DEFAULT_SORT = "newest";

// Express hands back an array for a repeated param (?style=a&style=b) and an
// object for bracket syntax; anything that isn't a plain string is treated as
// absent rather than coerced into a filter nobody asked for.
const queryString = (value) => (typeof value === "string" ? value.trim() : "");

app.get("/api/recipes", async (req, res) => {
  const style = queryString(req.query.style);
  const contributor = queryString(req.query.contributor);
  const sort = queryString(req.query.sort) || DEFAULT_SORT;

  if (!Object.hasOwn(recipeSorts, sort)) {
    return res.status(400).json({
      error: `Unknown sort "${sort}". Expected one of: ${Object.keys(
        recipeSorts,
      ).join(", ")}.`,
    });
  }

  // Both columns are free text typed by hand, so "Main Dish" and "main dish"
  // have to match. migration.sql indexes the same lower() expressions.
  const conditions = [];
  if (style) conditions.push(sql`lower(r.style) = lower(${style})`);
  if (contributor)
    conditions.push(sql`lower(r.contributor) = lower(${contributor})`);

  const where = conditions.length
    ? conditions.reduce((left, right) => sql`${left} AND ${right}`)
    : sql`TRUE`;

  try {
    const recipes = await sql`
      SELECT ${recipeColumns}
      FROM recipes r
      WHERE ${where}
      ORDER BY ${recipeSorts[sort]}
    `;
    res.json(recipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/recipes/:recipe_id", async (req, res) => {
  const recipeId = req.params.recipe_id;

  try {
    const recipes = await sql`
      SELECT ${recipeColumns} FROM recipes r WHERE r.id = ${recipeId}
    `;

    if (recipes.length === 0) return res.sendStatus(404);

    res.json(recipes[0]);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/recipes", async (req, res) => {
  const {
    contributor,
    recipe_name,
    style,
    image_url,
    ingredients,
    instructions,
  } = req.body;

  console.log("BODY:", req.body);
  try {
    const recipe_id = await sql.begin(async (sql) => {
      const recipeResult = await sql`
        INSERT INTO recipes (contributor, recipe_name, style, image_url)
        VALUES (${contributor}, ${recipe_name}, ${style}, ${image_url})
        RETURNING id
      `;

      const recipe_id = recipeResult[0].id;

      for (const ingredient of ingredients) {
        await sql`
          INSERT INTO ingredients (recipe_id, ingredient)
          VALUES (${recipe_id}, ${ingredient})
        `;
      }

      for (let i = 0; i < instructions.length; i++) {
        await sql`
          INSERT INTO instructions (recipe_id, step_order, step)
          VALUES (${recipe_id}, ${i + 1}, ${instructions[i]})
        `;
      }

      return recipe_id;
    });

    res.json({ message: "Recipe created", recipe_id });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/recipes/:recipe_id", async (req, res) => {
  const recipeId = req.params.recipe_id;
  let replacedImage = null;
  const {
    contributor,
    recipe_name,
    style,
    image_url,
    ingredients,
    instructions,
  } = req.body;

  try {
    const updated = await sql.begin(async (sql) => {
      const previous = await sql`
        SELECT image_url FROM recipes WHERE id = ${recipeId}
      `;

      const recipeResult = await sql`
        UPDATE recipes
        SET contributor = ${contributor},
            recipe_name = ${recipe_name},
            style = ${style},
            image_url = ${image_url}
        WHERE id = ${recipeId}
        RETURNING id
      `;

      if (recipeResult.length === 0) return false;

      replacedImage =
        previous[0].image_url === image_url ? null : previous[0].image_url;

      await sql`DELETE FROM ingredients WHERE recipe_id = ${recipeId}`;
      await sql`DELETE FROM instructions WHERE recipe_id = ${recipeId}`;

      for (const ingredient of ingredients) {
        await sql`
          INSERT INTO ingredients (recipe_id, ingredient)
          VALUES (${recipeId}, ${ingredient})
        `;
      }

      for (let i = 0; i < instructions.length; i++) {
        await sql`
          INSERT INTO instructions (recipe_id, step_order, step)
          VALUES (${recipeId}, ${i + 1}, ${instructions[i]})
        `;
      }

      return true;
    });

    if (!updated) return res.sendStatus(404);

    // Only after the transaction commits — an unlink can't be rolled back.
    await deleteImageIfLocal(replacedImage);

    res.json({ message: "Recipe updated", recipe_id: recipeId });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/recipes/:recipe_id", async (req, res) => {
  const recipeId = req.params.recipe_id;

  try {
    const deleted = await sql.begin(async (sql) => {
      await sql`DELETE FROM ingredients WHERE recipe_id = ${recipeId}`;
      await sql`DELETE FROM instructions WHERE recipe_id = ${recipeId}`;

      const recipeResult = await sql`
        DELETE FROM recipes WHERE id = ${recipeId} RETURNING id, image_url
      `;

      return recipeResult.length > 0 ? recipeResult[0] : null;
    });

    if (!deleted) return res.sendStatus(404);

    await deleteImageIfLocal(deleted.image_url);

    res.json({ message: "Recipe deleted", recipe_id: recipeId });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
