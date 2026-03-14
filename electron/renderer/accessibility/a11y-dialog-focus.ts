import type { DialogFocusOptions } from "../../types/types.ts";

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

function queryInitialFocusTarget(
    dialog: HTMLDialogElement,
    initialFocusSelector: string | null,
): Element | null {
    if (initialFocusSelector === null || initialFocusSelector === "") {
        return null;
    }
    return dialog.querySelector(initialFocusSelector);
}

function firstFocusableTarget(dialog: HTMLDialogElement): Element | null {
    return (
        queryInitialFocusTarget(dialog, "[autofocus]") ??
        dialog.querySelector(focusableSelector())
    );
}

function focusTarget(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) {
        return false;
    }
    element.focus();
    return true;
}

function currentActiveElement(): HTMLElement | null {
    if (document.activeElement instanceof HTMLElement) {
        return document.activeElement;
    }
    return null;
}

function focusInitialTarget(
    dialog: HTMLDialogElement,
    initialFocusSelector: string | null,
): void {
    const DIRECT_TARGET = queryInitialFocusTarget(dialog, initialFocusSelector);
    if (focusTarget(DIRECT_TARGET)) {
        return;
    }
    focusTarget(firstFocusableTarget(dialog));
}

function closeDialog(dialog: HTMLDialogElement): void {
    if (dialog.open) {
        dialog.close();
    }
}

function restoreOpenerFocus(opener: HTMLElement | null): null {
    if (opener?.isConnected === true) {
        opener.focus();
    }
    return null;
}

function attachCloseFocusHandler(
    dialog: HTMLDialogElement,
    getOpener: () => HTMLElement | null,
    clearOpener: () => void,
): void {
    dialog.addEventListener("close", () => {
        restoreOpenerFocus(getOpener());
        clearOpener();
    });
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
    attachCloseFocusHandler(
        dialog,
        () => opener,
        () => {
            opener = null;
        },
    );

    return {
        closeAndReturnFocus: (): void => {
            closeDialog(dialog);
        },
        focusInitialTarget: (): void => {
            focusInitialTarget(dialog, initialFocusSelector);
        },
        rememberOpener: (): void => {
            opener = currentActiveElement();
        },
    };
}
