import { defineConfig } from "@playwright/test";

export default defineConfig({
    expect: {
        timeout: 5_000,
    },
    forbidOnly: Boolean(process.env.CI),
    fullyParallel: false,
    reporter: [["list"], ["html", { open: "never" }]],
    retries: process.env.CI ? 2 : 0,
    testDir: "./e2e",
    timeout: 30_000,
    use: {
        screenshot: "only-on-failure",
        trace: "on-first-retry",
        video: "retain-on-failure",
    },
    workers: 1,
});
