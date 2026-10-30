// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers connection transitions, popup suppression, and serialized async scans. */
import assert from "node:assert/strict";
import test from "node:test";
import { createKoboMonitor } from "../dist/renderer/kobo/monitor.js";

const CONNECTED = { invalidRows: 0, records: [], status: "connected" };

function setup() {
    const STATE = {
        modal: false,
        path: "/kobo/KoboReader.sqlite",
        presented: 0,
        reads: 0,
        snapshot: CONNECTED,
        statuses: [],
    };
    const MONITOR = createKoboMonitor({
        getPath: () => STATE.path,
        hasModal: () => STATE.modal,
        present: () => {
            STATE.presented += 1;
            return true;
        },
        read: async () => {
            STATE.reads += 1;
            await Promise.resolve();
            return STATE.snapshot;
        },
        status: (message) => {
            STATE.statuses.push(message);
        },
    });
    return { monitor: MONITOR, state: STATE };
}

test("checks on startup, suppresses dismissed popups and allows manual retry", async () => {
    const { monitor: MONITOR, state: STATE } = setup();
    await MONITOR.check();
    await MONITOR.check();
    assert.equal(STATE.presented, 1);
    await MONITOR.check(true);
    assert.equal(STATE.presented, 2);
});

test("reconnecting or changing path permits a new review", async () => {
    const { monitor: MONITOR, state: STATE } = setup();
    await MONITOR.check();
    STATE.snapshot = { status: "disconnected" };
    await MONITOR.check();
    STATE.snapshot = CONNECTED;
    await MONITOR.check();
    STATE.path = "/other/KoboReader.sqlite";
    await MONITOR.check();
    assert.equal(STATE.presented, 3);
});

test("does not overlap scans, interrupt another modal, or read a disabled path", async () => {
    const { monitor: MONITOR, state: STATE } = setup();
    await Promise.all([MONITOR.check(), MONITOR.check()]);
    assert.equal(STATE.reads, 1);
    STATE.modal = true;
    await MONITOR.check();
    STATE.modal = false;
    STATE.path = "";
    await MONITOR.check();
    assert.equal(STATE.reads, 1);
});

test("discards in-flight responses after the configured path changes", async () => {
    const { monitor: MONITOR, state: STATE } = setup();
    const PENDING = MONITOR.check();
    STATE.path = "/different/KoboReader.sqlite";
    await PENDING;
    assert.equal(STATE.presented, 0);
    await MONITOR.check();
    assert.equal(STATE.presented, 1);
});

test("reports read failures, releases the scan guard and can recover", async () => {
    let failed = true;
    const STATUSES = [];
    const MONITOR = createKoboMonitor({
        getPath: () => "/kobo/KoboReader.sqlite",
        hasModal: () => false,
        present: () => true,
        read: async () => {
            await Promise.resolve();
            if (failed) {
                throw new Error("busy database");
            }
            return CONNECTED;
        },
        status: (message) => {
            STATUSES.push(message);
        },
    });
    await MONITOR.check();
    assert.match(STATUSES.at(-1), /busy database/);
    failed = false;
    await MONITOR.check();
    assert.match(STATUSES.at(-1), /Connected/);
});
