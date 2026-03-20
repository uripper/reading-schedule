import assert from "node:assert/strict";
import test from "node:test";

import {
    RESTART_DELAY_MS,
    runHotLoop,
    SHORT_RUN_THRESHOLD_MS,
} from "../scripts/electron-hot-loop.mjs";

test("hot loop restarts children that exit immediately", async () => {
    const LAUNCHES = [];
    const SLEEPS = [];
    const EXIT_CODE = await runHotLoop({
        isShuttingDown: () => false,
        launchChild: () => {
            const ATTEMPT = LAUNCHES.length;
            LAUNCHES.push(ATTEMPT);
            if (ATTEMPT === 0) {
                return { exitCode: 0, ranForMs: 100 };
            }
            return { exitCode: 0, ranForMs: SHORT_RUN_THRESHOLD_MS };
        },
        sleep: (milliseconds) => {
            SLEEPS.push(milliseconds);
        },
    });
    assert.equal(EXIT_CODE, 0);
    assert.equal(LAUNCHES.length, 2);
    assert.deepEqual(SLEEPS, [RESTART_DELAY_MS]);
});

test("hot loop propagates non-zero child exits", async () => {
    const LAUNCHES = [];
    const EXIT_CODE = await runHotLoop({
        isShuttingDown: () => false,
        launchChild: () => {
            LAUNCHES.push("launch");
            return { exitCode: 7, ranForMs: 50 };
        },
        sleep: () => {
            throw new Error("sleep should not run after a non-zero exit");
        },
    });
    assert.equal(EXIT_CODE, 7);
    assert.equal(LAUNCHES.length, 1);
});
