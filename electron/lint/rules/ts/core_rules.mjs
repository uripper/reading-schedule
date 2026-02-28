const TS_CORE_DISABLED_RULES = {
    "default-param-last": "off",
    "no-array-constructor": "off",
    "no-empty-function": "off",
    "no-negated-condition": "off",
    "no-useless-constructor": "off",
    "prefer-promise-reject-errors": "off",
    "require-await": "off",
};

const TS_CONSISTENCY_RULES = {
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
    "@typescript-eslint/ban-ts-comment": [
        "error",
        {
            minimumDescriptionLength: 10,
            "ts-check": false,
            "ts-expect-error": "allow-with-description",
            "ts-ignore": true,
            "ts-nocheck": true,
        },
    ],
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
    ],
    "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", prefer: "type-imports" },
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
        { accessibility: "explicit" },
    ],
    "@typescript-eslint/method-signature-style": ["error", "method"],
    "@typescript-eslint/no-inferrable-types": "error",
};

export const TS_CORE_RULES = {
    ...TS_CORE_DISABLED_RULES,
    ...TS_CONSISTENCY_RULES,
};
