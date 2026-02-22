import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const ALL_JS_GLOBS = ["**/*.js", "**/*.mjs"];
const ALL_TS_GLOBS = ["**/*.ts"];

const DOC_DECLARATION_CONTEXTS = [
  "ExportNamedDeclaration > TSInterfaceDeclaration",
  "ExportNamedDeclaration > TSTypeAliasDeclaration",
  "ExportNamedDeclaration > TSEnumDeclaration",
];

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
    files: ["eslint.config.mjs", ...ALL_JS_GLOBS],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ALL_TS_GLOBS,
  })),
  {
    files: ["renderer/**/*.ts"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [...ALL_TS_GLOBS, ...ALL_JS_GLOBS],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: "typescript",
      },
    },
    rules: {
      "jsdoc/check-tag-names": "error",
    },
  },
  {
    files: ["*.ts"],
    rules: {
      "jsdoc/require-file-overview": [
        "error",
        {
          tags: {
            file: {
              mustExist: true,
              initialCommentsOnly: true,
            },
          },
        },
      ],
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: {
            cjs: true,
            esm: true,
            ancestorsOnly: true,
          },
          require: {
            ClassDeclaration: true,
            FunctionDeclaration: true,
            MethodDefinition: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: DOC_DECLARATION_CONTEXTS,
        },
      ],
    },
  },
  {
    files: ["**/*.test.mjs", "tests/**/*.mjs", "scripts/**/*.mjs"],
    rules: {},
  },
]);
