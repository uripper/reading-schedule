// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const { HOT_RELOAD_IGNORED_OUTPUTS, enableDevelopmentHotReload } = REQUIRE(
    "../dist/main/development-hot-reload.js",
);

const TEST_MODULE = {
    children: [],
    filename: "/tmp/bartleby-main.js",
};

test("development hot reload skips packaged launches", async () => {
    let importerCalls = 0;
    let reloadCalls = 0;
    await enableDevelopmentHotReload({
        importElectronReloader: () => {
            importerCalls += 1;
            return Promise.resolve({
                default: () => {
                    reloadCalls += 1;
                },
            });
        },
        isPackaged: true,
        targetModule: TEST_MODULE,
    });
    assert.equal(importerCalls, 0);
    assert.equal(reloadCalls, 0);
});

test("development hot reload forwards the module and watch options", async () => {
    let capturedModule = null;
    let capturedOptions = null;
    await enableDevelopmentHotReload({
        importElectronReloader: () => {
            return Promise.resolve({
                default: (targetModule, options) => {
                    capturedModule = targetModule;
                    capturedOptions = options;
                },
            });
        },
        isPackaged: false,
        targetModule: TEST_MODULE,
    });
    assert.equal(capturedModule, TEST_MODULE);
    assert.deepEqual(capturedOptions, {
        ignore: HOT_RELOAD_IGNORED_OUTPUTS,
        watchRenderer: true,
    });
});
