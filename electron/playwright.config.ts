import { env } from "node:process";
import { defineConfig } from "@playwright/test";

const CI_ENVIRONMENT_KEY = "CI";
const RETRIES_ON_CI = 2;
const RETRIES_OFF_CI = 0;
const IS_CI = typeof env[CI_ENVIRONMENT_KEY] === "string";
let retries = RETRIES_OFF_CI;
if (IS_CI) {
    retries = RETRIES_ON_CI;
}

// biome-ignore lint/style/noDefaultExport: Playwright loads config files from the default export.
export default defineConfig({
    expect: {
        timeout: 5_000,
    },
    forbidOnly: IS_CI,
    fullyParallel: false,
    reporter: [["list"], ["html", { open: "never" }]],
    retries,
    testDir: "./e2e",
    timeout: 30_000,
    use: {
        screenshot: "only-on-failure",
        trace: "on-first-retry",
        video: "retain-on-failure",
    },
    workers: 1,
});
