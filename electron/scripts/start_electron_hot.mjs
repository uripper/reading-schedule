import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const START_SCRIPT_PATH = path.join(SCRIPT_DIR, "start_electron.mjs");
const DEVELOPMENT_FLAG = "--development";
const RESTART_DELAY_MS = 500;
const SHORT_RUN_THRESHOLD_MS = 3000;

let shuttingDown = false;

function delay(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function markShuttingDown() {
    shuttingDown = true;
}

process.on("SIGINT", markShuttingDown);
process.on("SIGTERM", markShuttingDown);

async function runHotLoop() {
    while (!shuttingDown) {
        const STARTED_AT = Date.now();
        const EXIT_CODE = await new Promise((resolve) => {
            const CHILD = spawn(
                process.execPath,
                [START_SCRIPT_PATH, DEVELOPMENT_FLAG],
                {
                    cwd: process.cwd(),
                    env: process.env,
                    stdio: "inherit",
                },
            );

            CHILD.on("error", () => {
                resolve(1);
            });

            CHILD.on("exit", (code) => {
                resolve(Number(code ?? 0));
            });
        });

        if (shuttingDown) {
            break;
        }

        if (EXIT_CODE !== 0) {
            process.exitCode = EXIT_CODE;
            break;
        }

        const RAN_FOR_MS = Date.now() - STARTED_AT;
        if (RAN_FOR_MS >= SHORT_RUN_THRESHOLD_MS) {
            break;
        }

        await delay(RESTART_DELAY_MS);
    }
}

await runHotLoop();
