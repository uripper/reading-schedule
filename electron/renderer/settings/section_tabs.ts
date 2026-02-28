import { qa } from "../dom.js";

const DEFAULT_SETTINGS_SECTION = "plan-budget";

/**
 * Activates one settings section and updates tab selected states.
 * @param nextSection Section id to activate.
 */
function activateSettingsSection(nextSection: string): void {
	const section = String(nextSection);
	for (const card of qa<HTMLElement>("[data-settings-section]")) {
		const nextCard = card;
		const active = nextCard.dataset.settingsSection === section;
		nextCard.hidden = !active;
		if (active) {
			nextCard.style.display = "grid";
		} else {
			nextCard.style.display = "none";
		}
	}
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
			const section = button.dataset.settingsSectionTarget;
			if (typeof section === "string" && section.length > 0) {
				activateSettingsSection(section);
				return;
			}
			activateSettingsSection(DEFAULT_SETTINGS_SECTION);
		});
	});
	activateSettingsSection(DEFAULT_SETTINGS_SECTION);
}
