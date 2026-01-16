import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import postgres from "postgres";

dotenv.config({ path: "../.env" });
console.log("DB URL:", process.env.DATABASE_URL);

const PORT = process.env.PORT;
const sql = postgres(process.env.DATABASE_URL);
const app = express();

app.use(express.json());
app.use(express.static("../client/dist"));

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);

app.get("/api/recipes", (req, res) => {
  sql`
    SELECT
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
    FROM recipes r
  `
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get("/api/recipes/:recipe_id", (req, res) => {
  const recipeId = req.params.recipe_id;

  sql`
    SELECT
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
    FROM recipes r
    WHERE r.id = ${recipeId}
  `
    .then((data) => {
      if (data.length === 0) return res.sendStatus(404);
      res.json(data[0]);
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
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

    res.json({ message: "Recipe created", recipe_id });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
