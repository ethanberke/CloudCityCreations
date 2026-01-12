import Contribute from "../components/Contribute";

export default function ContributePage() {
  const handleRecipeSubmit = async (newRecipe) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecipe),
      });

      if (!res.ok) throw new Error("Failed to submit recipe");

      console.log("Recipe submitted!");
    } catch (err) {
      console.error(err);
    }
  };

  return <Contribute onRecipeSubmit={handleRecipeSubmit} />;
}
