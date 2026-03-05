import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const Filename = fileURLToPath(import.meta.url);
const Dirname = path.dirname(Filename);
const ELECTRON_ROOT = path.resolve(Dirname, "..");
const TOKEN_SOURCE_PATH = path.join(
    ELECTRON_ROOT,
    "tokens",
    "dtcg.tokens.json",
);
const OUTPUT_CSS_PATH = path.join(
    ELECTRON_ROOT,
    "styles",
    "generated",
    "tokens.css",
);
const OUTPUT_TS_PATH = path.join(ELECTRON_ROOT, "tokens", "dist", "tokens.ts");
const OUTPUT_JSON_PATH = path.join(
    ELECTRON_ROOT,
    "tokens",
    "dist",
    "tokens.resolved.json",
);

/**
 * Checks whether a token tree node is a DTCG token leaf.
 * @param {unknown} node - Candidate token node.
 * @returns {boolean} True when node exposes a `$value` field.
 */
function isTokenLeaf(node) {
    return Boolean(
        node && typeof node === "object" && Object.hasOwn(node, "$value"),
    );
}

/**
 * Flattens nested token objects into dotted-path token map.
 * @param {unknown} node - Current tree node.
 * @param {string[]} pathParts - Current token path segments.
 * @param {Map<string, unknown>} map - Output flat token map.
 * @returns {Map<string, unknown>} Flattened token map.
 */
function flattenTokens(node, pathParts = [], map = new Map()) {
    if (!node || typeof node !== "object") {
        return map;
    }
    if (isTokenLeaf(node)) {
        map.set(pathParts.join("."), node.$value);
        return map;
    }
    for (const [KEY, VALUE] of Object.entries(node)) {
        if (KEY.startsWith("$")) {
            continue;
        }
        flattenTokens(VALUE, [...pathParts, KEY], map);
    }
    return map;
}

/**
 * Resolves alias token values like `{semantic.light.bg}`.
 * @param {unknown} rawValue - Raw token value.
 * @param {(key: string) => unknown} resolver - Alias resolver callback.
 * @returns {unknown} Resolved concrete token value.
 */
function resolveValue(rawValue, resolver) {
    if (typeof rawValue !== "string") {
        return rawValue;
    }
    const ALIAS = rawValue.match(/^\{([^}]+)\}$/);
    if (!ALIAS) {
        return rawValue;
    }
    return resolver(ALIAS[1]);
}

/**
 * Creates memoized resolver for flattened token map aliases.
 * @param {Map<string, unknown>} flatMap - Flattened token map.
 * @returns {(pathKey: string, stack?: Set<string>) => unknown} Alias resolver.
 */
function createResolver(flatMap) {
    const CACHE = new Map();

    /**
     * Resolves a single token path with circular-reference detection.
     * @param {string} pathKey - Token path key.
     * @param {Set<string>} stack - Resolution stack for cycle detection.
     * @returns {unknown} Resolved token value.
     */
    function resolve(pathKey, stack = new Set()) {
        if (CACHE.has(pathKey)) {
            return CACHE.get(pathKey);
        }
        if (stack.has(pathKey)) {
            throw new Error(
                `Circular token alias detected: ${[...stack, pathKey].join(" -> ")}`,
            );
        }
        if (!flatMap.has(pathKey)) {
            throw new Error(`Unknown token alias: ${pathKey}`);
        }
        stack.add(pathKey);
        const VALUE = resolveValue(flatMap.get(pathKey), (nextKey) =>
            resolve(nextKey, stack),
        );
        stack.delete(pathKey);
        CACHE.set(pathKey, VALUE);
        return VALUE;
    }

    return resolve;
}

/**
 * Converts dotted token key into CSS custom property name.
 * @param {string} tokenPath - Token key path.
 * @returns {string} CSS variable name.
 */
function cssVarName(tokenPath) {
    return `--token-${tokenPath.replaceAll(".", "-")}`;
}

/**
 * Converts semantic token key into app-scoped CSS custom property name.
 * @param {string} tokenPath - Semantic token key path.
 * @returns {string} App CSS variable name.
 */
function appVarName(tokenPath) {
    return `--app-${tokenPath.replaceAll(".", "-")}`;
}

/**
 * Writes text file and creates parent directory when needed.
 * @param {string} filePath - Target file path.
 * @param {string} content - File content.
 */
function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

const SOURCE = JSON.parse(fs.readFileSync(TOKEN_SOURCE_PATH, "utf8"));
const FLAT = flattenTokens(SOURCE);
const RESOLVE = createResolver(FLAT);

const RESOLVED = Object.fromEntries(
    [...FLAT.keys()].sort().map((key) => [key, RESOLVE(key)]),
);

const SEMANTIC_LIGHT = Object.entries(RESOLVED)
    .filter(([key]) => key.startsWith("semantic.light."))
    .map(([key, value]) => [key.replace("semantic.light.", ""), value]);

const SEMANTIC_DARK = Object.entries(RESOLVED)
    .filter(([key]) => key.startsWith("semantic.dark."))
    .map(([key, value]) => [key.replace("semantic.dark.", ""), value]);

const TOKEN_ENTRIES = Object.entries(RESOLVED);

const CSS_LINES = [
    "/* Auto-generated from tokens/dtcg.tokens.json. Do not edit by hand. */",
    ":root {",
    ...TOKEN_ENTRIES.map(([key, value]) => `  ${cssVarName(key)}: ${value};`),
    ...SEMANTIC_DARK.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
    "}",
    "",
    ':root[data-theme="dark"] {',
    ...SEMANTIC_DARK.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
    "}",
    "",
    ':root[data-theme="light"] {',
    ...SEMANTIC_LIGHT.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '  :root[data-theme="system"] {',
    ...SEMANTIC_DARK.map(([key, value]) => `    ${appVarName(key)}: ${value};`),
    "  }",
    "}",
    "",
    "@media (prefers-color-scheme: light) {",
    '  :root[data-theme="system"] {',
    ...SEMANTIC_LIGHT.map(
        ([key, value]) => `    ${appVarName(key)}: ${value};`,
    ),
    "  }",
    "}",
    "",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    "    --token-motion-duration-fast: 0ms;",
    "    --token-motion-duration-base: 0ms;",
    "    --token-motion-duration-slow: 0ms;",
    "  }",
    "}",
    "",
].join("\n");

const TS_LINES = [
    "// Auto-generated from tokens/dtcg.tokens.json. Do not edit by hand.",
    "export const tokenVarByName = {",
    ...Object.keys(RESOLVED)
        .sort()
        .map((key) => `  "${key}": "var(${cssVarName(key)})",`),
    "} as const;",
    "",
    "export type TokenName = keyof typeof tokenVarByName;",
    "",
    "export const semanticTokenVarByName = {",
    ...SEMANTIC_DARK.sort(([a], [b]) => a.localeCompare(b)).map(
        ([name]) => `  "${name}": "var(${appVarName(name)})",`,
    ),
    "} as const;",
    "",
    "export type SemanticTokenName = keyof typeof semanticTokenVarByName;",
    "",
].join("\n");

writeFile(OUTPUT_CSS_PATH, CSS_LINES);
writeFile(OUTPUT_TS_PATH, TS_LINES);
writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(RESOLVED, null, 2)}\n`);

process.stdout.write(
    `Built tokens: ${path.relative(ELECTRON_ROOT, OUTPUT_CSS_PATH)} and ${path.relative(ELECTRON_ROOT, OUTPUT_TS_PATH)}\n`,
);
