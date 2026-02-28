export const TS_NAMING_CONVENTION_RULES = {
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
			selector: "property",
			format: null,
		},
	],
};
