export default function Recipes({ recipes }) {
  return (
    <div className="recipes">
      <h1>Recipes</h1>

      <select>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.recipe_name}
          </option>
        ))}
      </select>
    </div>
  );
}
