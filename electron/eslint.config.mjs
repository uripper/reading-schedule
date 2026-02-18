import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["renderer/**/*.ts"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "module", globals: globals.browser },
  },
  {
    files: ["main.ts", "preload.ts", "book_lookup.ts", "state_store.ts"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
]);
