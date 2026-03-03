import { qa } from "../dom.js";

const DEFAULT_SETTINGS_SECTION = "plan-budget";

/**
 * Activates one settings section and updates tab selected states.
 * @param nextSection Section id to activate.
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
    // biome-ignore lint/complexity/noForEach: tracked for incremental cleanup
    qa<HTMLElement>(".settings-section-tab").forEach((button) => {
        const ACTIVE = button.dataset.settingsSectionTarget === SECTION;
        button.classList.toggle("is-active", ACTIVE);
        let ariaSelected = "false";
        if (ACTIVE) {
            ariaSelected = "true";
        }
        button.setAttribute("aria-selected", ariaSelected);
    });
}

/**
 * Binds settings section tab click handlers and activates default section.
 */
export function bindSettingsSectionTabs(): void {
    const TABS = qa<HTMLElement>(".settings-section-tab");
    // biome-ignore lint/complexity/noForEach: tracked for incremental cleanup
    TABS.forEach((button) => {
        button.addEventListener("click", () => {
            const SECTION = button.dataset.settingsSectionTarget;
            if (typeof SECTION === "string" && SECTION.length > 0) {
                activateSettingsSection(SECTION);
                return;
            }
            activateSettingsSection(DEFAULT_SETTINGS_SECTION);
        });
    });
    activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}
