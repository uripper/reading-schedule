const RESTART_DELAY_MS = 500;
const SHORT_RUN_THRESHOLD_MS = 3000;

/**
 * Waits for the requested number of milliseconds.
 * @param {number} milliseconds - Delay duration.
 * @returns {Promise<void>} Promise resolved after the delay.
 */
function delay(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

/**
 * Determines whether the child should trigger another restart attempt.
 * @param {{ exitCode: number, ranForMs: number }} child - Child run result.
 * @param {number} shortRunThresholdMs - Runtime threshold that stops the loop.
 * @returns {boolean} `true` when the child should be restarted.
 */
function shouldRestartChild(child, shortRunThresholdMs) {
    if (child.exitCode !== 0) {
        return false;
    }
    return child.ranForMs < shortRunThresholdMs;
}

/**
 * Resolves the terminal exit code after one child run.
 * @param {object} root0 - Post-run inputs.
 * @param {{ exitCode: number, ranForMs: number }} root0.child - Child run result.
 * @param {() => boolean} root0.isShuttingDown - Shutdown flag reader.
 * @param {number} root0.shortRunThresholdMs - Runtime threshold that stops the loop.
 * @returns {number | null} Exit code when the loop should stop, otherwise `null`.
 */
function nextLoopExitCode({ child, isShuttingDown, shortRunThresholdMs }) {
    if (isShuttingDown()) {
        return 0;
    }
    if (shouldRestartChild(child, shortRunThresholdMs)) {
        return null;
    }
    return child.exitCode;
}

/**
 * Handles the delay-and-restart step after a short successful child run.
 * @param {object} root0 - Restart dependencies.
 * @param {number} root0.restartDelayMs - Delay before restart.
 * @param {(milliseconds: number) => Promise<void>} root0.sleep - Sleep implementation.
 * @param {() => Promise<number>} root0.runIteration - Recursive loop step.
 * @returns {Promise<number>} Exit code from the next iteration.
 */
function restartChild({ restartDelayMs, sleep, runIteration }) {
    return Promise.resolve()
        .then(() => sleep(restartDelayMs))
        .then(() => runIteration());
}

/**
 * Runs the Electron hot-restart loop until shutdown or a terminal exit.
 * @param {object} root0 - Hot-loop dependencies.
 * @param {() => boolean} root0.isShuttingDown - Shutdown flag reader.
 * @param {() => Promise<{ exitCode: number, ranForMs: number }>} root0.launchChild - Child process launcher.
 * @param {number} [root0.restartDelayMs=RESTART_DELAY_MS] - Delay before restart.
 * @param {number} [root0.shortRunThresholdMs=SHORT_RUN_THRESHOLD_MS] - Runtime threshold that stops the loop.
 * @param {(milliseconds: number) => Promise<void>} [root0.sleep=delay] - Sleep implementation for tests.
 * @returns {Promise<number>} Terminal exit code to propagate from the loop.
 */
export function runHotLoop({
    isShuttingDown,
    launchChild,
    restartDelayMs = RESTART_DELAY_MS,
    shortRunThresholdMs = SHORT_RUN_THRESHOLD_MS,
    sleep = delay,
}) {
    function runIteration() {
        if (isShuttingDown()) {
            return Promise.resolve(0);
        }

        return launchChild().then((child) => {
            const EXIT_CODE = nextLoopExitCode({
                child,
                isShuttingDown,
                shortRunThresholdMs,
            });
            if (EXIT_CODE !== null) {
                return EXIT_CODE;
            }
            return restartChild({ restartDelayMs, runIteration, sleep });
        });
    }

    return runIteration();
}

export { RESTART_DELAY_MS, SHORT_RUN_THRESHOLD_MS };
