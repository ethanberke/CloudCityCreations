import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import Landing from "./components/Landing";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import ContributePage from "./pages/ContributePage";
import MyRecipesPage from "./pages/MyRecipesPage";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Toolbar disableGutters />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/my-recipes" element={<MyRecipesPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/about" element={<About />} />

        {/* /recipes was deleted with its bare-select page; send old bookmarks
            to the landing grid rather than rendering a blank page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
