import { test, expect } from "./fixtures";

test("app boots and exposes planner API", async ({ electronApp, window }) => {
  await expect(window.locator("body")).toBeVisible();

  const hasPlannerApi = await window.evaluate(() => {
    const globalWithPlanner = globalThis as typeof globalThis & {
      plannerApi?: {
        loadState?: unknown;
        generate?: unknown;
      };
    };

    return (
      typeof globalWithPlanner.plannerApi?.loadState === "function" &&
      typeof globalWithPlanner.plannerApi?.generate === "function"
    );
  });

  expect(hasPlannerApi).toBe(true);

  const windowCount = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().length;
  });

  expect(windowCount).toBeGreaterThan(0);
});