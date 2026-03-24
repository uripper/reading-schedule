import { qa } from "../dom.ts";

const DEFAULT_SETTINGS_SECTION = "plan-budget";

function sectionTarget(button: HTMLElement): string {
    const SECTION = button.dataset.settingsSectionTarget;
    if (typeof SECTION === "string" && SECTION.length > 0) {
        return SECTION;
    }
    return DEFAULT_SETTINGS_SECTION;
}

function activateSectionCard(card: HTMLElement, section: string): void {
    const TARGET_CARD = card;
    const ACTIVE = TARGET_CARD.dataset.settingsSection === section;
    TARGET_CARD.hidden = !ACTIVE;
    if (ACTIVE) {
        TARGET_CARD.style.display = "grid";
        return;
    }
    TARGET_CARD.style.display = "none";
}

function activateTabButton(button: HTMLElement, section: string): void {
    const TARGET_BUTTON = button;
    const ACTIVE = TARGET_BUTTON.dataset.settingsSectionTarget === section;
    let ariaSelected = "false";
    TARGET_BUTTON.classList.toggle("is-active", ACTIVE);
    if (ACTIVE) {
        ariaSelected = "true";
    }
    TARGET_BUTTON.setAttribute("aria-selected", ariaSelected);
}

/**
 * Activates one settings section and updates tab selected states.
 * @param nextSection - Section id to activate.
 */
function activateSettingsSection(nextSection: string): void {
    const SECTION = String(nextSection);
    for (const CARD of qa<HTMLElement>("[data-settings-section]")) {
        activateSectionCard(CARD, SECTION);
    }
    for (const BUTTON of qa<HTMLElement>(".settings-section-tab")) {
        activateTabButton(BUTTON, SECTION);
    }
}

/**
 * Binds settings section tab click handlers and activates default section.
 */
export function bindSettingsSectionTabs(): void {
    const TABS = qa<HTMLElement>(".settings-section-tab");

    for (const BUTTON of TABS) {
        BUTTON.addEventListener("click", () => {
            activateSettingsSection(sectionTarget(BUTTON));
        });
    }
    activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}
