// eslint.config.mjs

import tsParser from "@typescript-eslint/parser";
import jsdoc from "eslint-plugin-jsdoc";
import tsdoc from "eslint-plugin-tsdoc";

export default [
    jsdoc.configs["flat/recommended-typescript-error"],
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            jsdoc,
            tsdoc,
        },
        rules: {
            "jsdoc/check-param-names": "off",
            "jsdoc/require-description": "error",

            "jsdoc/require-jsdoc": [
                "error",
                {
                    contexts: [
                        "TSInterfaceDeclaration",
                        "TSTypeAliasDeclaration",
                        "TSMethodSignature",
                        "TSPropertySignature",
                        "TSEnumDeclaration",
                    ],
                    publicOnly: { ancestorsOnly: true, esm: true },
                    require: {
                        ArrowFunctionExpression: true,
                        ClassDeclaration: true,
                        ClassExpression: true,
                        FunctionDeclaration: true,
                        FunctionExpression: true,
                        MethodDefinition: true,
                    },
                },
            ],
            "jsdoc/require-param": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns": "error",
            "jsdoc/require-returns-description": "error",
            "tsdoc/syntax": "error",
        },
    },
];
