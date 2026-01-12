import pluginPrettier from "eslint-plugin-prettier";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  pluginReact.configs.flat.recommended,

  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      prettier: pluginPrettier,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      "prettier/prettier": "error",
    },
  },
]);
