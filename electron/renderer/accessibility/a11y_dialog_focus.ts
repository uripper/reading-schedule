interface DialogFocusOptions {
  initialFocusSelector?: string | null;
}

/**
 * Returns a CSS selector string matching all interactive, focusable elements
 * that are not disabled or explicitly removed from the tab order.
 * @returns A comma-separated CSS selector string for focusable elements.
 */
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

/**
 * Binds focus management to a `<dialog>` element, handling focus on open,
 * focus restoration on close, and a programmatic close helper.
 * @param dialog - The `<dialog>` element to bind focus management to.
 * @param root0 - Options controlling focus behavior.
 * @param root0.initialFocusSelector - CSS selector for the element that should
 *   receive focus when the dialog opens. Falls back to `[autofocus]`, then the
 *   first focusable element if not provided or not found.
 * @returns An object containing `rememberOpener`, `focusInitialTarget`, and
 *   `closeAndReturnFocus` handlers to be called at the appropriate lifecycle points.
 */
export function bindDialogFocus(
  dialog: HTMLDialogElement,
  { initialFocusSelector = null }: DialogFocusOptions = {},
): {
  rememberOpener(): void;
  focusInitialTarget(): void;
  closeAndReturnFocus(): void;
} {
  let opener: HTMLElement | null = null;
  const rememberOpener = (): void => {
    opener = null;
    if (document.activeElement instanceof HTMLElement) {
      opener = document.activeElement;
    }
  };
  const focusInitialTarget = (): void => {
    let direct: Element | null = null;
    if (initialFocusSelector !== null && initialFocusSelector !== "") {
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
  const closeAndReturnFocus = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  dialog.addEventListener("close", (): void => {
    if (opener?.isConnected === true) {
      opener.focus();
    }
    opener = null;
  });

  return { rememberOpener, focusInitialTarget, closeAndReturnFocus };
}
