import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const TOKEN_SOURCE_PATH = path.join(ROOT, "tokens", "dtcg.tokens.json");
const OUTPUT_CSS_PATH = path.join(ROOT, "styles", "generated", "tokens.css");
const SEMANTIC_PREFIX = "semantic.";

function isObject(value) {
    if (value === null) {
        return false;
    }
    return typeof value === "object";
}

function isTokenLeaf(node) {
    if (!isObject(node)) {
        return false;
    }
    return Object.hasOwn(node, "$value");
}

function tokenBranchEntries(node) {
    return Object.entries(node).filter(([key]) => !key.startsWith("$"));
}

function flattenTokens(node, pathParts = [], output = new Map()) {
    if (!isObject(node)) {
        return output;
    }
    if (isTokenLeaf(node)) {
        output.set(pathParts.join("."), node.$value);
        return output;
    }
    for (const [KEY, VALUE] of tokenBranchEntries(node)) {
        flattenTokens(VALUE, [...pathParts, KEY], output);
    }
    return output;
}

function resolveAlias(rawValue, resolve) {
    if (typeof rawValue !== "string") {
        return rawValue;
    }
    const ALIAS = rawValue.match(/^\{([^}]+)\}$/);
    if (!ALIAS) {
        return rawValue;
    }
    return resolve(ALIAS[1]);
}

function resolveToken(context, pathKey, stack) {
    if (context.cache.has(pathKey)) {
        return context.cache.get(pathKey);
    }
    if (stack.has(pathKey)) {
        throw new Error(
            `Circular token alias detected: ${[...stack, pathKey].join(" -> ")}`,
        );
    }
    if (!context.flatMap.has(pathKey)) {
        throw new Error(`Unknown token alias: ${pathKey}`);
    }
    stack.add(pathKey);
    const RESOLVED_VALUE = resolveAlias(
        context.flatMap.get(pathKey),
        (nextKey) => {
            return resolveToken(context, nextKey, stack);
        },
    );
    stack.delete(pathKey);
    context.cache.set(pathKey, RESOLVED_VALUE);
    return RESOLVED_VALUE;
}

function resolvedEntries(flatMap) {
    const RESOLUTION_CONTEXT = { cache: new Map(), flatMap };
    return [...flatMap.keys()]
        .sort((left, right) => left.localeCompare(right))
        .map((pathKey) => {
            const VALUE = resolveToken(RESOLUTION_CONTEXT, pathKey, new Set());
            return [pathKey, VALUE];
        });
}

function cssVarName(tokenPath) {
    return `--token-${tokenPath.replaceAll(".", "-")}`;
}

function appVarName(tokenPath) {
    return `--app-${tokenPath.replaceAll(".", "-")}`;
}

function semanticEntries(tokenEntries, prefix) {
    return tokenEntries
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.replace(prefix, ""), value]);
}

function rootTokenLines(tokenEntries, semanticTokenEntries) {
    return [
        "/* Auto-generated from tokens/dtcg.tokens.json. Do not edit by hand. */",
        ":root {",
        ...tokenEntries.map(
            ([key, value]) => `  ${cssVarName(key)}: ${value};`,
        ),
        ...semanticTokenEntries.map(
            ([key, value]) => `  ${appVarName(key)}: ${value};`,
        ),
        "}",
        "",
    ];
}

function reducedMotionLines() {
    return [
        "@media (prefers-reduced-motion: reduce) {",
        "  :root {",
        "    --token-motion-duration-fast: 0ms;",
        "    --token-motion-duration-base: 0ms;",
        "    --token-motion-duration-slow: 0ms;",
        "  }",
        "}",
        "",
    ];
}

function cssLines(tokenEntries) {
    const SEMANTIC_ENTRIES = semanticEntries(tokenEntries, SEMANTIC_PREFIX);
    return [
        ...rootTokenLines(tokenEntries, SEMANTIC_ENTRIES),
        ...reducedMotionLines(),
    ].join("\n");
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

const SOURCE = JSON.parse(fs.readFileSync(TOKEN_SOURCE_PATH, "utf8"));
const FLAT_TOKENS = flattenTokens(SOURCE);
const TOKEN_ENTRIES = resolvedEntries(FLAT_TOKENS);

writeFile(OUTPUT_CSS_PATH, cssLines(TOKEN_ENTRIES));
process.stdout.write(
    `Built frontend tokens: ${path.relative(ROOT, OUTPUT_CSS_PATH)}\n`,
);
