import {
    test as base,
    type ElectronApplication,
    expect,
    type Page,
} from "@playwright/test";
import { _electron as electron } from "playwright";

type BartlebyFixtures = {
    electronApp: ElectronApplication;
    window: Page;
};

export const test = base.extend<BartlebyFixtures>({
    electronApp: async ({}, use) => {
        const APP = await electron.launch({
            args: ["."],
            env: {
                ...process.env,
                NODE_ENV: "test",
                UI_SCALE: "1",
            },
        });

        await use(APP);
        await APP.close();
    },

    window: async ({ electronApp }, use) => {
        const WINDOW = await electronApp.firstWindow();
        await WINDOW.waitForLoadState("domcontentloaded");
        await use(WINDOW);
    },
});

export { expect } from "@playwright/test";
