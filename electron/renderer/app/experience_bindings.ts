import { el } from "../dom.js";

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

type ExperienceSettingsApplyHandler = (event: Event) => void;

function experienceControlNode(id: string): HTMLElement | null {
  const node = globalThis.document.getElementById(id);
  if (node instanceof HTMLElement) {
    return node;
  }
  return null;
}

function disableHiddenControl(node: HTMLElement): void {
  if (node instanceof HTMLInputElement) {
    node.disabled = true;
    if (node.type === "checkbox") {
      node.checked = false;
      return;
    }
    if (node.type === "time") {
      node.value = DEFAULT_REMINDER_TIME;
    }
    return;
  }
  if (node instanceof HTMLSelectElement) {
    node.disabled = true;
  }
}

function hideControlContainer(node: HTMLElement): void {
  let container: HTMLElement = node;
  const labelNode = node.closest("label");
  if (labelNode instanceof HTMLElement) {
    container = labelNode;
  }
  container.hidden = true;
}

function hideUnshippedControlById(id: string): void {
  const node = experienceControlNode(id);
  if (!node) {
    return;
  }
  disableHiddenControl(node);
  hideControlContainer(node);
}

function hideUnshippedExperienceControls(): void {
  HIDDEN_EXPERIENCE_CONTROL_IDS.forEach((id) => {
    hideUnshippedControlById(id);
  });
}

export function bindExperienceSettings(
  onApplySettings: ExperienceSettingsApplyHandler,
): void {
  hideUnshippedExperienceControls();
  EXPERIENCE_SETTING_IDS.forEach((id) => {
    const node = el(id);
    node.addEventListener("change", onApplySettings);
  });
}
