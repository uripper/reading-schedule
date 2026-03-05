import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRE = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const DEVELOPMENT_ENVIRONMENT = "development";
const DEVELOPMENT_FLAG = "--development";
const ELECTRON_PACKAGE_NAME = "electron";
const ELECTRON_REBUILD_ARGS = ["rebuild", ELECTRON_PACKAGE_NAME];
const ELECTRON_INSTALL_SCRIPT = "install.js";
const ELECTRON_PATH_FILE = "path.txt";
const ELECTRON_RESOLVE_ERROR_PREFIX = "Could not resolve Electron binary path";
const PNPM_COMMAND_DEFAULT = "pnpm";
const PNPM_COMMAND_WINDOWS = "pnpm.cmd";

/**
 * Detects whether the script should launch Electron in development mode.
 * @returns {boolean} True when development launch flag is present.
 */
const IS_DEVELOPMENT_LAUNCH = () => {
    return process.argv.includes(DEVELOPMENT_FLAG);
};

/**
 * Returns environment variables safe for launching Electron child process.
 * @param {boolean} developmentLaunch - Whether to force development mode.
 * @returns {NodeJS.ProcessEnv} Cleaned environment object.
 */
const CLEANED_ENVIRONMENT = (developmentLaunch) => {
    const ENV = { ...process.env };
    delete ENV.ELECTRON_RUN_AS_NODE;
    if (developmentLaunch) {
        ENV.NODE_ENV = DEVELOPMENT_ENVIRONMENT;
    }
    return ENV;
};

/**
 * Resolves the pnpm command name for the current platform.
 * @returns {string} pnpm executable name.
 */
const PNPM_COMMAND_NAME = () => {
    if (process.platform === "win32") {
        return PNPM_COMMAND_WINDOWS;
    }
    return PNPM_COMMAND_DEFAULT;
};

/**
 * Runs `pnpm rebuild electron` in project root to recover missing Electron binary.
 */
const REBUILD_ELECTRON_BINARY = () => {
    const COMMAND = PNPM_COMMAND_NAME();
    const RESULT = spawnSync(COMMAND, ELECTRON_REBUILD_ARGS, {
        cwd: ROOT,
        stdio: "inherit",
    });
    const STATUS = RESULT.status;
    if (STATUS === 0) {
        return;
    }
    throw new Error("Failed to rebuild Electron dependency.");
};

/**
 * Returns absolute directory path to installed electron package.
 * @returns {string} Electron package directory path.
 */
const ELECTRON_PACKAGE_DIRECTORY = () => {
    const PACKAGE_JSON_PATH = REQUIRE.resolve("electron/package.json");
    return path.dirname(PACKAGE_JSON_PATH);
};

/**
 * Checks whether Electron package generated path marker exists.
 * @returns {boolean} True when `path.txt` exists.
 */
const HAS_ELECTRON_PATH_MARKER = () => {
    const ELECTRON_DIRECTORY = ELECTRON_PACKAGE_DIRECTORY();
    const PATH_MARKER = path.join(ELECTRON_DIRECTORY, ELECTRON_PATH_FILE);
    return fs.existsSync(PATH_MARKER);
};

/**
 * Runs Electron package install script to force binary download and marker write.
 */
const RUN_ELECTRON_INSTALL_SCRIPT = () => {
    const ELECTRON_DIRECTORY = ELECTRON_PACKAGE_DIRECTORY();
    const INSTALL_SCRIPT_PATH = path.join(
        ELECTRON_DIRECTORY,
        ELECTRON_INSTALL_SCRIPT,
    );
    const ENV = { ...process.env };
    delete ENV.ELECTRON_SKIP_BINARY_DOWNLOAD;
    const RESULT = spawnSync(process.execPath, [INSTALL_SCRIPT_PATH], {
        cwd: ROOT,
        env: ENV,
        stdio: "inherit",
    });
    if (RESULT.status === 0) {
        return;
    }
    throw new Error("Failed to run Electron install script.");
};

/**
 * Repairs Electron dependency by rebuilding and then forcing install script when needed.
 */
const REPAIR_ELECTRON_INSTALL = () => {
    REBUILD_ELECTRON_BINARY();
    if (HAS_ELECTRON_PATH_MARKER()) {
        return;
    }
    process.stderr.write(
        "Electron path marker missing after rebuild; running install script...\n",
    );
    RUN_ELECTRON_INSTALL_SCRIPT();
};

/**
 * Attempts to resolve Electron binary path, optionally rebuilding on failure.
 * @returns {string} Electron binary path.
 */
const RESOLVE_ELECTRON_BINARY_PATH = () => {
    try {
        return ELECTRON_BINARY_PATH();
    } catch (error) {
        let message = "";
        if (error instanceof Error) {
            message = error.message;
        } else {
            message = String(error);
        }
        process.stderr.write(`${ELECTRON_RESOLVE_ERROR_PREFIX}: ${message}\n`);
        process.stderr.write(
            "Attempting to repair Electron install with `pnpm rebuild electron`...\n",
        );
        REPAIR_ELECTRON_INSTALL();
        return ELECTRON_BINARY_PATH();
    }
};

/**
 * Resolves installed Electron binary path from dependency entrypoint.
 * @returns {string} Electron binary path.
 */
const ELECTRON_BINARY_PATH = () => {
    const BINARY = REQUIRE("electron");
    if (typeof BINARY !== "string" || !BINARY) {
        throw new TypeError("Could not resolve Electron binary path.");
    }
    return BINARY;
};

/**
 * Spawns Electron process with inherited stdio and exit propagation.
 */
const SPAWN_ELECTRON = () => {
    const DEVELOPMENT_LAUNCH = IS_DEVELOPMENT_LAUNCH();
    const CHILD = spawn(RESOLVE_ELECTRON_BINARY_PATH(), ["."], {
        cwd: ROOT,
        env: CLEANED_ENVIRONMENT(DEVELOPMENT_LAUNCH),
        stdio: "inherit",
    });
    CHILD.on("error", (error) => {
        let message = "";
        if (error instanceof Error) {
            message = error.message;
        } else {
            message = String(error);
        }
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
    CHILD.on("exit", (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }
        process.exitCode = Number(code || 0);
    });
};

SPAWN_ELECTRON();
