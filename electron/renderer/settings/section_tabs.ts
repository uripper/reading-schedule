import { qa } from "../dom.js";

const DEFAULT_SETTINGS_SECTION = "plan-budget";

/**
 * Activates one settings section and updates tab selected states.
 * @param nextSection Section id to activate.
 */
function activateSettingsSection(nextSection: string): void {
  const section = String(nextSection || DEFAULT_SETTINGS_SECTION);
  qa<HTMLElement>("[data-settings-section]").forEach((card) => {
    const active = card.dataset.settingsSection === section;
    card.hidden = !active;
    if (active) {
      card.style.display = "grid";
    } else {
      card.style.display = "none";
    }
  });
  qa<HTMLElement>(".settings-section-tab").forEach((button) => {
    const active = button.dataset.settingsSectionTarget === section;
    button.classList.toggle("is-active", active);
    let ariaSelected = "false";
    if (active) {
      ariaSelected = "true";
    }
    button.setAttribute("aria-selected", ariaSelected);
  });
}

/**
 * Binds settings section tab click handlers and activates default section.
 */
export function bindSettingsSectionTabs(): void {
  const tabs = qa<HTMLElement>(".settings-section-tab");
  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      activateSettingsSection(
        String(button.dataset.settingsSectionTarget || DEFAULT_SETTINGS_SECTION),
      );
    });
  });
  activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}
