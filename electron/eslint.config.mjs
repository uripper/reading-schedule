import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { jsdoc } from "eslint-plugin-jsdoc";

import {
  ALL_CODE_GLOBS,
  ALL_JS_GLOBS,
  ALL_TS_GLOBS,
} from "./lint/constants.mjs";
import { BASE_OPINIONATED_RULES } from "./lint/rules/base_opinionated_rules.mjs";
import { TS_OPINIONATED_RULES } from "./lint/rules/ts/index.mjs";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const TEST_RELAXED_RULES = {
  complexity: "off",
  "max-lines": "off",
  "max-lines-per-function": "off",
  "max-depth": "off",
  "max-nested-callbacks": "off",
};

const TS_TEST_RELAXED_RULES = {
  ...TEST_RELAXED_RULES,
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-return": "off",
};

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "package-lock.json", "tokens/**"],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    files: ALL_CODE_GLOBS,
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      sourceType: "module",
    },
    rules: BASE_OPINIONATED_RULES,
  },
  {
    files: ["eslint.config.mjs", ...ALL_JS_GLOBS],
    extends: [js.configs.recommended],
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ALL_TS_GLOBS,
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ALL_TS_GLOBS,
  })),
  {
    files: ALL_TS_GLOBS,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.main.json", "./tsconfig.renderer.json"],
        tsconfigRootDir: ROOT_DIR,
      },
    },
  },
  {
    files: ALL_TS_GLOBS,
    rules: TS_OPINIONATED_RULES,
  },
  {
    files: ["renderer/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  jsdoc({
    files: ALL_JS_GLOBS,
    config: "flat/recommended-typescript-flavor-error",
  }),
  jsdoc({
    files: ALL_TS_GLOBS,
    config: "flat/recommended-typescript-error",
    rules: {
      "jsdoc/require-jsdoc": "error",
      "jsdoc/require-description": "error",
    },
  }),
  {
    files: ["tests/**/*.mjs", "tests/**/*.js"],
    rules: TEST_RELAXED_RULES,
  },
  {
    files: ["tests/**/*.ts"],
    rules: TS_TEST_RELAXED_RULES,
  },
]);
