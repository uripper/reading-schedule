import {
    test as base,
    type ElectronApplication,
    type Page,
} from "@playwright/test";
import { _electron as electron } from "playwright";

interface BartlebyFixtures {
    electronApp: ElectronApplication;
    window: Page;
}

export const TEST = base.extend<BartlebyFixtures>({
    electronApp: async (
        {},
        use: (value: ElectronApplication) => Promise<void>,
    ) => {
        const LAUNCH_ENV: Record<string, string> = {};
        for (const [KEY, VALUE] of Object.entries(process.env)) {
            if (typeof VALUE === "string") {
                LAUNCH_ENV[KEY] = VALUE;
            }
        }

        LAUNCH_ENV.NODE_ENV = "test";
        LAUNCH_ENV.UI_SCALE = "1";

        const APP = await electron.launch({
            args: ["."],
            env: LAUNCH_ENV,
        });

        await use(APP);
        await APP.close();
    },

    window: async (
        { electronApp }: { electronApp: ElectronApplication },
        use: (value: Page) => Promise<void>,
    ) => {
        const WINDOW = await electronApp.firstWindow();
        await WINDOW.waitForLoadState("domcontentloaded");
        await use(WINDOW);
    },
});

export { expect } from "@playwright/test";
