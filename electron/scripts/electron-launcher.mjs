const DEVELOPMENT_ENVIRONMENT = "development";
const DEVELOPMENT_FLAG = "--development";
const ELECTRON_RUN_AS_NODE_ENV_KEY = "ELECTRON_RUN_AS_NODE";
const NODE_ENV_KEY = "NODE_ENV";
const ELECTRON_SPAWN_ARGS = ["."];
const SPAWN_STDIO = "inherit";

/**
 * Detects whether the current launch should use development mode.
 * @param {ReadonlyArray<string>} argv - Process arguments to inspect.
 * @returns {boolean} True when the development flag is present.
 */
export function isDevelopmentLaunch(argv = process.argv) {
    return argv.includes(DEVELOPMENT_FLAG);
}

/**
 * Returns a cleaned environment for launching Electron.
 * @param {NodeJS.ProcessEnv} environment - Source environment to clone.
 * @param {boolean} developmentLaunch - Whether to force development mode.
 * @returns {NodeJS.ProcessEnv} Sanitized launch environment.
 */
export function cleanedEnvironment(environment, developmentLaunch) {
    const ENVIRONMENT = { ...environment };
    delete ENVIRONMENT[ELECTRON_RUN_AS_NODE_ENV_KEY];
    if (developmentLaunch) {
        ENVIRONMENT[NODE_ENV_KEY] = DEVELOPMENT_ENVIRONMENT;
    }
    return ENVIRONMENT;
}

/**
 * Builds the spawn specification for launching Electron.
 * @param {object} root0 - Launch inputs.
 * @param {string} root0.binaryPath - Absolute Electron binary path.
 * @param {string} root0.cwd - Working directory for the child process.
 * @param {boolean} root0.developmentLaunch - Whether to force development mode.
 * @param {NodeJS.ProcessEnv} [root0.environment=process.env] - Base environment.
 * @returns {{
 *   args: string[],
 *   command: string,
 *   options: { cwd: string, env: NodeJS.ProcessEnv, stdio: "inherit" }
 * }} Electron spawn specification.
 */
export function createElectronLaunchSpec({
    binaryPath,
    cwd,
    developmentLaunch,
    environment,
}) {
    const PROCESS = process;
    const BASE_ENVIRONMENT = environment ?? PROCESS.env;
    return {
        args: ELECTRON_SPAWN_ARGS,
        command: binaryPath,
        options: {
            cwd,
            env: cleanedEnvironment(BASE_ENVIRONMENT, developmentLaunch),
            stdio: SPAWN_STDIO,
        },
    };
}

export { DEVELOPMENT_FLAG };
