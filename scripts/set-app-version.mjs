/**
 * Keeps every Bartleby application/package version aligned from one command.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const CHECK_ARGUMENT = "--check";
const VERSION_PATTERN =
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const JSON_VERSION_FILES = [
    "package.json",
    "apps/bartleby/package.json",
    "apps/bartleby/src-tauri/tauri.conf.json",
    "apps/website/package.json",
    "mobile/package.json",
    "packages/contracts/package.json",
    "packages/frontend/package.json",
];
const MOBILE_CONFIG_PATH = "mobile/app.json";
const CARGO_MANIFEST_PATH = "apps/bartleby/src-tauri/Cargo.toml";

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
    return process.argv[2];
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

/** Reads the Expo application version. */
function mobileConfigVersion() {
    return readJson(MOBILE_CONFIG_PATH).expo.version;
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

/** Collects every source-of-truth version entry. */
function versionEntries() {
    const ENTRIES = JSON_VERSION_FILES.map((relativePath) => {
        return [relativePath, jsonVersion(relativePath)];
    });
    ENTRIES.push([MOBILE_CONFIG_PATH, mobileConfigVersion()]);
    ENTRIES.push([CARGO_MANIFEST_PATH, cargoVersion()]);
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

/** Updates the nested Expo application version. */
function updateMobileConfig(version) {
    const PAYLOAD = readJson(MOBILE_CONFIG_PATH);
    PAYLOAD.expo.version = version;
    writeJson(MOBILE_CONFIG_PATH, PAYLOAD);
}

/** Updates the Rust package version. */
function updateCargoManifest(version) {
    const MANIFEST_PATH = absolutePath(CARGO_MANIFEST_PATH);
    const MANIFEST = fs.readFileSync(MANIFEST_PATH, "utf8");
    const NEXT_MANIFEST = MANIFEST.replace(
        /^version = "[^"]+"$/m,
        `version = "${version}"`,
    );
    if (NEXT_MANIFEST === MANIFEST) {
        throw new Error("Cargo package version was not updated.");
    }
    fs.writeFileSync(MANIFEST_PATH, NEXT_MANIFEST, "utf8");
}

/** Updates every version source and verifies the result. */
function setVersion(version) {
    updateJsonVersions(version);
    updateMobileConfig(version);
    updateCargoManifest(version);
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
