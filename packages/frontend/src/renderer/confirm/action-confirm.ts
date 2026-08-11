// audit-allow-local-types: Confirmation options and DOM nodes are renderer-private.

interface ActionConfirmOptions {
    cancelLabel?: string;
    confirmLabel: string;
    message: string;
    title: string;
    warning?: string;
}

const CANCEL_LABEL = "Cancel";
const DESTRUCTIVE_WARNING = "This action cannot be undone.";
const OPEN_ATTRIBUTE = "open";
const TITLE_ID = "actionConfirmTitle";

interface ConfirmDialogNodes {
    cancelButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    confirmButton: HTMLButtonElement;
    dialog: HTMLDialogElement;
}

type FinishConfirm = (confirmed: boolean) => void;

function appendTextNode(
    parent: HTMLElement,
    className: string,
    text: string,
): void {
    const NODE = document.createElement("p");
    NODE.className = className;
    NODE.textContent = text;
    parent.append(NODE);
}

function titleBar(title: string): HTMLElement {
    const BAR = document.createElement("header");
    BAR.className = "action-confirm-titlebar";
    const TITLE = document.createElement("strong");
    TITLE.id = TITLE_ID;
    TITLE.textContent = title;
    BAR.append(TITLE);
    return BAR;
}

function buttonNode(className: string, label: string): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = className;
    BUTTON.textContent = label;
    return BUTTON;
}

function appendWarning(body: HTMLElement, warning: string | undefined): void {
    if (warning === undefined) {
        return;
    }
    appendTextNode(body, "action-confirm-warning", warning);
}

function dialogBody(options: ActionConfirmOptions): HTMLElement {
    const BODY = document.createElement("section");
    BODY.className = "action-confirm-body";
    appendTextNode(BODY, "action-confirm-message", options.message);
    appendWarning(BODY, options.warning);
    return BODY;
}

function dialogActions(options: ActionConfirmOptions): {
    actions: HTMLElement;
    cancelButton: HTMLButtonElement;
    confirmButton: HTMLButtonElement;
} {
    const ACTIONS = document.createElement("footer");
    ACTIONS.className = "action-confirm-actions";
    const CANCEL_BUTTON = buttonNode(
        "action-confirm-btn action-confirm-cancel",
        options.cancelLabel ?? CANCEL_LABEL,
    );
    const CONFIRM_BUTTON = buttonNode(
        "action-confirm-btn action-confirm-accept",
        options.confirmLabel,
    );
    ACTIONS.append(CANCEL_BUTTON, CONFIRM_BUTTON);
    return {
        actions: ACTIONS,
        cancelButton: CANCEL_BUTTON,
        confirmButton: CONFIRM_BUTTON,
    };
}

function createConfirmDialog(
    options: ActionConfirmOptions,
): ConfirmDialogNodes {
    const DIALOG = document.createElement("dialog");
    DIALOG.className = "action-confirm-dialog";
    DIALOG.setAttribute("aria-labelledby", TITLE_ID);
    const TITLE_BAR = titleBar(options.title);
    const CLOSE_BUTTON = buttonNode("action-confirm-close", "X");
    CLOSE_BUTTON.setAttribute("aria-label", "Cancel");
    TITLE_BAR.append(CLOSE_BUTTON);
    const BODY = dialogBody(options);
    const ACTIONS = dialogActions(options);
    DIALOG.append(TITLE_BAR, BODY, ACTIONS.actions);
    return {
        cancelButton: ACTIONS.cancelButton,
        closeButton: CLOSE_BUTTON,
        confirmButton: ACTIONS.confirmButton,
        dialog: DIALOG,
    };
}

function removeDialog(dialog: HTMLDialogElement): void {
    if (dialog.parentElement !== null) {
        dialog.parentElement.removeChild(dialog);
    }
}

function closeDialog(dialog: HTMLDialogElement): void {
    if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
        return;
    }
    removeDialog(dialog);
}

function openDialog(dialog: HTMLDialogElement): void {
    document.body.append(dialog);
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
        return;
    }
    dialog.setAttribute(OPEN_ATTRIBUTE, OPEN_ATTRIBUTE);
}

function bindConfirmDialogEvents(
    nodes: ConfirmDialogNodes,
    finish: FinishConfirm,
): void {
    nodes.cancelButton.addEventListener("click", () => {
        finish(false);
    });
    nodes.closeButton.addEventListener("click", () => {
        finish(false);
    });
    nodes.confirmButton.addEventListener("click", () => {
        finish(true);
    });
    nodes.dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(false);
    });
}

function finishOnce(
    nodes: ConfirmDialogNodes,
    resolve: (value: boolean) => void,
): FinishConfirm {
    let resolved = false;
    return (confirmed: boolean): void => {
        if (resolved) {
            return;
        }
        resolved = true;
        closeDialog(nodes.dialog);
        removeDialog(nodes.dialog);
        resolve(confirmed);
    };
}

/**
 * Opens the shared confirmation dialog and resolves with the selected action.
 * @param options - Dialog copy and optional warning text.
 * @returns Whether the user confirmed the action.
 */
export function confirmAction(options: ActionConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        const NODES = createConfirmDialog(options);
        bindConfirmDialogEvents(NODES, finishOnce(NODES, resolve));
        openDialog(NODES.dialog);
        NODES.cancelButton.focus();
    });
}

/**
 * Opens a confirmation dialog with the standard irreversible-action warning.
 * @param options - Dialog copy for a destructive action.
 * @returns Whether the user confirmed the action.
 */
export function confirmDestructiveAction(
    options: ActionConfirmOptions,
): Promise<boolean> {
    return confirmAction({
        ...options,
        warning: DESTRUCTIVE_WARNING,
    });
}
