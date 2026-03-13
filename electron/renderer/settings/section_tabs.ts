import { qa } from "../dom.ts";

const DEFAULT_SETTINGS_SECTION = "plan-budget";

/**
 * Activates one settings section and updates tab selected states.
 * @param nextSection - Section id to activate.
 */
function activateSettingsSection(nextSection: string): void {
    const SECTION = String(nextSection);
    for (const CARD of qa<HTMLElement>("[data-settings-section]")) {
        const NEXT_CARD = CARD;
        const ACTIVE = NEXT_CARD.dataset.settingsSection === SECTION;
        NEXT_CARD.hidden = !ACTIVE;
        if (ACTIVE) {
            NEXT_CARD.style.display = "grid";
        } else {
            NEXT_CARD.style.display = "none";
        }
    }
    for (const BUTTON of qa<HTMLElement>(".settings-section-tab")) {
        const ACTIVE = BUTTON.dataset.settingsSectionTarget === SECTION;
        BUTTON.classList.toggle("is-active", ACTIVE);
        let ariaSelected = "false";
        if (ACTIVE) {
            ariaSelected = "true";
        }
        BUTTON.setAttribute("aria-selected", ariaSelected);
    }
}

/**
 * Binds settings section tab click handlers and activates default section.
 */
export function bindSettingsSectionTabs(): void {
    const TABS = qa<HTMLElement>(".settings-section-tab");

    for (const BUTTON of TABS) {
        BUTTON.addEventListener("click", () => {
            const SECTION = BUTTON.dataset.settingsSectionTarget;
            if (typeof SECTION === "string" && SECTION.length > 0) {
                activateSettingsSection(SECTION);
                return;
            }
            activateSettingsSection(DEFAULT_SETTINGS_SECTION);
        });
    }
    activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}
