import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveExecutionContext, root } from "../dist/main/bridge/context.js";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON_DIRECTORY = path.resolve(TEST_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(ELECTRON_DIRECTORY, "..");
const SOURCE_DIRECTORY = path.join(REPOSITORY_DIRECTORY, "src");

test("bridge root resolves to repository directory", () => {
    assert.equal(root(), REPOSITORY_DIRECTORY);
});

test("bridge execution context sets repository src as PYTHONPATH", () => {
    const CONTEXT = resolveExecutionContext();
    assert.equal(CONTEXT.env.PYTHONPATH, SOURCE_DIRECTORY);
});
