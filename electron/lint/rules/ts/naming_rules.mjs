export const TS_NAMING_CONVENTION_RULES = {
    "@typescript-eslint/naming-convention": [
        "error",
        {
            format: ["camelCase"],
            leadingUnderscore: "allow",
            selector: "default",
            trailingUnderscore: "forbid",
        },
        {
            format: ["camelCase", "UPPER_CASE", "PascalCase"],
            leadingUnderscore: "allow",
            selector: "variable",
            trailingUnderscore: "forbid",
        },
        {
            format: ["camelCase"],
            leadingUnderscore: "allow",
            selector: "parameter",
            trailingUnderscore: "forbid",
        },
        {
            format: ["camelCase", "PascalCase"],
            selector: "function",
        },
        {
            format: ["PascalCase"],
            selector: "typeLike",
        },
        {
            format: ["UPPER_CASE", "PascalCase"],
            selector: "enumMember",
        },
        {
            format: null,
            selector: "property",
        },
    ],
};
