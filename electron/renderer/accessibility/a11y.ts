import { el } from "../dom.js";

const ANNOUNCE_DELAY_MS = 30;
type AnnouncePoliteness = "polite" | "assertive";

type PreferencesInput = {
  theme?: string;
  reduceMotion?: boolean;
};

export function focusFirstError(
  formElement: HTMLElement | null | undefined,
): HTMLElement | null {
  if (!(formElement instanceof HTMLElement)) {
    return null;
  }
  const invalid = formElement.querySelector(":invalid");
  if (invalid instanceof HTMLElement) {
    invalid.focus();
    return invalid;
  }
  return null;
}

export function createAnnouncer(regionId = "liveRegion") {
  const region = el(regionId);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;
  return (message: string, politeness: AnnouncePoliteness = "polite") => {
    if (!region || !message) {
      return;
    }
    if (clearTimer) {
      clearTimeout(clearTimer);
    }
    region.setAttribute("aria-live", politeness);
    region.textContent = "";
    clearTimer = setTimeout(() => {
      region.textContent = String(message);
    }, ANNOUNCE_DELAY_MS);
  };
}

export function applyPreferencesToDocument(preferences: PreferencesInput = {}) {
  let theme = "system";
  if (
    typeof preferences.theme === "string" &&
    ["system", "light", "dark"].includes(preferences.theme)
  ) {
    theme = preferences.theme;
  }
  const reduceMotion = Boolean(preferences.reduceMotion);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.reduceMotion = "false";
  if (reduceMotion) {
    root.dataset.reduceMotion = "true";
  }
}

export { bindDialogFocus } from "./a11y_dialog_focus.js";
