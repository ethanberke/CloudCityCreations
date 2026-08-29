import Contribute from "../components/Contribute";

export default function ContributePage() {
  // Errors propagate to Contribute.jsx, which keeps the preview modal open
  // and reports the failure rather than navigating away as if it worked.
  const handleRecipeSubmit = async (newRecipe) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecipe),
    });

    if (!res.ok) throw new Error(`Failed to submit recipe (${res.status})`);

    return res.json();
  };

  return <Contribute onRecipeSubmit={handleRecipeSubmit} />;
}
