/**
 * Keeps active Bartleby application/package versions aligned from one command.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const CHECK_ARGUMENT = "--check";
const ARGUMENT_SEPARATOR = "--";
const VERSION_PATTERN =
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const JSON_VERSION_FILES = [
    "package.json",
    "apps/bartleby/package.json",
    "apps/bartleby/src-tauri/tauri.conf.json",
    "apps/website/package.json",
    "packages/contracts/package.json",
    "packages/frontend/package.json",
];
const CARGO_MANIFEST_PATH = "apps/bartleby/src-tauri/Cargo.toml";
const CARGO_LOCK_PATH = "apps/bartleby/src-tauri/Cargo.lock";
const CARGO_LOCK_VERSION_PATTERN =
    /(?<=\[\[package\]\]\nname = "bartleby_app"\nversion = ")[^"]+(?=")/;

/** Resolves a repository-relative path. */
function absolutePath(relativePath) {
    return path.join(REPOSITORY_ROOT, relativePath);
}

/** Reads and parses a repository JSON file. */
function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(absolutePath(relativePath), "utf8"));
}

/** Writes consistently formatted repository JSON. */
function writeJson(relativePath, payload) {
    const SERIALIZED = `${JSON.stringify(payload, null, 4)}\n`;
    fs.writeFileSync(absolutePath(relativePath), SERIALIZED, "utf8");
}

/** Reads the root package version used as the canonical version. */
function canonicalVersion() {
    return readJson("package.json").version;
}

/** Reads the requested command-line version or check flag. */
function requestedVersion() {
    const ARGUMENTS = process.argv.slice(2);
    if (ARGUMENTS[0] === ARGUMENT_SEPARATOR) {
        return ARGUMENTS[1];
    }
    return ARGUMENTS[0];
}

/** Rejects missing or invalid semantic versions. */
function assertVersion(version) {
    if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
        throw new Error(
            "Version must be valid SemVer, for example 0.1.3-alpha.",
        );
    }
}

/** Reads the top-level version from one JSON file. */
function jsonVersion(relativePath) {
    return readJson(relativePath).version;
}

/** Reads the Rust crate package version. */
function cargoVersion() {
    const MANIFEST = fs.readFileSync(absolutePath(CARGO_MANIFEST_PATH), "utf8");
    const MATCH = MANIFEST.match(/^version = "([^"]+)"$/m);
    if (MATCH === null) {
        throw new Error("Cargo package version was not found.");
    }
    return MATCH[1];
}

/** Reads the Rust application version locked for release builds. */
function cargoLockVersion() {
    const LOCKFILE = fs.readFileSync(absolutePath(CARGO_LOCK_PATH), "utf8");
    const MATCH = LOCKFILE.match(CARGO_LOCK_VERSION_PATTERN);
    if (MATCH === null) {
        throw new Error("Cargo lock package version was not found.");
    }
    return MATCH[0];
}

/** Collects every source-of-truth version entry. */
function versionEntries() {
    const ENTRIES = JSON_VERSION_FILES.map((relativePath) => {
        return [relativePath, jsonVersion(relativePath)];
    });
    ENTRIES.push([CARGO_MANIFEST_PATH, cargoVersion()]);
    ENTRIES.push([CARGO_LOCK_PATH, cargoLockVersion()]);
    return ENTRIES;
}

/** Throws with details when any source version differs. */
function checkVersions(version) {
    const MISMATCHES = versionEntries().filter((entry) => {
        return entry[1] !== version;
    });
    if (MISMATCHES.length === 0) {
        return;
    }
    const DETAILS = MISMATCHES.map((entry) => {
        return `${entry[0]}=${entry[1]}`;
    }).join(", ");
    throw new Error(`Bartleby version mismatch: ${DETAILS}`);
}

/** Updates all top-level JSON version fields. */
function updateJsonVersions(version) {
    for (const RELATIVE_PATH of JSON_VERSION_FILES) {
        const PAYLOAD = readJson(RELATIVE_PATH);
        PAYLOAD.version = version;
        writeJson(RELATIVE_PATH, PAYLOAD);
    }
}

/** Updates the Rust package version. */
function updateCargoManifest(version) {
    const MANIFEST_PATH = absolutePath(CARGO_MANIFEST_PATH);
    const MANIFEST = fs.readFileSync(MANIFEST_PATH, "utf8");
    const VERSION_PATTERN = /^version = "[^"]+"$/m;
    if (!VERSION_PATTERN.test(MANIFEST)) {
        throw new Error("Cargo package version was not found.");
    }
    const NEXT_MANIFEST = MANIFEST.replace(
        VERSION_PATTERN,
        `version = "${version}"`,
    );
    if (NEXT_MANIFEST === MANIFEST) {
        return;
    }
    fs.writeFileSync(MANIFEST_PATH, NEXT_MANIFEST, "utf8");
}

/** Updates the locked Rust application package version. */
function updateCargoLock(version) {
    const LOCK_PATH = absolutePath(CARGO_LOCK_PATH);
    const LOCKFILE = fs.readFileSync(LOCK_PATH, "utf8");
    if (!CARGO_LOCK_VERSION_PATTERN.test(LOCKFILE)) {
        throw new Error("Cargo lock package version was not found.");
    }
    const NEXT_LOCKFILE = LOCKFILE.replace(CARGO_LOCK_VERSION_PATTERN, version);
    if (NEXT_LOCKFILE === LOCKFILE) {
        return;
    }
    fs.writeFileSync(LOCK_PATH, NEXT_LOCKFILE, "utf8");
}

/** Updates every version source and verifies the result. */
function setVersion(version) {
    updateJsonVersions(version);
    updateCargoManifest(version);
    updateCargoLock(version);
    checkVersions(version);
}

/** Runs either consistency checking or a version update. */
function run() {
    const ARGUMENT = requestedVersion();
    if (ARGUMENT === CHECK_ARGUMENT) {
        checkVersions(canonicalVersion());
        return;
    }
    assertVersion(ARGUMENT);
    setVersion(ARGUMENT);
}

run();
