import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runHotLoop as runElectronHotLoop } from "./electron-hot-loop.mjs";
import { DEVELOPMENT_FLAG } from "./electron-launcher.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const START_SCRIPT_PATH = path.join(SCRIPT_DIR, "start_electron.mjs");
const PROCESS = process;

let shuttingDown = false;

function markShuttingDown() {
    shuttingDown = true;
}

PROCESS.on("SIGINT", markShuttingDown);
PROCESS.on("SIGTERM", markShuttingDown);

function launchElectronChild() {
    const STARTED_AT = Date.now();
    return new Promise((resolve) => {
        const CHILD = spawn(
            PROCESS.execPath,
            [START_SCRIPT_PATH, DEVELOPMENT_FLAG],
            {
                cwd: PROCESS.cwd(),
                env: PROCESS.env,
                stdio: "inherit",
            },
        );

        CHILD.on("error", () => {
            resolve({
                exitCode: 1,
                ranForMs: Date.now() - STARTED_AT,
            });
        });

        CHILD.on("exit", (code) => {
            resolve({
                exitCode: Number(code ?? 0),
                ranForMs: Date.now() - STARTED_AT,
            });
        });
    });
}

async function startHotLoop() {
    const EXIT_CODE = await runElectronHotLoop({
        isShuttingDown: () => shuttingDown,
        launchChild: launchElectronChild,
    });
    if (EXIT_CODE !== 0) {
        PROCESS.exitCode = EXIT_CODE;
    }
}

await startHotLoop();
