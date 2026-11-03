/**
 * Manages per-version release notes in `changelog/<target>/<version>.md`.
 *
 * Targets are `desktop`, `website`, and `mobile`. Each file holds the notes
 * body only (no version title): the release name already carries the version.
 * Write user-facing changes grouped under `## New`, `## Improvements`, and
 * `## Fixes`; the desktop file becomes the GitHub release body and the notes
 * shown in the in-app update dialog.
 *
 * Usage:
 *   node scripts/release-notes.mjs scaffold <target> [version]
 *   node scripts/release-notes.mjs check <target> [version]
 *   node scripts/release-notes.mjs print <target> [version]
 *
 * `version` defaults to the root `package.json` version. `scaffold` writes a
 * draft template when the file is missing; `check` fails while the file is
 * missing, empty, or still marked as a draft; `print` writes the publishable
 * body to stdout.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const CHANGELOG_DIRECTORY = "changelog";
const NOTES_EXTENSION = ".md";
const RELEASE_TARGETS = ["desktop", "website", "mobile"];
const DRAFT_MARKER = "release-notes:draft";
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const ARGUMENT_SEPARATOR = "--";
const DRAFT_TEMPLATE = `<!-- ${DRAFT_MARKER}: replace this template with this version's user-facing changes, then delete this line. -->
## New

-

## Improvements

-

## Fixes

-
`;

/** Reads the root package version used as the default release version. */
function canonicalVersion(root) {
    const PACKAGE_PATH = path.join(root, "package.json");
    return JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8")).version;
}

/** Rejects unknown release targets with the supported list. */
function assertTarget(target) {
    if (RELEASE_TARGETS.includes(target)) {
        return;
    }
    throw new Error(
        `Unknown release-notes target "${target}". Use one of: ${RELEASE_TARGETS.join(", ")}.`,
    );
}

/**
 * Resolves the notes file for a target and version.
 * @param target - Release target such as `desktop`.
 * @param version - Release version such as `0.1.8-alpha`.
 * @param root - Repository root; defaults to this repository.
 * @returns Absolute notes file path.
 */
export function releaseNotesPath(target, version, root = REPOSITORY_ROOT) {
    assertTarget(target);
    return path.join(
        root,
        CHANGELOG_DIRECTORY,
        target,
        `${version}${NOTES_EXTENSION}`,
    );
}

/**
 * Writes the draft template when no notes exist for the version yet.
 * @returns `true` when a new draft was created.
 */
export function scaffoldReleaseNotes(target, version, root = REPOSITORY_ROOT) {
    const NOTES_PATH = releaseNotesPath(target, version, root);
    if (fs.existsSync(NOTES_PATH)) {
        return false;
    }
    fs.mkdirSync(path.dirname(NOTES_PATH), { recursive: true });
    fs.writeFileSync(NOTES_PATH, DRAFT_TEMPLATE, "utf8");
    return true;
}

/** Removes authoring comments and surrounding whitespace from notes text. */
function publishableText(source) {
    return source.replace(HTML_COMMENT_PATTERN, "").trim();
}

/**
 * Reads and validates the publishable notes body for a version.
 * @returns Notes body ready for the release.
 */
export function releaseNotesBody(target, version, root = REPOSITORY_ROOT) {
    const NOTES_PATH = releaseNotesPath(target, version, root);
    const RELATIVE_PATH = path.relative(root, NOTES_PATH);
    if (!fs.existsSync(NOTES_PATH)) {
        throw new Error(
            `Missing release notes: ${RELATIVE_PATH}. Run "node scripts/release-notes.mjs scaffold ${target} ${version}" and fill it in.`,
        );
    }
    const SOURCE = fs.readFileSync(NOTES_PATH, "utf8");
    if (SOURCE.includes(DRAFT_MARKER)) {
        throw new Error(
            `Release notes are still a draft: ${RELATIVE_PATH}. Fill them in and delete the draft marker line.`,
        );
    }
    const BODY = publishableText(SOURCE);
    if (BODY === "") {
        throw new Error(`Release notes are empty: ${RELATIVE_PATH}.`);
    }
    return BODY;
}

/** Splits CLI arguments into command, target, and optional version. */
function cliArguments(argv) {
    const ARGUMENTS = argv.filter((argument) => {
        return argument !== ARGUMENT_SEPARATOR;
    });
    return {
        command: ARGUMENTS[0],
        target: ARGUMENTS[1],
        version: ARGUMENTS[2] ?? canonicalVersion(REPOSITORY_ROOT),
    };
}

/** Runs one release-notes command. */
function run(argv) {
    const { command, target, version } = cliArguments(argv);
    if (command === "scaffold") {
        scaffoldReleaseNotes(target, version);
        process.stdout.write(`${releaseNotesPath(target, version)}\n`);
        return;
    }
    if (command === "check") {
        releaseNotesBody(target, version);
        return;
    }
    if (command === "print") {
        process.stdout.write(`${releaseNotesBody(target, version)}\n`);
        return;
    }
    throw new Error(
        "Usage: release-notes.mjs <scaffold|check|print> <target> [version]",
    );
}

/** Runs the CLI and reports failures as a single actionable line. */
function main() {
    try {
        run(process.argv.slice(2));
    } catch (error) {
        process.stderr.write(`release-notes: ${error.message}\n`);
        process.exitCode = 1;
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    main();
}
