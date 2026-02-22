type DialogFocusOptions = {
  initialFocusSelector?: string | null;
};

function focusableSelector(): string {
  return [
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
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
    let direct: Element | null = null;
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
