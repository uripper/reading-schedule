import { defineConfig } from "@playwright/test";

const RETRIES_ON_CI = 2;
const RETRIES_OFF_CI = 0;
let retries = RETRIES_OFF_CI;
if (process.env.CI) {
    retries = RETRIES_ON_CI;
}

export default defineConfig({
    expect: {
        timeout: 5_000,
    },
    forbidOnly: Boolean(process.env.CI),
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
