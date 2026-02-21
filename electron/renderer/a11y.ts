import { el } from "./dom.js";
const ANNOUNCE_DELAY_MS = 30;
type AnnouncePoliteness = "polite" | "assertive";

type PreferencesInput = {
  theme?: string;
  reduceMotion?: boolean;
};

type DialogFocusOptions = {
  initialFocusSelector?: string | null;
};

function focusableSelector() {
  return [
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
}

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

export function bindDialogFocus(
  dialog: HTMLDialogElement,
  { initialFocusSelector = null }: DialogFocusOptions = {},
) {
  let opener: HTMLElement | null = null;
  const rememberOpener = () => {
    opener = null;
    if (document.activeElement instanceof HTMLElement) {
      opener = document.activeElement;
    }
  };
  const focusInitialTarget = () => {
    let direct = null;
    if (initialFocusSelector) {
      direct = dialog.querySelector(initialFocusSelector);
    }
    if (direct instanceof HTMLElement) {
      direct.focus();
      return;
    }
    const autoFocus = dialog.querySelector("[autofocus]");
    if (autoFocus instanceof HTMLElement) {
      autoFocus.focus();
      return;
    }
    const first = dialog.querySelector(focusableSelector());
    if (first instanceof HTMLElement) {
      first.focus();
    }
  };
  const closeAndReturnFocus = () => {
    if (dialog.open) {
      dialog.close();
    }
  };
  dialog.addEventListener("close", () => {
    if (opener?.isConnected) {
      opener.focus();
    }
    opener = null;
  });
  return { rememberOpener, focusInitialTarget, closeAndReturnFocus };
}
