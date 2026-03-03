import path from "node:path";
import { fileURLToPath } from "node:url";
import { recoverStateFromArgs } from "./state_recover_helpers.mjs";

/**
 * Runs state recovery and prints a concise summary.
 * @param {string[]} argv CLI arguments excluding `node` and script path.
 */
export function runStateRecover(argv) {
    const RESULT = recoverStateFromArgs(argv);
    console.info(`Recovered source type: ${RESULT.sourceType}`);
    console.info(`Input path: ${RESULT.inputPath}`);
    console.info(`User data dir: ${RESULT.userDataDir}`);
    console.info(`Books: ${RESULT.counts.books}`);
    console.info(`Sessions: ${RESULT.counts.sessions}`);
    console.info(`Schedule rows: ${RESULT.counts.scheduleRows}`);
    console.info(`Schedule completions: ${RESULT.counts.scheduleCompletions}`);
    if (RESULT.backups.length > 0) {
        console.info("Created backups:");
        RESULT.backups.forEach((backupPath) => {
            console.info(`- ${backupPath}`);
        });
    }
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || "") === SCRIPT_PATH) {
    try {
        runStateRecover(process.argv.slice(2));
    } catch (error) {
        let message = "State recovery failed.";
        if (error instanceof Error) {
            message = `${message} ${error.message}`;
        }
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    }
}
