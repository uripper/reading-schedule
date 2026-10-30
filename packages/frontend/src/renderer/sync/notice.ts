/** Presents a short sync result using the existing modal and action styles. */
import { bindDialogFocus } from "../accessibility/a11y-dialog-focus.ts";
import { syncButton, syncElement } from "./dom.ts";

/** Builds a labelled result dialog with a single acknowledgement action. */
function noticeDialog(message: string): HTMLDialogElement {
    const DIALOG = syncElement("dialog");
    DIALOG.className = "sync-review sync-notice";
    DIALOG.setAttribute("aria-labelledby", "sync-notice-title");
    const TITLE = syncElement("h2", message);
    TITLE.id = "sync-notice-title";
    const ACTIONS = syncElement("div");
    ACTIONS.className = "sync-actions";
    ACTIONS.append(
        syncButton("OK", () => {
            DIALOG.close();
        }),
    );
    DIALOG.append(TITLE, ACTIONS);
    return DIALOG;
}

/** Shows a dismissible result and returns focus to the initiating control on close. */
export function showSyncNotice(message: string): void {
    const DIALOG = noticeDialog(message);
    const FOCUS = bindDialogFocus(DIALOG, { initialFocusSelector: "button" });
    DIALOG.addEventListener("close", () => {
        DIALOG.remove();
    });
    document.body.append(DIALOG);
    FOCUS.rememberOpener();
    DIALOG.showModal();
    FOCUS.focusInitialTarget();
}
