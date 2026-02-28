import path from "node:path";
import { fileURLToPath } from "node:url";
import { recoverStateFromArgs } from "./state_recover_helpers.mjs";

/**
 * Runs state recovery and prints a concise summary.
 * @param {string[]} argv CLI arguments excluding `node` and script path.
 */
export function runStateRecover(argv) {
	const result = recoverStateFromArgs(argv);
	console.info(`Recovered source type: ${result.sourceType}`);
	console.info(`Input path: ${result.inputPath}`);
	console.info(`User data dir: ${result.userDataDir}`);
	console.info(`Books: ${result.counts.books}`);
	console.info(`Sessions: ${result.counts.sessions}`);
	console.info(`Schedule rows: ${result.counts.scheduleRows}`);
	console.info(`Schedule completions: ${result.counts.scheduleCompletions}`);
	if (result.backups.length > 0) {
		console.info("Created backups:");
		result.backups.forEach((backupPath) => {
			console.info(`- ${backupPath}`);
		});
	}
}

const scriptPath = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || "") === scriptPath) {
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
