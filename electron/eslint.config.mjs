import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["renderer/**/*.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "module", globals: globals.browser },
  },
  {
    files: ["main.js", "preload.js", "book_lookup.js", "state_store.js"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
]);
