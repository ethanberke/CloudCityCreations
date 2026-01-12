import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing">
      <h1>Welcome to Galvanize Recipes</h1>
      <p>Your squad’s recipes, all in one place.</p>

      <Link to="/recipes">
        <button>View Recipes</button>
      </Link>

      <Link to="/contribute">
        <button>Contribute a Recipe</button>
      </Link>
    </div>
  );
}
