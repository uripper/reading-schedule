import { el } from "./dom.js";

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

export function focusFirstError(formElement) {
  if (!(formElement instanceof HTMLElement)) return null;
  const invalid = formElement.querySelector(":invalid");
  if (invalid instanceof HTMLElement) {
    invalid.focus();
    return invalid;
  }
  return null;
}

export function createAnnouncer(regionId = "liveRegion") {
  const region = el(regionId);
  let clearTimer = null;
  return (message, politeness = "polite") => {
    if (!region || !message) return;
    if (clearTimer) clearTimeout(clearTimer);
    region.setAttribute("aria-live", politeness);
    region.textContent = "";
    clearTimer = setTimeout(() => {
      region.textContent = String(message);
    }, 30);
  };
}

export function applyPreferencesToDocument(preferences = {}) {
  let theme = "system";
  if (["system", "light", "dark"].includes(preferences.theme)) {
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

export function bindDialogFocus(dialog, { initialFocusSelector = null } = {}) {
  let opener = null;

  function rememberOpener() {
    opener = null;
    if (document.activeElement instanceof HTMLElement) {
      opener = document.activeElement;
    }
  }

  function focusInitialTarget() {
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
    if (first instanceof HTMLElement) first.focus();
  }

  function closeAndReturnFocus() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", () => {
    if (opener && opener.isConnected) opener.focus();
    opener = null;
  });

  return {
    rememberOpener,
    focusInitialTarget,
    closeAndReturnFocus,
  };
}
