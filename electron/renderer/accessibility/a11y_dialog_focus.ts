import type { DialogFocusOptions } from "../../types/types.js";

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
 * @param initialFocusSelector - CSS selector for the element that should
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
    const REMEMBER_OPENER = (): void => {
        opener = null;
        if (document.activeElement instanceof HTMLElement) {
            opener = document.activeElement;
        }
    };
    /**
     * Set focus inside a dialog element using an initial selector, an [autofocus] element, or the first focusable element.
     * @example
     * setDialogFocus(dialogElement, '#initial', () => 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
     * undefined
     * @param {{Element}} {{dialog}} - Dialog element to search and set focus within.
     * @param {{string|null}} {{initialFocusSelector}} - CSS selector for an initial focus target; may be null or empty to skip.
     * @param {{() => string}} {{focusableSelector}} - Function that returns a CSS selector matching focusable elements inside the dialog.
     * @returns {{void}} No return value.
     **/
    const FOCUS_INITIAL_TARGET = (): void => {
        let direct: Element | null = null;
        if (initialFocusSelector !== null && initialFocusSelector !== "") {
            direct = dialog.querySelector(initialFocusSelector);
        }
        if (direct instanceof HTMLElement) {
            direct.focus();
            return;
        }

        const AUTO_FOCUS = dialog.querySelector("[autofocus]");
        if (AUTO_FOCUS instanceof HTMLElement) {
            AUTO_FOCUS.focus();
            return;
        }

        const FIRST = dialog.querySelector(focusableSelector());
        if (FIRST instanceof HTMLElement) {
            FIRST.focus();
        }
    };
    const CLOSE_AND_RETURN_FOCUS = (): void => {
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

    return {
        closeAndReturnFocus: CLOSE_AND_RETURN_FOCUS,
        focusInitialTarget: FOCUS_INITIAL_TARGET,
        rememberOpener: REMEMBER_OPENER,
    };
}
