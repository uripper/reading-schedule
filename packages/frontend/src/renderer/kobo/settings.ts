/** Renders the Kobo provider switch and file selection in Sync settings. */
import type { Preferences } from "@reading-schedule/contracts";
import { koboActionButton, koboElement } from "./dom.ts";

/** Keeps existing configured readers enabled when upgrading from path-only settings. */
export function koboSyncEnabled(preferences: Partial<Preferences>): boolean {
    return preferences.koboSyncEnabled ?? Boolean(preferences.koboDatabasePath);
}

/** Creates the provider checkbox, with its associated controls revealed on enable. */
function providerSwitch(enabled: boolean) {
    const LABEL = koboElement("label");
    LABEL.className = "kobo-provider-switch";
    const ENABLE = koboElement("input");
    ENABLE.type = "checkbox";
    ENABLE.checked = enabled;
    ENABLE.setAttribute("aria-controls", "koboSyncControls");
    LABEL.append(ENABLE, koboElement("span", "Kobo"));
    return { enable: ENABLE, label: LABEL };
}

/** Creates the minimal file and retry controls, leaving persistence to the runtime. */
function providerControls() {
    const PANEL = koboElement("div");
    PANEL.id = "koboSyncControls";
    PANEL.className = "kobo-sync-controls";
    const FILE = koboElement("p");
    FILE.className = "kobo-selected-file";
    const BROWSE = koboActionButton("Browse…");
    const CHECK = koboActionButton("Check now");
    const ACTIONS = koboElement("div");
    ACTIONS.className = "kobo-actions";
    const STATUS = koboElement("p");
    STATUS.setAttribute("role", "status");
    ACTIONS.append(BROWSE, CHECK);
    PANEL.append(FILE, ACTIONS);
    return {
        browse: BROWSE,
        check: CHECK,
        file: FILE,
        panel: PANEL,
        status: STATUS,
    };
}

/** Populates the Sync tab without exposing device controls on browser-only hosts. */
export function createKoboSettings(preferences: Preferences) {
    const SECTION = koboElement("section");
    SECTION.className = "kobo-settings";
    const SWITCH = providerSwitch(koboSyncEnabled(preferences));
    const CONTROLS = providerControls();
    SECTION.append(SWITCH.label, CONTROLS.panel, CONTROLS.status);
    document.getElementById("syncProviders")?.append(SECTION);
    const TAB = document.getElementById("syncSettingsTab");
    if (TAB !== null) {
        TAB.hidden = false;
    }
    const NODES = { ...CONTROLS, enable: SWITCH.enable };
    renderKoboSettings(NODES, preferences);
    return NODES;
}

/** Restores the persisted configuration after saves and cancelled file selections. */
export function renderKoboSettings(
    nodes: ReturnType<typeof createKoboSettings>,
    preferences: Preferences,
): void {
    const NODES = nodes;
    NODES.enable.checked = koboSyncEnabled(preferences);
    NODES.enable.setAttribute("aria-expanded", String(NODES.enable.checked));
    NODES.panel.hidden = !NODES.enable.checked;
    NODES.file.textContent =
        preferences.koboDatabasePath?.split(/[\\/]/).at(-1) ||
        "No file selected";
    NODES.file.title = preferences.koboDatabasePath ?? "";
    NODES.check.disabled = !preferences.koboDatabasePath;
    NODES.status.textContent = "";
}
