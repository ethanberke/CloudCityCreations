import { Link } from "react-router-dom";
import RecipeTile from "./RecipeTile";
import Typography from '@mui/material/Typography';


export default function Landing() {
  return (
    <div className="landing">
      <Typography variant="h4" component="h1" gutterBottom justifyContent="center">
        Your squad’s recipes, all in one place.
      </Typography>
      <RecipeTile />
    </div>
  );
}