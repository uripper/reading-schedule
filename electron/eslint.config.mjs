import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const ALL_JS_GLOBS = ["**/*.js", "**/*.mjs"];
const ALL_TS_GLOBS = ["**/*.ts"];
const ALL_CODE_GLOBS = ["eslint.config.mjs", ...ALL_JS_GLOBS, ...ALL_TS_GLOBS];
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED_CONSOLE_METHODS = [
  "assert",
  "clear",
  "count",
  "group",
  "groupCollapsed",
  "groupEnd",
  "info",
  "table",
  "time",
  "timeEnd",
  "trace",
];

const BASE_OPINIONATED_RULES = {
  complexity: ["error", 10],
  curly: ["error", "all"],
  eqeqeq: ["error", "always"],
  "max-lines": [
    "error",
    {
      max: 200,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "max-statements-per-line": [
    "error",
    {
      max: 1,
    },
  ],
  "no-console": [
    "error",
    {
      allow: ALLOWED_CONSOLE_METHODS,
    },
  ],
  "no-else-return": [
    "error",
    {
      allowElseIf: false,
    },
  ],
  "no-inner-declarations": ["error", "functions"],
  "no-multi-assign": "error",
  "no-ternary": "error",
  "no-void": [
    "error",
    {
      allowAsStatement: false,
    },
  ],
  "object-shorthand": ["error", "always"],
  "one-var": ["error", "never"],
  "prefer-const": "error",
  "prefer-object-has-own": "error",
};

const TS_OPINIONATED_RULES = {
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      prefer: "type-imports",
      fixStyle: "inline-type-imports",
    },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/require-array-sort-compare": [
    "error",
    {
      ignoreStringArrays: false,
    },
  ],
};

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "package-lock.json",
      "tokens/**",
    ],
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
  ...tseslint.configs.recommended.map(config => ({
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
  {
    files: ["tests/**/*.mjs"],
    rules: {
      complexity: "off",
      "max-lines": "off",
    },
  },
]);
