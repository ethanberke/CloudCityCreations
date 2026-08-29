export default function Recipes({ recipes }) {
  return (
    <div className="recipes">
      <h1>Recipes</h1>

      <select>
        {recipes.map((r) => (
          <option key={r.recipe_id} value={r.recipe_id}>
            {r.recipe_name}
          </option>
        ))}
      </select>
    </div>
  );
}
