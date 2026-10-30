/** Renders the Kobo provider switch and file selection in Sync settings. */
import type { Preferences } from "@reading-schedule/contracts";
import { syncActionButton, syncElement } from "../sync/dom.ts";

/** Keeps existing configured readers enabled when upgrading from path-only settings. */
export function koboSyncEnabled(preferences: Partial<Preferences>): boolean {
    return preferences.koboSyncEnabled ?? Boolean(preferences.koboDatabasePath);
}

/** Creates the provider checkbox, with its associated controls revealed on enable. */
function providerSwitch(enabled: boolean) {
    const LABEL = syncElement("label");
    LABEL.className = "kobo-provider-switch";
    const ENABLE = syncElement("input");
    ENABLE.type = "checkbox";
    ENABLE.checked = enabled;
    ENABLE.setAttribute("aria-controls", "koboSyncControls");
    LABEL.append(ENABLE, syncElement("span", "Kobo"));
    return { enable: ENABLE, label: LABEL };
}

/** Creates the minimal file and retry controls, leaving persistence to the runtime. */
function providerControls() {
    const PANEL = syncElement("div");
    PANEL.id = "koboSyncControls";
    PANEL.className = "kobo-sync-controls";
    const FILE = syncElement("p");
    FILE.className = "kobo-selected-file";
    const BROWSE = syncActionButton("Browse…");
    const CHECK = syncActionButton("Check now");
    const ACTIONS = syncElement("div");
    ACTIONS.className = "sync-actions";
    ACTIONS.append(BROWSE, CHECK);
    PANEL.append(fileLocationHint(), FILE, ACTIONS);
    return {
        browse: BROWSE,
        check: CHECK,
        file: FILE,
        panel: PANEL,
        status: providerStatus(),
    };
}

/** Keeps the expected device path inside the provider's collapsible controls. */
function fileLocationHint(): HTMLParagraphElement {
    const HINT = syncElement("p", "Usually located at ");
    HINT.className = "kobo-location-hint";
    HINT.append(syncElement("code", "device/.kobo/KoboReader.sqlite"));
    return HINT;
}

/** Keeps connection changes and recovery messages in one accessible badge. */
function providerStatus(): HTMLParagraphElement {
    const STATUS = syncElement("p");
    STATUS.className = "kobo-status";
    STATUS.setAttribute("role", "status");
    STATUS.setAttribute("aria-atomic", "true");
    return STATUS;
}

/** Populates the Sync tab without exposing device controls on browser-only hosts. */
export function createKoboSettings(preferences: Preferences) {
    const SECTION = syncElement("section");
    SECTION.className = "kobo-settings";
    const SWITCH = providerSwitch(koboSyncEnabled(preferences));
    const CONTROLS = providerControls();
    const HEADER = syncElement("div");
    HEADER.className = "kobo-provider-header";
    HEADER.append(SWITCH.label, CONTROLS.status);
    SECTION.append(HEADER, CONTROLS.panel);
    const COMING_SOON = syncElement("p", "More coming soon!");
    COMING_SOON.className = "sync-coming-soon";
    document.getElementById("syncProviders")?.append(SECTION, COMING_SOON);
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
    setKoboStatus(NODES.status, "");
}

/** Styles a confirmed connection distinctly while keeping recovery messages readable. */
export function setKoboStatus(status: HTMLElement, message: string): void {
    const STATUS = status;
    STATUS.textContent = message;
    STATUS.classList.toggle("is-connected", message === "Connected");
}
