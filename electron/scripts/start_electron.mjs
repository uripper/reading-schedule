import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const DEVELOPMENT_ENVIRONMENT = "development";
const DEVELOPMENT_FLAG = "--development";

/**
 * Detects whether the script should launch Electron in development mode.
 * @returns {boolean} True when development launch flag is present.
 */
function isDevelopmentLaunch() {
	return process.argv.includes(DEVELOPMENT_FLAG);
}

/**
 * Returns environment variables safe for launching Electron child process.
 * @param {boolean} developmentLaunch Whether to force development mode.
 * @returns {NodeJS.ProcessEnv} Cleaned environment object.
 */
function cleanedEnvironment(developmentLaunch) {
	const env = { ...process.env };
	delete env.ELECTRON_RUN_AS_NODE;
	if (developmentLaunch) {
		env.NODE_ENV = DEVELOPMENT_ENVIRONMENT;
	}
	return env;
}

/**
 * Resolves installed Electron binary path from dependency entrypoint.
 * @returns {string} Electron binary path.
 */
function electronBinaryPath() {
	const binary = require("electron");
	if (typeof binary !== "string" || !binary) {
		throw new TypeError("Could not resolve Electron binary path.");
	}
	return binary;
}

/**
 * Spawns Electron process with inherited stdio and exit propagation.
 */
function spawnElectron() {
	const developmentLaunch = isDevelopmentLaunch();
	const child = spawn(electronBinaryPath(), ["."], {
		cwd: ROOT,
		env: cleanedEnvironment(developmentLaunch),
		stdio: "inherit",
	});
	child.on("error", (error) => {
		let message = "";
		if (error instanceof Error) {
			message = error.message;
		} else {
			message = String(error);
		}
		process.stderr.write(`${message}\n`);
		process.exitCode = 1;
	});
	child.on("exit", (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exitCode = Number(code || 0);
	});
}

spawnElectron();
