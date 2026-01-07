import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./components/Landing";
import RecipesPage from "./pages/RecipesPage";
import ContributePage from "./pages/ContributePage";
import About from "./pages/About";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}