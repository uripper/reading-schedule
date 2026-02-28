import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronRoot = path.resolve(__dirname, "..");
const tokenSourcePath = path.join(electronRoot, "tokens", "dtcg.tokens.json");
const outputCssPath = path.join(
	electronRoot,
	"styles",
	"generated",
	"tokens.css",
);
const outputTsPath = path.join(electronRoot, "tokens", "dist", "tokens.ts");
const outputJsonPath = path.join(
	electronRoot,
	"tokens",
	"dist",
	"tokens.resolved.json",
);

/**
 * Checks whether a token tree node is a DTCG token leaf.
 * @param {unknown} node Candidate token node.
 * @returns {boolean} True when node exposes a `$value` field.
 */
function isTokenLeaf(node) {
	return Boolean(
		node && typeof node === "object" && Object.hasOwn(node, "$value"),
	);
}

/**
 * Flattens nested token objects into dotted-path token map.
 * @param {unknown} node Current tree node.
 * @param {string[]} pathParts Current token path segments.
 * @param {Map<string, unknown>} map Output flat token map.
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
	for (const [key, value] of Object.entries(node)) {
		if (key.startsWith("$")) {
			continue;
		}
		flattenTokens(value, [...pathParts, key], map);
	}
	return map;
}

/**
 * Resolves alias token values like `{semantic.light.bg}`.
 * @param {unknown} rawValue Raw token value.
 * @param {(key: string) => unknown} resolver Alias resolver callback.
 * @returns {unknown} Resolved concrete token value.
 */
function resolveValue(rawValue, resolver) {
	if (typeof rawValue !== "string") {
		return rawValue;
	}
	const alias = rawValue.match(/^\{([^}]+)\}$/);
	if (!alias) {
		return rawValue;
	}
	return resolver(alias[1]);
}

/**
 * Creates memoized resolver for flattened token map aliases.
 * @param {Map<string, unknown>} flatMap Flattened token map.
 * @returns {(pathKey: string, stack?: Set<string>) => unknown} Alias resolver.
 */
function createResolver(flatMap) {
	const cache = new Map();

	/**
	 * Resolves a single token path with circular-reference detection.
	 * @param {string} pathKey Token path key.
	 * @param {Set<string>} stack Resolution stack for cycle detection.
	 * @returns {unknown} Resolved token value.
	 */
	function resolve(pathKey, stack = new Set()) {
		if (cache.has(pathKey)) {
			return cache.get(pathKey);
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
		const value = resolveValue(flatMap.get(pathKey), (nextKey) =>
			resolve(nextKey, stack),
		);
		stack.delete(pathKey);
		cache.set(pathKey, value);
		return value;
	}

	return resolve;
}

/**
 * Converts dotted token key into CSS custom property name.
 * @param {string} tokenPath Token key path.
 * @returns {string} CSS variable name.
 */
function cssVarName(tokenPath) {
	return `--token-${tokenPath.replaceAll(".", "-")}`;
}

/**
 * Converts semantic token key into app-scoped CSS custom property name.
 * @param {string} tokenPath Semantic token key path.
 * @returns {string} App CSS variable name.
 */
function appVarName(tokenPath) {
	return `--app-${tokenPath.replaceAll(".", "-")}`;
}

/**
 * Writes text file and creates parent directory when needed.
 * @param {string} filePath Target file path.
 * @param {string} content File content.
 */
function writeFile(filePath, content) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, "utf8");
}

const source = JSON.parse(fs.readFileSync(tokenSourcePath, "utf8"));
const flat = flattenTokens(source);
const resolve = createResolver(flat);

const resolved = Object.fromEntries(
	[...flat.keys()].sort().map((key) => [key, resolve(key)]),
);

const semanticLight = Object.entries(resolved)
	.filter(([key]) => key.startsWith("semantic.light."))
	.map(([key, value]) => [key.replace("semantic.light.", ""), value]);

const semanticDark = Object.entries(resolved)
	.filter(([key]) => key.startsWith("semantic.dark."))
	.map(([key, value]) => [key.replace("semantic.dark.", ""), value]);

const tokenEntries = Object.entries(resolved);

const cssLines = [
	"/* Auto-generated from tokens/dtcg.tokens.json. Do not edit by hand. */",
	":root {",
	...tokenEntries.map(([key, value]) => `  ${cssVarName(key)}: ${value};`),
	...semanticDark.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
	"}",
	"",
	':root[data-theme="dark"] {',
	...semanticDark.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
	"}",
	"",
	':root[data-theme="light"] {',
	...semanticLight.map(([key, value]) => `  ${appVarName(key)}: ${value};`),
	"}",
	"",
	"@media (prefers-color-scheme: dark) {",
	'  :root[data-theme="system"] {',
	...semanticDark.map(([key, value]) => `    ${appVarName(key)}: ${value};`),
	"  }",
	"}",
	"",
	"@media (prefers-color-scheme: light) {",
	'  :root[data-theme="system"] {',
	...semanticLight.map(([key, value]) => `    ${appVarName(key)}: ${value};`),
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

const tsLines = [
	"// Auto-generated from tokens/dtcg.tokens.json. Do not edit by hand.",
	"export const tokenVarByName = {",
	...Object.keys(resolved)
		.sort()
		.map((key) => `  "${key}": "var(${cssVarName(key)})",`),
	"} as const;",
	"",
	"export type TokenName = keyof typeof tokenVarByName;",
	"",
	"export const semanticTokenVarByName = {",
	...semanticDark
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name]) => `  "${name}": "var(${appVarName(name)})",`),
	"} as const;",
	"",
	"export type SemanticTokenName = keyof typeof semanticTokenVarByName;",
	"",
].join("\n");

writeFile(outputCssPath, cssLines);
writeFile(outputTsPath, tsLines);
writeFile(outputJsonPath, `${JSON.stringify(resolved, null, 2)}\n`);

process.stdout.write(
	`Built tokens: ${path.relative(electronRoot, outputCssPath)} and ${path.relative(electronRoot, outputTsPath)}\n`,
);
