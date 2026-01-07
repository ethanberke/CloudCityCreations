import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ThemeWrapper from "./components/DarkMode.jsx";

createRoot(document.getElementById("root")).render(  
    <ThemeWrapper>
        <App />
    </ThemeWrapper>
);
