import { el } from "../../dom.js";
import type { ExperienceSettingsApplyHandler } from "../../../types/types_experience.js";

const EXPERIENCE_SETTING_IDS: readonly string[] = [
  "themeSelect",
  "reduceMotionToggle",
  "dailyGoalInput",
  "reminderEnabledToggle",
  "reminderTimeInput",
  "flagGamification",
  "flagSocial",
  "flagRecommendations",
];
const HIDDEN_EXPERIENCE_CONTROL_IDS: readonly string[] = [
  "reminderEnabledToggle",
  "reminderTimeInput",
  "flagSocial",
  "flagRecommendations",
];
const DEFAULT_REMINDER_TIME = "20:00";

/**
 * Helper to get an experience control node by ID, ensuring it's an HTMLElement.
 * @param id ID of the control element to retrieve.
 * @returns The HTMLElement if found and valid, otherwise null.
 */
function experienceControlNode(id: string): HTMLElement | null {
  const node = globalThis.document.getElementById(id);
  if (node instanceof HTMLElement) {
    return node;
  }
  return null;
}

/**
 * Disables an input or select control and resets its value if necessary.
 * @param node The HTMLElement to disable and reset.
 * For checkboxes, it will be unchecked. For time inputs, it will be reset to a default time.
 * For select elements, it will simply be disabled without changing the selected option.
 * For other input types, it will be disabled without changing the value.
 */
function disableHiddenControl(node: HTMLElement): void {
  const control = node;

  if (control instanceof HTMLInputElement) {
    control.disabled = true;
    if (control.type === "checkbox") {
      control.checked = false;
      return;
    }
    if (control.type === "time") {
      control.value = DEFAULT_REMINDER_TIME;
    }
    return;
  }
  if (control instanceof HTMLSelectElement) {
    control.disabled = true;
  }
}

/**
 * Hides the control container for a given node. If the node is within a label,
 * the entire label will be hidden.
 * @param node The HTMLElement whose container should be hidden.
 */
function hideControlContainer(node: HTMLElement): void {
  let container: HTMLElement = node;
  const labelNode = node.closest("label");
  if (labelNode instanceof HTMLElement) {
    container = labelNode;
  }
  container.hidden = true;
}

/**
 * Hides and disables an unshipped control by its ID.
 * @param id ID of the control element to hide and disable.
 */
function hideUnshippedControlById(id: string): void {
  const node = experienceControlNode(id);
  if (!node) {
    return;
  }
  disableHiddenControl(node);
  hideControlContainer(node);
}

/**
 * Hides and disables all unshipped experience controls.
 */
function hideUnshippedExperienceControls(): void {
  HIDDEN_EXPERIENCE_CONTROL_IDS.forEach((id) => {
    hideUnshippedControlById(id);
  });
}

/**
 * Binds event listeners to experience settings controls.
 * @param onApplySettings Handler function to call when settings are applied.
 */
export function bindExperienceSettings(
  onApplySettings: ExperienceSettingsApplyHandler,
): void {
  hideUnshippedExperienceControls();
  EXPERIENCE_SETTING_IDS.forEach((id) => {
    const node = el(id);
    node.addEventListener("change", onApplySettings);
  });
}
