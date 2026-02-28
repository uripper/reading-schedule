import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import { jsdoc } from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

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
    "max-depth": "off",
    "max-lines": "off",
    "max-lines-per-function": "off",
    "max-nested-callbacks": "off",
};

const TS_TEST_RELAXED_RULES = {
    ...TEST_RELAXED_RULES,
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
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
        extends: [js.configs.recommended],
        files: ["eslint.config.mjs", ...ALL_JS_GLOBS],
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
        files: ["types/**/*.ts"],
        rules: {
            "max-lines": "off",
        },
    },
    {
        files: ["renderer/**/*.ts"],
        languageOptions: {
            globals: globals.browser,
        },
    },
    jsdoc({
        config: "flat/recommended-typescript-flavor-error",
        files: ALL_JS_GLOBS,
    }),
    jsdoc({
        config: "flat/recommended-typescript-error",
        files: ALL_TS_GLOBS,
        rules: {
            "jsdoc/require-description": "error",
            "jsdoc/require-jsdoc": "error",
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
