interface DestructiveConfirmOptions {
    cancelLabel?: string;
    confirmLabel: string;
    message: string;
    title: string;
}

const CANCEL_LABEL = "Cancel";
const WARNING_TEXT = "This action cannot be undone.";
const OPEN_ATTRIBUTE = "open";
const TITLE_ID = "dangerConfirmTitle";

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
    BAR.className = "danger-confirm-titlebar";
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

function dialogBody(options: DestructiveConfirmOptions): HTMLElement {
    const BODY = document.createElement("section");
    BODY.className = "danger-confirm-body";
    appendTextNode(BODY, "danger-confirm-message", options.message);
    appendTextNode(BODY, "danger-confirm-warning", WARNING_TEXT);
    return BODY;
}

function dialogActions(options: DestructiveConfirmOptions): {
    actions: HTMLElement;
    cancelButton: HTMLButtonElement;
    confirmButton: HTMLButtonElement;
} {
    const ACTIONS = document.createElement("footer");
    ACTIONS.className = "danger-confirm-actions";
    const CANCEL_BUTTON = buttonNode(
        "danger-confirm-btn danger-confirm-cancel",
        options.cancelLabel ?? CANCEL_LABEL,
    );
    const CONFIRM_BUTTON = buttonNode(
        "danger-confirm-btn danger-confirm-accept",
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
    options: DestructiveConfirmOptions,
): ConfirmDialogNodes {
    const DIALOG = document.createElement("dialog");
    DIALOG.className = "danger-confirm-dialog";
    DIALOG.setAttribute("aria-labelledby", TITLE_ID);
    const TITLE_BAR = titleBar(options.title);
    const CLOSE_BUTTON = buttonNode("danger-confirm-close", "x");
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

function focusCancelButton(cancelButton: HTMLButtonElement): void {
    cancelButton.focus();
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

export function confirmDestructiveAction(
    options: DestructiveConfirmOptions,
): Promise<boolean> {
    return new Promise((resolve) => {
        const NODES = createConfirmDialog(options);
        bindConfirmDialogEvents(NODES, finishOnce(NODES, resolve));
        openDialog(NODES.dialog);
        focusCancelButton(NODES.cancelButton);
    });
}
