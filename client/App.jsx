import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Landing from "./components/Landing";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import ContributePage from "./pages/ContributePage";
import RecipesPage from "./pages/RecipesPage";
import Toolbar from "@mui/material/Toolbar";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Toolbar disableGutters/>
      
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}
