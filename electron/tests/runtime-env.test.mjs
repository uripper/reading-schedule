// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { env } from "node:process";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const { isProductionEnvironment, processEnvironment, readEnvironmentValue } =
    REQUIRE("../dist/main/runtime-env.js");

test("runtime env readers expose live process environment values", () => {
    env.BARTLEBY_TEST_ENV = "set";
    assert.equal(readEnvironmentValue("BARTLEBY_TEST_ENV"), "set");
    assert.equal(processEnvironment(), env);
    delete env.BARTLEBY_TEST_ENV;
});

test("isProductionEnvironment only matches a production NODE_ENV value", () => {
    const PREVIOUS = env.NODE_ENV;
    env.NODE_ENV = "production";
    assert.equal(isProductionEnvironment(), true);
    env.NODE_ENV = "development";
    assert.equal(isProductionEnvironment(), false);
    if (PREVIOUS === undefined) {
        delete env.NODE_ENV;
    } else {
        env.NODE_ENV = PREVIOUS;
    }
});
