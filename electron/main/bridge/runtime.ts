/**
 * Packaged planner resource discovery for Electron bridge launches.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { readEnvironmentValue } from "../runtime-env.ts";

const PLANNER_PATH_ENV_KEY = "BARTLEBY_PLANNER_PATH";
const RESOURCES_PATH_ENV_KEY = "BARTLEBY_RESOURCES_PATH";
const PLANNER_DIRECTORY_NAME = "planner";
const PLANNER_EXECUTABLE_BASENAME = "planner-bridge";
const WINDOWS_PLATFORM = "win32";
const WINDOWS_EXECUTABLE_SUFFIX = ".exe";

function trimmedEnvironmentPath(key: string): string {
    const ENV_PATH = readEnvironmentValue(key);
    if (typeof ENV_PATH !== "string") {
        return "";
    }
    return ENV_PATH.trim();
}

function processResourcesPath(): string {
    const RESOURCES_PATH = process.resourcesPath;
    if (typeof RESOURCES_PATH !== "string") {
        return "";
    }
    return RESOURCES_PATH.trim();
}

/**
 * Resolves the packaged resources root used by bundled bridge assets.
 * @returns Absolute packaged resources path, or an empty string in dev.
 */
function packagedResourcesPath(): string {
    const ENV_PATH = trimmedEnvironmentPath(RESOURCES_PATH_ENV_KEY);
    if (ENV_PATH !== "") {
        return ENV_PATH;
    }
    return processResourcesPath();
}

/**
 * Resolves the planner executable filename for the current platform.
 * @returns Planner executable basename.
 */
function plannerExecutableFileName(): string {
    if (process.platform === WINDOWS_PLATFORM) {
        return `${PLANNER_EXECUTABLE_BASENAME}${WINDOWS_EXECUTABLE_SUFFIX}`;
    }
    return PLANNER_EXECUTABLE_BASENAME;
}

function bundledPlannerPathFromResources(resourcesPath: string): string {
    return join(
        resourcesPath,
        PLANNER_DIRECTORY_NAME,
        plannerExecutableFileName(),
    );
}

/**
 * Resolves the bundled planner executable path when present.
 * @returns Absolute planner executable path, or an empty string.
 */
export function bundledPlannerPath(): string {
    const OVERRIDE_PATH = trimmedEnvironmentPath(PLANNER_PATH_ENV_KEY);
    if (OVERRIDE_PATH !== "") {
        return OVERRIDE_PATH;
    }
    const RESOURCES_PATH = packagedResourcesPath();
    if (RESOURCES_PATH === "") {
        return "";
    }
    return bundledPlannerPathFromResources(RESOURCES_PATH);
}

/**
 * Checks whether a bundled planner executable is available.
 * @returns True when packaged planner resources exist.
 */
export function hasBundledPlanner(): boolean {
    const PLANNER_PATH = bundledPlannerPath();
    if (PLANNER_PATH === "") {
        return false;
    }
    return existsSync(PLANNER_PATH);
}

/**
 * Resolves the preferred working directory for packaged planner execution.
 * @returns Absolute working directory, or an empty string.
 */
export function bundledPlannerWorkingDirectory(): string {
    const RESOURCES_PATH = packagedResourcesPath();
    if (RESOURCES_PATH !== "") {
        return RESOURCES_PATH;
    }
    const OVERRIDE_PATH = trimmedEnvironmentPath(PLANNER_PATH_ENV_KEY);
    if (OVERRIDE_PATH !== "") {
        return dirname(OVERRIDE_PATH);
    }
    return "";
}
