import { expect, TEST } from "./fixtures";

TEST("app boots and exposes planner API", async ({ electronApp, window }) => {
    await expect(window.locator("body")).toBeVisible();

    const HAS_PLANNER_API = await window.evaluate(() => {
        const GLOBAL_WITH_PLANNER = globalThis as typeof globalThis & {
            plannerApi?: {
                loadState?: unknown;
                generate?: unknown;
            };
        };

        return (
            typeof GLOBAL_WITH_PLANNER.plannerApi?.loadState === "function" &&
            typeof GLOBAL_WITH_PLANNER.plannerApi?.generate === "function"
        );
    });

    expect(HAS_PLANNER_API).toBe(true);

    const WINDOW_COUNT = await electronApp.evaluate(
        (electronModule: Record<string, unknown>) => {
            const BROWSER_WINDOW =
                electronModule.BrowserWindow as typeof import("electron").BrowserWindow;
            return BROWSER_WINDOW.getAllWindows().length;
        },
    );

    expect(WINDOW_COUNT).toBeGreaterThan(0);
});
