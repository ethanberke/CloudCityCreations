import { useEffect, useState } from "react";
import RecipeTile from "./RecipeTile";
import Typography from "@mui/material/Typography";

export default function Landing() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
      .then(res => res.json())
      .then(data => setRecipes(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="landing">
      <Typography variant="h4" component="h1" gutterBottom>
        Your squad’s recipes, all in one place.
      </Typography>

      <RecipeTile recipes={recipes} />
    </div>
  );
}