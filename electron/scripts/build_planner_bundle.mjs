/**
 * Builds the packaged Windows planner bridge executable with PyInstaller.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_PATH);
const ELECTRON_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(ELECTRON_DIRECTORY, "..");
const PYINSTALLER_TEMP_DIRECTORY = path.join(
    ELECTRON_DIRECTORY,
    "build",
    "pyinstaller",
);
const PLANNER_OUTPUT_DIRECTORY = path.join(ELECTRON_DIRECTORY, "build", "planner");
const PLANNER_ENTRYPOINT_PATH = path.join(
    REPOSITORY_DIRECTORY,
    "src",
    "reading_plan",
    "bridge_entry.py",
);
const PROJECT_DATA_DIRECTORY = path.join(REPOSITORY_DIRECTORY, "data");
const WINDOWS_PYTHON_PATH = path.join(
    REPOSITORY_DIRECTORY,
    ".venv",
    "Scripts",
    "python.exe",
);
const POSIX_PYTHON_PATH = path.join(
    REPOSITORY_DIRECTORY,
    ".venv",
    "bin",
    "python",
);
const PYTHON_BINARY_ENV_KEY = "PYTHON_BIN";
const PYINSTALLER_MODULE = "PyInstaller";
const PLANNER_EXECUTABLE_NAME = "planner-bridge.exe";
const WINDOWS_PLATFORM = "win32";
const WINDOWS_DATA_SEPARATOR = ";";
const POSIX_DATA_SEPARATOR = ":";
const GUI_API_MODULE = "reading_plan.gui_api";
const HTTP_API_MODULE = "reading_plan.http_api";
const ORTOOLS_PACKAGE_NAME = "ortools";

/**
 * Throws a consistent build-time error.
 * @param message - Human-readable failure reason.
 */
function fail(message) {
    throw new Error(message);
}

/**
 * Prevents packaging from running under WSL or another non-Windows host.
 */
function requireWindowsHost() {
    if (process.platform === WINDOWS_PLATFORM) {
        return;
    }
    fail("Windows packaging must run from a native Windows shell.");
}

/**
 * Resolves the Python binary used for PyInstaller packaging.
 * @returns Absolute Python executable path or fallback command name.
 */
function existingPythonBinary() {
    const ENV_PYTHON = process.env[PYTHON_BINARY_ENV_KEY];
    if (typeof ENV_PYTHON === "string" && ENV_PYTHON.trim() !== "") {
        return ENV_PYTHON.trim();
    }
    if (fs.existsSync(WINDOWS_PYTHON_PATH)) {
        return WINDOWS_PYTHON_PATH;
    }
    if (fs.existsSync(POSIX_PYTHON_PATH)) {
        return POSIX_PYTHON_PATH;
    }
    return "python";
}

/**
 * Builds the platform-correct PyInstaller data argument for committed fixtures.
 * @returns Formatted --add-data argument payload.
 */
function plannerDataArgValue() {
    let separator = POSIX_DATA_SEPARATOR;
    if (process.platform === WINDOWS_PLATFORM) {
        separator = WINDOWS_DATA_SEPARATOR;
    }
    return `${PROJECT_DATA_DIRECTORY}${separator}data`;
}

/**
 * Removes a directory when it exists from an earlier packaging run.
 * @param directoryPath - Directory path to remove.
 */
function removeDirectoryIfPresent(directoryPath) {
    fs.rmSync(directoryPath, { force: true, recursive: true });
}

/**
 * Creates a directory tree when missing.
 * @param directoryPath - Directory path to create.
 */
function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, { recursive: true });
}

/**
 * Runs Python with inherited stdio and fails on non-zero exit.
 * @param args - Arguments passed after the Python executable.
 */
function runPython(args) {
    const PYTHON_BINARY = existingPythonBinary();
    const RESULT = spawnSync(PYTHON_BINARY, args, {
        cwd: REPOSITORY_DIRECTORY,
        stdio: "inherit",
    });
    if (RESULT.error instanceof Error) {
        throw RESULT.error;
    }
    if (RESULT.status === 0) {
        return;
    }
    fail(`Python command failed with exit code ${RESULT.status ?? 1}.`);
}

/**
 * Verifies that PyInstaller is available in the selected Python environment.
 */
function verifyPyInstaller() {
    runPython(["-m", PYINSTALLER_MODULE, "--version"]);
}

/**
 * Builds the Windows planner bridge executable into the ignored build directory.
 */
export function plannerBundleArguments() {
    return [
        "-m",
        PYINSTALLER_MODULE,
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name",
        "planner-bridge",
        "--distpath",
        PLANNER_OUTPUT_DIRECTORY,
        "--workpath",
        path.join(PYINSTALLER_TEMP_DIRECTORY, "work"),
        "--specpath",
        path.join(PYINSTALLER_TEMP_DIRECTORY, "spec"),
        "--paths",
        path.join(REPOSITORY_DIRECTORY, "src"),
        "--add-data",
        plannerDataArgValue(),
        "--hidden-import",
        GUI_API_MODULE,
        "--hidden-import",
        HTTP_API_MODULE,
        "--collect-submodules",
        "reading_plan",
        "--collect-all",
        ORTOOLS_PACKAGE_NAME,
        PLANNER_ENTRYPOINT_PATH,
    ];
}

function buildPlannerBundle() {
    removeDirectoryIfPresent(PYINSTALLER_TEMP_DIRECTORY);
    removeDirectoryIfPresent(PLANNER_OUTPUT_DIRECTORY);
    ensureDirectory(PYINSTALLER_TEMP_DIRECTORY);
    ensureDirectory(PLANNER_OUTPUT_DIRECTORY);
    runPython(plannerBundleArguments());
}

/**
 * Confirms that PyInstaller produced the expected planner executable.
 */
function verifyPlannerExecutable() {
    const EXECUTABLE_PATH = path.join(
        PLANNER_OUTPUT_DIRECTORY,
        PLANNER_EXECUTABLE_NAME,
    );
    if (fs.existsSync(EXECUTABLE_PATH)) {
        return;
    }
    fail(`Planner executable was not created: ${EXECUTABLE_PATH}`);
}

export function main() {
    requireWindowsHost();
    verifyPyInstaller();
    buildPlannerBundle();
    verifyPlannerExecutable();
}

if (path.resolve(process.argv[1] || "") === SCRIPT_PATH) {
    main();
}
