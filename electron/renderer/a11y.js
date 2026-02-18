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
  const theme = ["system", "light", "dark"].includes(preferences.theme) ? preferences.theme : "system";
  const reduceMotion = Boolean(preferences.reduceMotion);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.reduceMotion = reduceMotion ? "true" : "false";
}

export function bindDialogFocus(dialog, { initialFocusSelector = null } = {}) {
  let opener = null;

  function rememberOpener() {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function focusInitialTarget() {
    const direct = initialFocusSelector ? dialog.querySelector(initialFocusSelector) : null;
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
