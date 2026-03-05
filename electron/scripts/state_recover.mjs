import path from "node:path";
import { fileURLToPath } from "node:url";
import { logError, logInfo } from "./logger.mjs";
import { recoverStateFromArgs } from "./state_recover_helpers.mjs";

/**
 * Runs state recovery and prints a concise summary.
 * @param {string[]} argv - CLI arguments excluding `node` and script path.
 */
export function runStateRecover(argv) {
    const RESULT = recoverStateFromArgs(argv);
    logInfo(`Recovered source type: ${RESULT.sourceType}`);
    logInfo(`Input path: ${RESULT.inputPath}`);
    logInfo(`User data dir: ${RESULT.userDataDir}`);
    logInfo(`Books: ${RESULT.counts.books}`);
    logInfo(`Sessions: ${RESULT.counts.sessions}`);
    logInfo(`Schedule rows: ${RESULT.counts.scheduleRows}`);
    logInfo(`Schedule completions: ${RESULT.counts.scheduleCompletions}`);
    if (RESULT.backups.length > 0) {
        logInfo("Created backups:");
        for (const BACKUP_PATH of RESULT.backups) {
            logInfo(`- ${BACKUP_PATH}`);
        }
    }
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || "") === SCRIPT_PATH) {
    try {
        runStateRecover(process.argv.slice(2));
    } catch (error) {
        logError("State recovery failed.", error);
        process.exitCode = 1;
    }
}
