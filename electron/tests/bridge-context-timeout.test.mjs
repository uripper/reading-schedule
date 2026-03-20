// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { env } from "node:process";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const { bridgeTimeoutMs, resolveExecutionContext } = REQUIRE(
    "../dist/main/bridge/context.js",
);
const {
    BRIDGE_LOG_PATH_KEY,
    BRIDGE_REQUEST_ID_KEY,
    BRIDGE_TIMEOUT_MS_KEY,
    DEFAULT_BRIDGE_TIMEOUT_MS,
    MAX_BRIDGE_TIMEOUT_MS,
    MIN_BRIDGE_TIMEOUT_MS,
} = REQUIRE("../dist/main/bridge/constants.js");
const { pythonBridgeLogPath } = REQUIRE("../dist/main/state_store_paths.js");

/**
 * Restores one process environment value after a test override.
 * @param {string} name - Environment variable name.
 * @param {string | undefined} previousValue - Original environment value.
 */
function restoreEnvironmentValue(name, previousValue) {
    if (previousValue === undefined) {
        delete env[name];
        return;
    }
    env[name] = previousValue;
}

/**
 * Runs a callback with one temporary environment override.
 * @template T
 * @param {string} name - Environment variable name.
 * @param {string | undefined} nextValue - Temporary value to apply.
 * @param {() => T} action - Callback executed with the override in place.
 * @returns {T} Callback result.
 */
function withEnvironmentValue(name, nextValue, action) {
    const PREVIOUS_VALUE = env[name];
    if (nextValue === undefined) {
        delete env[name];
    } else {
        env[name] = nextValue;
    }
    try {
        return action();
    } finally {
        restoreEnvironmentValue(name, PREVIOUS_VALUE);
    }
}

test("bridgeTimeoutMs falls back to the default for blank or invalid values", () => {
    withEnvironmentValue(BRIDGE_TIMEOUT_MS_KEY, undefined, () => {
        assert.equal(bridgeTimeoutMs(), DEFAULT_BRIDGE_TIMEOUT_MS);
    });
    withEnvironmentValue(BRIDGE_TIMEOUT_MS_KEY, "   ", () => {
        assert.equal(bridgeTimeoutMs(), DEFAULT_BRIDGE_TIMEOUT_MS);
    });
    withEnvironmentValue(BRIDGE_TIMEOUT_MS_KEY, "not-a-number", () => {
        assert.equal(bridgeTimeoutMs(), DEFAULT_BRIDGE_TIMEOUT_MS);
    });
});

test("bridgeTimeoutMs clamps configured values into the supported range", () => {
    withEnvironmentValue(BRIDGE_TIMEOUT_MS_KEY, "5", () => {
        assert.equal(bridgeTimeoutMs(), MIN_BRIDGE_TIMEOUT_MS);
    });
    withEnvironmentValue(
        BRIDGE_TIMEOUT_MS_KEY,
        String(MAX_BRIDGE_TIMEOUT_MS + 10_000),
        () => {
            assert.equal(bridgeTimeoutMs(), MAX_BRIDGE_TIMEOUT_MS);
        },
    );
});

test("resolveExecutionContext forwards request and log metadata into the env", () => {
    const CONTEXT = resolveExecutionContext({
        requestId: "req-123",
        userDataDir: "/tmp/bartleby-user-data",
    });

    assert.equal(CONTEXT.requestId, "req-123");
    assert.equal(
        CONTEXT.logPath,
        pythonBridgeLogPath("/tmp/bartleby-user-data"),
    );
    assert.equal(CONTEXT.env[BRIDGE_REQUEST_ID_KEY], "req-123");
    assert.equal(
        CONTEXT.env[BRIDGE_LOG_PATH_KEY],
        pythonBridgeLogPath("/tmp/bartleby-user-data"),
    );
});
