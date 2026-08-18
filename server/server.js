import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import postgres from "postgres";

dotenv.config({ path: "../.env" });
console.log("DB URL:", process.env.DATABASE_URL);

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

// Shared column list for both recipe reads below — each recipe's ingredients/instructions
// are pulled in as a single scalar json_agg per row, so there's no join-row multiplication
// to deduplicate on the client.
const recipeColumns = sql`
  r.id AS recipe_id,
  r.contributor,
  r.recipe_name,
  r.style,
  r.image_url,
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

app.get("/api/recipes", async (req, res) => {
  try {
    const recipes = await sql`SELECT ${recipeColumns} FROM recipes r`;
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
        DELETE FROM recipes WHERE id = ${recipeId} RETURNING id
      `;

      return recipeResult.length > 0;
    });

    if (!deleted) return res.sendStatus(404);

    res.json({ message: "Recipe deleted", recipe_id: recipeId });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
