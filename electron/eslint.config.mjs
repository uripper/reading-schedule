/* eslint-disable max-lines */
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { jsdoc } from "eslint-plugin-jsdoc";

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
  // --- correctness / logic ---
  "accessor-pairs": [
    "error",
    {
      setWithoutGet: true,
      getWithoutSet: false,
    },
  ],
  "array-callback-return": [
    "error",
    {
      allowImplicit: false,
      checkForEach: true,
    },
  ],
  "block-scoped-var": "error",
  "consistent-return": [
    "error",
    {
      treatUndefinedAsUnspecified: false,
    },
  ],
  complexity: ["error", 10],
  curly: ["error", "all"],
  "default-case-last": "error",
  "default-param-last": "error",
  eqeqeq: ["error", "always"],
  "guard-for-in": "error",
  "no-alert": "error",
  "no-array-constructor": "error",
  "no-caller": "error",
  "no-constructor-return": "error",
  "no-else-return": [
    "error",
    {
      allowElseIf: false,
    },
  ],
  "no-empty-function": "error",
  "no-implied-eval": "error",
  "no-inner-declarations": ["error", "functions"],
  "no-loop-func": "error",
  "no-multi-assign": "error",
  "no-param-reassign": [
    "error",
    {
      props: true,
    },
  ],
  "no-promise-executor-return": "error",
  "no-return-assign": ["error", "always"],
  "no-self-compare": "error",
  "no-shadow": "error",
  "no-ternary": "error",
  "no-unreachable-loop": "error",
  "no-unused-expressions": [
    "error",
    {
      allowShortCircuit: false,
      allowTernary: false,
      allowTaggedTemplates: false,
    },
  ],
  "no-use-before-define": [
    "error",
    {
      functions: false,
      classes: true,
      variables: true,
    },
  ],
  "no-useless-call": "error",
  "no-useless-computed-key": "error",
  "no-useless-concat": "error",
  "no-useless-constructor": "error",
  "no-useless-rename": "error",
  "no-useless-return": "error",
  "no-void": [
    "error",
    {
      allowAsStatement: false,
    },
  ],
  "prefer-promise-reject-errors": "error",
  "require-await": "error",

  // --- readability / maintainability ---
  "dot-notation": ["error", { allowKeywords: true }],
  "grouped-accessor-pairs": ["error", "getBeforeSet"],
  "logical-assignment-operators": ["error", "always"],
  "max-classes-per-file": ["error", 1],
  "max-depth": ["error", 4],
  "max-lines": [
    "error",
    {
      max: 200,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "max-lines-per-function": [
    "error",
    {
      max: 80,
      skipBlankLines: true,
      skipComments: true,
      IIFEs: true,
    },
  ],
  "max-nested-callbacks": ["error", 3],
  "max-params": ["error", 4],
  "max-statements-per-line": [
    "error",
    {
      max: 1,
    },
  ],
  "new-cap": "error",
  "no-console": [
    "error",
    {
      allow: ALLOWED_CONSOLE_METHODS,
    },
  ],
  "no-duplicate-imports": [
    "error",
    {
      includeExports: true,
    },
  ],
  "no-implicit-coercion": [
    "error",
    {
      boolean: false,
      number: true,
      string: true,
      disallowTemplateShorthand: true,
    },
  ],
  "no-implicit-globals": "error",
  "no-lonely-if": "error",
  "no-negated-condition": "error",
  "no-new-wrappers": "error",
  "no-script-url": "error",
  "object-shorthand": ["error", "always"],
  "one-var": ["error", "never"],
  "operator-assignment": ["error", "always"],
  "prefer-arrow-callback": [
    "error",
    {
      allowNamedFunctions: false,
      allowUnboundThis: true,
    },
  ],
  "prefer-const": "error",
  "prefer-exponentiation-operator": "error",
  "prefer-numeric-literals": "error",
  "prefer-object-has-own": "error",
  "prefer-object-spread": "error",
  "prefer-rest-params": "error",
  "prefer-spread": "error",
  "prefer-template": "error",
  radix: ["error", "always"],
  "symbol-description": "error",
  yoda: ["error", "never"],
};

const TS_OPINIONATED_RULES = {
  // disable overlapping core rules in TS files
  "default-param-last": "off",
  "dot-notation": "off",
  "no-array-constructor": "off",
  "no-empty-function": "off",
  "no-implied-eval": "off",
  "no-loop-func": "off",
  "no-shadow": "off",
  "no-unused-expressions": "off",
  "no-unused-vars": "off",
  "no-use-before-define": "off",
  "no-useless-constructor": "off",
  "prefer-promise-reject-errors": "off",
  "require-await": "off",

  // --- TS-specific consistency / hygiene ---
  "@typescript-eslint/adjacent-overload-signatures": "error",
  "@typescript-eslint/array-type": [
    "error",
    {
      default: "array-simple",
    },
  ],
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-check": false,
      "ts-expect-error": "allow-with-description",
      "ts-ignore": true,
      "ts-nocheck": true,
      minimumDescriptionLength: 10,
    },
  ],
  "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
  "@typescript-eslint/consistent-type-exports": [
    "error",
    {
      fixMixedExportsWithInlineTypeSpecifier: true,
    },
  ],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      prefer: "type-imports",
      fixStyle: "inline-type-imports",
    },
  ],
  "@typescript-eslint/explicit-function-return-type": [
    "error",
    {
      allowExpressions: true,
      allowHigherOrderFunctions: true,
      allowTypedFunctionExpressions: true,
    },
  ],
  "@typescript-eslint/explicit-member-accessibility": [
    "error",
    {
      accessibility: "explicit",
    },
  ],
  "@typescript-eslint/method-signature-style": ["error", "method"],

  // --- TS naming discipline ---
  "@typescript-eslint/naming-convention": [
    "error",
    {
      selector: "default",
      format: ["camelCase"],
      leadingUnderscore: "allow",
      trailingUnderscore: "forbid",
    },
    {
      selector: "variable",
      format: ["camelCase", "UPPER_CASE", "PascalCase"],
      leadingUnderscore: "allow",
      trailingUnderscore: "forbid",
    },
    {
      selector: "parameter",
      format: ["camelCase"],
      leadingUnderscore: "allow",
      trailingUnderscore: "forbid",
    },
    {
      selector: "function",
      format: ["camelCase", "PascalCase"],
    },
    {
      selector: "typeLike",
      format: ["PascalCase"],
    },
    {
      selector: "enumMember",
      format: ["UPPER_CASE", "PascalCase"],
    },
    {
      // allow API payload keys, JSON-style names, etc.
      selector: "property",
      format: null,
    },
  ],

  

  // --- TS safety / correctness (type-aware) ---
  "@typescript-eslint/no-confusing-void-expression": "error",
  "@typescript-eslint/no-empty-function": [
    "error",
    {
      allow: ["constructors"],
    },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-for-in-array": "error",
  "@typescript-eslint/no-implied-eval": "error",
  "@typescript-eslint/no-import-type-side-effects": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/no-redundant-type-constituents": "error",
  "@typescript-eslint/no-shadow": "error",
  "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
  "@typescript-eslint/no-unnecessary-condition": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unused-expressions": [
    "error",
    {
      allowShortCircuit: false,
      allowTernary: false,
      allowTaggedTemplates: false,
    },
  ],
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/no-use-before-define": "error",
  "@typescript-eslint/no-useless-constructor": "error",
  "@typescript-eslint/non-nullable-type-assertion-style": "error",
  "@typescript-eslint/prefer-for-of": "error",
  "@typescript-eslint/prefer-function-type": "error",
  "@typescript-eslint/prefer-includes": "error",
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/prefer-promise-reject-errors": "error",
  "@typescript-eslint/prefer-readonly": "error",
  "@typescript-eslint/prefer-return-this-type": "error",
  "@typescript-eslint/promise-function-async": "error",
  "@typescript-eslint/require-array-sort-compare": [
    "error",
    {
      ignoreStringArrays: false,
    },
  ],
  "@typescript-eslint/require-await": "error",
  "@typescript-eslint/return-await": ["error", "always"],
  "@typescript-eslint/switch-exhaustiveness-check": "error",
  "@typescript-eslint/unbound-method": [
    "error",
    {
      ignoreStatic: true,
    },
  ],
  "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
};

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "package-lock.json", "tokens/**"],
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
  ...tseslint.configs.recommended.map((config) => ({
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
      // Optional: if you want docs REQUIRED, not just validated when present
      "jsdoc/require-jsdoc": "error",
      "jsdoc/require-description": "error",
    },
  }),
  {
    files: ["tests/**/*.mjs", "tests/**/*.js"],
    rules: {
      complexity: "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-depth": "off",
      "max-nested-callbacks": "off",
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      complexity: "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-depth": "off",
      "max-nested-callbacks": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
]);
