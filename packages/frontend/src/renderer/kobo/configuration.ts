/** Persists Kobo enablement and native file selections with retryable UI recovery. */
import type {
    AppBootstrapContext,
    Preferences,
} from "@reading-schedule/contracts";
import type { createKoboMonitor } from "./monitor.ts";
import { koboErrorMessage } from "./monitor.ts";
import type { createKoboSettings } from "./settings.ts";
import { renderKoboSettings } from "./settings.ts";

// audit-allow-local-types: DOM controls and monitor belong to this renderer only.
type ConfigurationControls = Parameters<typeof bindKoboConfiguration>[1];

/** Saves only Kobo preferences and restores their previous values if saving fails. */
export async function saveKoboConfiguration(
    context: Pick<AppBootstrapContext, "state" | "persistDraft">,
    update: Pick<
        Preferences,
        "koboDatabasePath" | "koboSyncEnabled" | "koboIgnoredContentIds"
    >,
): Promise<void> {
    const STATE = context.state;
    const PREVIOUS = STATE.preferences;
    STATE.preferences = { ...PREVIOUS, ...update };
    try {
        if (!(await context.persistDraft())) {
            throw new Error("Settings save failed.");
        }
    } catch (error) {
        STATE.preferences = {
            ...STATE.preferences,
            koboDatabasePath: PREVIOUS.koboDatabasePath,
            koboIgnoredContentIds: PREVIOUS.koboIgnoredContentIds,
            koboSyncEnabled: PREVIOUS.koboSyncEnabled,
        };
        throw new Error("Could not save Kobo settings. Please retry.", {
            cause: error,
        });
    }
}

/** Prevents overlapping configuration changes and popups behind the native file chooser. */
function setBusy(controls: ConfigurationControls, busy: boolean): void {
    const NODES = controls.nodes;
    NODES.enable.disabled = busy;
    NODES.browse.disabled = busy;
    NODES.check.disabled = busy;
}

/** Applies a configuration action and restores persisted controls on cancellation or error. */
async function configure(
    context: AppBootstrapContext,
    controls: ConfigurationControls,
    action: () => Promise<boolean>,
): Promise<void> {
    setBusy(controls, true);
    let changed = false;
    try {
        changed = await action();
        renderKoboSettings(controls.nodes, context.state.preferences);
    } catch (error) {
        renderKoboSettings(controls.nodes, context.state.preferences);
        controls.nodes.status.textContent = koboErrorMessage(error);
    } finally {
        setBusy(controls, false);
        controls.nodes.check.disabled =
            !context.state.preferences.koboDatabasePath;
    }
    if (changed) {
        await controls.monitor.check(true);
    }
}

/** File-picker cancellation preserves both the saved path and existing connection state. */
async function browse(
    context: AppBootstrapContext,
    controls: ConfigurationControls,
): Promise<boolean> {
    const PATH = await controls.pick(
        context.state.preferences.koboDatabasePath,
    );
    if (PATH === null) {
        return false;
    }
    await saveKoboConfiguration(context, {
        koboDatabasePath: PATH,
        koboSyncEnabled: true,
    });
    return true;
}

/** Routes async actions to an accessible status message. */
function run(
    action: () => Promise<void>,
    controls: ConfigurationControls,
): void {
    action().catch((error: unknown) => {
        const STATUS = controls.nodes.status;
        STATUS.textContent = koboErrorMessage(error);
    });
}

/** Connects provider enablement, file browsing, and manual retry actions. */
export function bindKoboConfiguration(
    context: AppBootstrapContext,
    controls: {
        monitor: ReturnType<typeof createKoboMonitor>;
        nodes: ReturnType<typeof createKoboSettings>;
        pick(databasePath?: string): Promise<string | null>;
    },
): void {
    controls.nodes.browse.addEventListener("click", () => {
        run(async () => {
            await configure(
                context,
                controls,
                async () => await browse(context, controls),
            );
        }, controls);
    });
    controls.nodes.enable.addEventListener("change", () => {
        run(async () => {
            await configure(context, controls, async () => {
                await saveKoboConfiguration(context, {
                    koboSyncEnabled: controls.nodes.enable.checked,
                });
                return true;
            });
        }, controls);
    });
    controls.nodes.check.addEventListener("click", () => {
        run(async () => {
            await controls.monitor.check(true);
        }, controls);
    });
}
