/**
 * Builds the DOM nodes used by Bartleby's application-update dialog.
 */

import type { AppUpdateDialogPresentation } from "@reading-schedule/contracts";

const DIALOG_TITLE_ID = "appUpdateDialogTitle";
const PERCENT_COMPLETE = 100;

// audit-allow-local-types: DOM nodes are private to the desktop update dialog.
interface UpdateDialogNodes {
    closeButton: HTMLButtonElement;
    dialog: HTMLDialogElement;
    installButton: HTMLButtonElement;
    laterButton: HTMLButtonElement;
    progress: HTMLProgressElement;
    status: HTMLElement;
}

/** Creates a text element with the requested style and content. */
function textNode(
    tagName: "h2" | "p",
    className: string,
    text: string,
): HTMLElement {
    const NODE = document.createElement(tagName);
    NODE.className = className;
    NODE.textContent = text;
    return NODE;
}

/** Creates a themed button element. */
function buttonNode(className: string, label: string): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.className = className;
    BUTTON.textContent = label;
    BUTTON.type = "button";
    return BUTTON;
}

/** Creates the dialog title and close action. */
function dialogHeader(): {
    closeButton: HTMLButtonElement;
    header: HTMLElement;
} {
    const HEADER = document.createElement("header");
    HEADER.className = "app-update-dialog-header";
    const TITLE = textNode("h2", "app-update-dialog-title", "UPDATE AVAILABLE");
    TITLE.id = DIALOG_TITLE_ID;
    const CLOSE_BUTTON = buttonNode("app-update-dialog-close", "×");
    CLOSE_BUTTON.setAttribute("aria-label", "Remind me later");
    HEADER.append(TITLE, CLOSE_BUTTON);
    return { closeButton: CLOSE_BUTTON, header: HEADER };
}

/** Creates live status and native progress elements. */
function dialogProgress(): {
    progress: HTMLProgressElement;
    status: HTMLElement;
} {
    const STATUS = textNode(
        "p",
        "app-update-dialog-status",
        "Ready to download.",
    );
    STATUS.setAttribute("aria-live", "polite");
    const PROGRESS = document.createElement("progress");
    PROGRESS.className = "app-update-dialog-progress";
    PROGRESS.hidden = true;
    PROGRESS.max = PERCENT_COMPLETE;
    return { progress: PROGRESS, status: STATUS };
}

/** Creates release version and notes elements. */
function releaseDetails(
    presentation: AppUpdateDialogPresentation,
): HTMLElement[] {
    return [
        textNode(
            "p",
            "app-update-dialog-version",
            `Bartleby ${presentation.version}`,
        ),
        textNode(
            "p",
            "app-update-dialog-current",
            `Currently installed: ${presentation.currentVersion}`,
        ),
        textNode("p", "app-update-dialog-notes", presentation.notes),
    ];
}

/** Creates the release content and progress region. */
function dialogBody(presentation: AppUpdateDialogPresentation): {
    body: HTMLElement;
    progress: HTMLProgressElement;
    status: HTMLElement;
} {
    const BODY = document.createElement("section");
    BODY.className = "app-update-dialog-body";
    const DETAILS = releaseDetails(presentation);
    const PROGRESS_NODES = dialogProgress();
    BODY.append(...DETAILS, PROGRESS_NODES.status, PROGRESS_NODES.progress);
    return { body: BODY, ...PROGRESS_NODES };
}

/** Creates Later and install actions. */
function dialogActions(): {
    actions: HTMLElement;
    installButton: HTMLButtonElement;
    laterButton: HTMLButtonElement;
} {
    const ACTIONS = document.createElement("footer");
    ACTIONS.className = "app-update-dialog-actions";
    const LATER_BUTTON = buttonNode(
        "app-update-dialog-button app-update-dialog-later",
        "Later",
    );
    const INSTALL_BUTTON = buttonNode(
        "app-update-dialog-button app-update-dialog-install",
        "Download and install",
    );
    ACTIONS.append(LATER_BUTTON, INSTALL_BUTTON);
    return {
        actions: ACTIONS,
        installButton: INSTALL_BUTTON,
        laterButton: LATER_BUTTON,
    };
}

/**
 * Creates a complete update dialog without attaching it to the document.
 * @param presentation - Release information to render.
 * @returns Dialog and the nodes needed for interaction updates.
 */
export function createUpdateDialogNodes(
    presentation: AppUpdateDialogPresentation,
): UpdateDialogNodes {
    const DIALOG = document.createElement("dialog");
    DIALOG.className = "app-update-dialog";
    DIALOG.setAttribute("aria-labelledby", DIALOG_TITLE_ID);
    const HEADER = dialogHeader();
    const BODY = dialogBody(presentation);
    const ACTIONS = dialogActions();
    DIALOG.append(HEADER.header, BODY.body, ACTIONS.actions);
    return {
        closeButton: HEADER.closeButton,
        dialog: DIALOG,
        installButton: ACTIONS.installButton,
        laterButton: ACTIONS.laterButton,
        progress: BODY.progress,
        status: BODY.status,
    };
}

/**
 * Closes and detaches an update dialog.
 * @param dialog - Dialog node to remove.
 */
export function closeUpdateDialog(dialog: HTMLDialogElement): void {
    if (dialog.open) {
        dialog.close();
    }
    dialog.remove();
}
