/** Configures JavaScript and TypeScript linting and formatting for the workspace. */
import { defineConfig } from "vite-plus";

const SYNTAX_RESTRICTIONS = [
    {
        message: "Use a union or a const object instead of an enum.",
        selector: "TSEnumDeclaration",
    },
    {
        message: "Declare one variable per statement.",
        selector: "VariableDeclaration[declarations.length>1]",
    },
    {
        message: "Use named exports instead of export *.",
        selector: "ExportAllDeclaration[exported=null]",
    },
];

const NAMING_RESTRICTIONS = [
    {
        message: "Use CONSTANT_CASE or PascalCase for constants.",
        selector:
            "VariableDeclaration[kind='const'] > VariableDeclarator > Identifier.id[name!=/^(?:[A-Z][A-Z0-9_]*|[A-Z][A-Za-z0-9]*)$/]",
    },
    {
        message: "Use camelCase or snake_case for mutable variables.",
        selector:
            "VariableDeclaration[kind='let'] > VariableDeclarator > Identifier.id[name!=/^[a-z][a-z0-9_]*$|^[a-z][A-Za-z0-9]*$/]",
    },
    {
        message: "Use camelCase for function declarations.",
        selector:
            "FunctionDeclaration > Identifier.id[name!=/^[a-z][A-Za-z0-9]*$/]",
    },
    {
        message: "Use camelCase or snake_case for parameters.",
        selector:
            ":function > Identifier.params[name!=/^(?:_?[a-z][a-z0-9_]*|_?[a-z][A-Za-z0-9]*|_)$/]",
    },
    {
        message: "Use PascalCase for class and type declarations.",
        selector:
            ":matches(ClassDeclaration, TSInterfaceDeclaration, TSTypeAliasDeclaration) > Identifier.id[name!=/^[A-Z][A-Za-z0-9]*$/]",
    },
];

const MAX_COGNITIVE_COMPLEXITY = 5;
const MAX_CYCLOMATIC_COMPLEXITY = 9;
const MAX_FUNCTION_LINES = 20;
const MAX_PARAMETERS = 3;
const PRINT_WIDTH = 80;
const INDENT_WIDTH = 4;

export default defineConfig({
    fmt: {
        ignorePatterns: [
            "**/*.md",
            "**/*.toml",
            "**/*.yaml",
            "**/*.yml",
            // Both hosts derive their shells using the shared template's markup.
            "apps/bartleby/index.html",
            "packages/frontend/index.html",
            // The audit scripts use tab indentation.
            "scripts/style_audit.mjs",
            "scripts/style_audit.test.mjs",
            "scripts/style_audit/**",
        ],
        printWidth: PRINT_WIDTH,
        sortImports: {
            newlinesBetween: false,
            partitionByNewline: true,
        },
        sortPackageJson: false,
        tabWidth: INDENT_WIDTH,
    },
    lint: {
        jsPlugins: [
            "./scripts/lint/function-body-lines.mjs",
            "oxlint-plugin-complexity",
            { name: "eslint-js", specifier: "oxlint-plugin-eslint" },
        ],
        options: { typeAware: true },
        plugins: ["import", "node", "oxc", "typescript", "unicorn"],
        rules: {
            curly: "error",
            "no-console": [
                "error",
                {
                    allow: [
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
                    ],
                },
            ],
            "no-ternary": "error",
            "typescript/no-floating-promises": [
                "error",
                {
                    allowForKnownSafeCalls: [
                        {
                            from: "package",
                            name: ["test", "it", "describe"],
                            package: "node:test",
                        },
                    ],
                    ignoreVoid: false,
                },
            ],
            "no-void": "error",
            "typescript/no-explicit-any": "error",
        },
        overrides: [
            {
                env: { browser: true, node: true },
                files: ["**/*.{cjs,js,mjs}"],
                rules: { "no-undef": "error" },
            },
            {
                files: [
                    "apps/**/*.{js,mjs,ts,tsx}",
                    "packages/**/*.{js,mjs,ts,tsx}",
                ],
                rules: {
                    "complexity/complexity": [
                        "error",
                        {
                            cognitive: MAX_COGNITIVE_COMPLEXITY,
                            cyclomatic: MAX_CYCLOMATIC_COMPLEXITY,
                            enableExtraction: false,
                            minLines: 0,
                        },
                    ],
                    "default-param-last": "error",
                    "eslint-js/no-restricted-syntax": [
                        "error",
                        ...SYNTAX_RESTRICTIONS,
                    ],
                    "grouped-accessor-pairs": "error",
                    "guard-for-in": "error",
                    "import/no-commonjs": "error",
                    "import/no-default-export": "error",
                    "import/no-namespace": "error",
                    // Keep the 20-line target visible while reviewing counting differences.
                    "bartleby/function-body-lines": [
                        "warn",
                        MAX_FUNCTION_LINES,
                    ],
                    "max-params": ["error", MAX_PARAMETERS],
                    "no-alert": "error",
                    "no-await-in-loop": "error",
                    "no-else-return": "error",
                    "no-empty": "error",
                    "no-implicit-coercion": "error",
                    "no-param-reassign": "error",
                    "no-unused-expressions": "error",
                    "no-unused-vars": "error",
                    "no-useless-concat": "error",
                    "node/no-process-env": "error",
                    "object-shorthand": "error",
                    "oxc/no-accumulating-spread": "warn",
                    "oxc/no-barrel-file": "error",
                    "prefer-exponentiation-operator": "error",
                    "prefer-object-spread": "error",
                    "require-await": "warn",
                    "symbol-description": "error",
                    "typescript/consistent-type-exports": "warn",
                    "typescript/consistent-type-imports": [
                        "error",
                        { fixStyle: "separate-type-imports" },
                    ],
                    "typescript/no-misused-promises": "warn",
                    "typescript/no-namespace": "error",
                    "typescript/no-non-null-assertion": "error",
                    "typescript/no-restricted-types": [
                        "error",
                        {
                            types: {
                                "{}": "Use object, unknown, or an explicit structural type.",
                                Function:
                                    "Write an explicit callable signature.",
                                Object: "Use object, unknown, or an explicit structural type.",
                            },
                        },
                    ],
                    "typescript/no-unnecessary-condition": "warn",
                    "typescript/parameter-properties": "error",
                    "typescript/prefer-as-const": "error",
                    "typescript/prefer-nullish-coalescing": "warn",
                    "typescript/switch-exhaustiveness-check": "error",
                    "unicorn/filename-case": [
                        "warn",
                        {
                            cases: {
                                camelCase: true,
                                kebabCase: true,
                                pascalCase: true,
                                snakeCase: true,
                            },
                        },
                    ],
                    "unicorn/no-array-for-each": "warn",
                    yoda: "error",
                },
            },
            {
                files: ["apps/**/*.{js,mjs,ts}", "packages/**/*.{js,mjs,ts}"],
                rules: {
                    "eslint-js/no-restricted-syntax": [
                        "error",
                        ...SYNTAX_RESTRICTIONS,
                        ...NAMING_RESTRICTIONS,
                    ],
                },
            },
            {
                files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
                rules: { "typescript/explicit-member-accessibility": "error" },
            },
            {
                files: [
                    "apps/website/src/types/site-content.ts",
                    "packages/contracts/src/index.ts",
                    "packages/contracts/src/types_subfolders/types_app.ts",
                    "packages/frontend/src/types/types.ts",
                ],
                rules: {
                    // These public or shared entry points already re-export modules.
                    "eslint-js/no-restricted-syntax": [
                        "error",
                        SYNTAX_RESTRICTIONS[0],
                        SYNTAX_RESTRICTIONS[1],
                        ...NAMING_RESTRICTIONS,
                    ],
                    "oxc/no-barrel-file": "off",
                },
            },
            {
                files: ["**/vite.config.ts", "**/*.d.ts"],
                rules: { "import/no-default-export": "off" },
            },
        ],
    },
});
