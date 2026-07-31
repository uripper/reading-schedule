/**
 * Verifies shared JavaScript tooling and Tauri plugin dependency parity.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const PACKAGE_MANIFEST_PATHS = [
    "package.json",
    "apps/bartleby/package.json",
    "apps/website/package.json",
    "packages/contracts/package.json",
    "packages/frontend/package.json",
];
const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies"];
const SHARED_DEPENDENCIES = ["@types/node", "tslog", "typescript", "vite"];
const CARGO_MANIFEST_PATH = "apps/bartleby/src-tauri/Cargo.toml";
const CARGO_LOCK_PATH = "apps/bartleby/src-tauri/Cargo.lock";
const TAURI_PACKAGE_PATH = "apps/bartleby/package.json";
const TAURI_PLUGIN_PAIRS = [
    ["@tauri-apps/plugin-opener", "tauri-plugin-opener"],
    ["@tauri-apps/plugin-process", "tauri-plugin-process"],
    ["@tauri-apps/plugin-updater", "tauri-plugin-updater"],
];

/** Resolves a repository-relative path. */
function absolutePath(relativePath) {
    return path.join(REPOSITORY_ROOT, relativePath);
}

/** Reads one repository JSON file. */
function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(absolutePath(relativePath), "utf8"));
}

/** Reads a dependency declaration from either supported section. */
function dependencySpecifier(manifest, dependencyName) {
    for (const SECTION of DEPENDENCY_SECTIONS) {
        const SPECIFIER = manifest[SECTION]?.[dependencyName];
        if (typeof SPECIFIER === "string") {
            return SPECIFIER;
        }
    }
    return undefined;
}

/** Collects all declarations for one shared JavaScript dependency. */
function javascriptDeclarations(dependencyName) {
    const DECLARATIONS = [];
    for (const MANIFEST_PATH of PACKAGE_MANIFEST_PATHS) {
        const SPECIFIER = dependencySpecifier(
            readJson(MANIFEST_PATH),
            dependencyName,
        );
        if (SPECIFIER !== undefined) {
            DECLARATIONS.push([MANIFEST_PATH, SPECIFIER]);
        }
    }
    return DECLARATIONS;
}

/** Reports mismatched shared JavaScript dependency declarations. */
function checkSharedDependency(dependencyName, errors) {
    const DECLARATIONS = javascriptDeclarations(dependencyName);
    const EXPECTED = DECLARATIONS[0]?.[1];
    const MISMATCHES = DECLARATIONS.filter((declaration) => {
        return declaration[1] !== EXPECTED;
    });
    if (MISMATCHES.length === 0) {
        return;
    }
    const DETAILS = DECLARATIONS.map((declaration) => {
        return `${declaration[0]}=${declaration[1]}`;
    }).join(", ");
    errors.push(`${dependencyName}: ${DETAILS}`);
}

/** Escapes a string for use inside a regular expression. */
function escapePattern(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Reads a direct Cargo dependency's declared version. */
function cargoDependencyVersion(manifest, dependencyName) {
    const NAME = escapePattern(dependencyName);
    const PATTERN = new RegExp(
        `^${NAME}\\s*=\\s*(?:"([^"]+)"|\\{[^\\n]*version\\s*=\\s*"([^"]+)")`,
        "m",
    );
    const MATCH = manifest.match(PATTERN);
    if (MATCH === null) {
        throw new Error(`Cargo dependency was not found: ${dependencyName}`);
    }
    return MATCH[1] ?? MATCH[2];
}

/** Removes a package-manager range marker before cross-ecosystem comparison. */
function bareVersion(specifier) {
    return specifier.replace(/^[=~^]/, "");
}

/** Reads one package version from the Cargo lockfile. */
function cargoLockedVersion(lockfile, dependencyName) {
    const NAME = escapePattern(dependencyName);
    const PATTERN = new RegExp(
        `\\[\\[package\\]\\]\\nname = "${NAME}"\\nversion = "([^"]+)"`,
        "m",
    );
    const MATCH = lockfile.match(PATTERN);
    if (MATCH === null) {
        throw new Error(`Cargo lock entry was not found: ${dependencyName}`);
    }
    return MATCH[1];
}

/** Reads every version participating in one Tauri plugin pair. */
function tauriPairVersions(pair, cargoSources) {
    const JAVASCRIPT_NAME = pair[0];
    const RUST_NAME = pair[1];
    const JAVASCRIPT_MANIFEST = readJson(TAURI_PACKAGE_PATH);
    const JAVASCRIPT_VERSION = dependencySpecifier(
        JAVASCRIPT_MANIFEST,
        JAVASCRIPT_NAME,
    );
    const RUST_VERSION = cargoDependencyVersion(
        cargoSources.manifest,
        RUST_NAME,
    );
    const LOCKED_VERSION = cargoLockedVersion(cargoSources.lock, RUST_NAME);
    return [JAVASCRIPT_VERSION, RUST_VERSION, LOCKED_VERSION];
}

/** Reports a mismatched JavaScript/Rust Tauri plugin pair. */
function checkTauriPair(pair, cargoSources, errors) {
    const JAVASCRIPT_NAME = pair[0];
    const RUST_NAME = pair[1];
    const VERSIONS = tauriPairVersions(pair, cargoSources);
    const JAVASCRIPT_VERSION = VERSIONS[0];
    if (JAVASCRIPT_VERSION === undefined) {
        errors.push(`${JAVASCRIPT_NAME}: JavaScript dependency is missing`);
        return;
    }
    const COMPARABLE_VERSIONS = [
        bareVersion(JAVASCRIPT_VERSION),
        bareVersion(VERSIONS[1]),
        VERSIONS[2],
    ];
    if (new Set(COMPARABLE_VERSIONS).size === 1) {
        return;
    }
    errors.push(
        `${JAVASCRIPT_NAME}=${JAVASCRIPT_VERSION}, ${RUST_NAME}=${VERSIONS[1]}, Cargo.lock=${VERSIONS[2]}`,
    );
}

/** Rejects installing pnpm as an application dependency. */
function checkPackageManagerOwnership(errors) {
    const ROOT_MANIFEST = readJson("package.json");
    const PNPM_DEPENDENCY = dependencySpecifier(ROOT_MANIFEST, "pnpm");
    const PACKAGE_MANAGER = ROOT_MANIFEST.packageManager;
    if (PNPM_DEPENDENCY !== undefined) {
        errors.push("pnpm must only be declared by the packageManager field");
    }
    if (
        typeof PACKAGE_MANAGER !== "string" ||
        !PACKAGE_MANAGER.startsWith("pnpm@")
    ) {
        errors.push("packageManager must declare the repository pnpm version");
    }
}

/** Runs all dependency consistency checks. */
function run() {
    const ERRORS = [];
    for (const DEPENDENCY_NAME of SHARED_DEPENDENCIES) {
        checkSharedDependency(DEPENDENCY_NAME, ERRORS);
    }
    const CARGO_SOURCES = {
        lock: fs.readFileSync(absolutePath(CARGO_LOCK_PATH), "utf8"),
        manifest: fs.readFileSync(absolutePath(CARGO_MANIFEST_PATH), "utf8"),
    };
    for (const PAIR of TAURI_PLUGIN_PAIRS) {
        checkTauriPair(PAIR, CARGO_SOURCES, ERRORS);
    }
    checkPackageManagerOwnership(ERRORS);
    if (ERRORS.length > 0) {
        throw new Error(
            `Dependency version mismatch:\n- ${ERRORS.join("\n- ")}`,
        );
    }
    process.stdout.write("Dependency versions are aligned.\n");
}

run();
