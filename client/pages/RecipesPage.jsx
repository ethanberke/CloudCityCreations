import { useEffect, useState } from "react";
import Recipes from "../components/Recipes";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error("Error fetching recipes:", err));
  }, []);

  return <Recipes recipes={recipes} />;
}