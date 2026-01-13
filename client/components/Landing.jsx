import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import RecipeTile from "./RecipeTile";

export default function Landing() {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/recipes`)
      .then((res) => res.json())
      .then((data) => setRecipes(data))
      .catch((err) => console.error(err));
  }, []);

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

      <RecipeTile recipes={recipes} />
    </Box>
  );
}
