/** Shows a single accessible review dialog before approved synced progress is imported. */
import type {
    SyncImportChoice,
    SyncReviewPresentation,
} from "@reading-schedule/contracts";
import { bindDialogFocus } from "../accessibility/a11y-dialog-focus.ts";
import { syncButton, syncElement, syncErrorMessage } from "./dom.ts";
import { bindSyncRowActions } from "./review-actions.ts";
import { bindSyncRowCollisions } from "./review-collisions.ts";
import { createSyncReviewRow } from "./review-row.ts";

// audit-allow-local-types: Private DOM state derived from this renderer's NODES.
type ReviewNodes = ReturnType<typeof createReviewNodes>;

/** Builds the dialog shell with an accessible result area. */
function createDialogShell(sourceLabel: string) {
    const DIALOG = syncElement("dialog");
    DIALOG.className = "sync-review";
    DIALOG.setAttribute("aria-labelledby", "sync-review-title");
    const TITLE = syncElement("h2", `Update progress from ${sourceLabel}?`);
    TITLE.id = "sync-review-title";
    const STATUS = syncElement("p");
    STATUS.setAttribute("role", "status");
    const ACTIONS = syncElement("div");
    ACTIONS.className = "sync-actions";
    DIALOG.append(dialogHeader(DIALOG, TITLE, sourceLabel));
    return { actions: ACTIONS, dialog: DIALOG, status: STATUS };
}

/** Uses the app's shared X at the top right of the review title. */
function dialogHeader(
    dialog: HTMLDialogElement,
    title: HTMLElement,
    sourceLabel: string,
): HTMLElement {
    const HEADER = syncElement("header");
    HEADER.className = "sync-review-header";
    const CLOSE = syncButton("X", () => {
        dialog.close();
    });
    CLOSE.className = "action-confirm-close sync-review-close";
    CLOSE.setAttribute("aria-label", `Close ${sourceLabel} sync`);
    HEADER.append(title, CLOSE);
    return HEADER;
}

/** Builds rows without interpreting device strings as HTML. */
function createReviewNodes(options: SyncReviewPresentation) {
    const NODES = createDialogShell(options.sourceLabel);
    const ROWS = options.entries.map((entry) =>
        createSyncReviewRow(entry, options.books),
    );
    const LIST = syncElement("ul");
    LIST.className = "sync-review-list";
    bindSyncRowCollisions(ROWS);
    LIST.append(...ROWS.map((row) => row.element));
    if (options.invalidRows > 0) {
        NODES.status.textContent = `${options.invalidRows} invalid ${options.sourceLabel} records were skipped.`;
    }
    NODES.dialog.append(LIST, NODES.status, NODES.actions);
    return { ...NODES, rows: ROWS, sourceLabel: options.sourceLabel };
}

/** Disables cancellation and import controls while saving a reviewed batch. */
function setBusy(nodes: ReviewNodes, busy: boolean): void {
    const NODES = nodes;
    NODES.dialog.dataset.busy = String(busy);
    for (const CONTROL of NODES.dialog.querySelectorAll<HTMLButtonElement>(
        "button",
    )) {
        CONTROL.disabled = busy;
    }
    lockRowControls(NODES.dialog, busy);
    if (!busy) {
        refreshRows(NODES);
    }
}

/** Revalidates rows after nested actions and closes a review with nothing left in it. */
function refreshRows(nodes: ReviewNodes): void {
    for (const ROW of nodes.rows) {
        ROW.refresh();
    }
    if (nodes.rows.every((row) => row.element.hidden)) {
        nodes.dialog.close();
    }
}

/** Restores each row's original eligibility after failed saves. */
function lockRowControls(dialog: HTMLDialogElement, busy: boolean): void {
    for (const CONTROL of dialog.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
    >("input, select")) {
        if (busy) {
            CONTROL.dataset.disabledBeforeSave = String(CONTROL.disabled);
            CONTROL.disabled = true;
        } else {
            CONTROL.disabled = CONTROL.dataset.disabledBeforeSave === "true";
            delete CONTROL.dataset.disabledBeforeSave;
        }
    }
}

/** Applies selected updates and leaves failures visible for retry. */
async function applyChoices(
    nodes: ReviewNodes,
    apply: (choices: SyncImportChoice[]) => Promise<string>,
): Promise<void> {
    const NODES = nodes;
    const CHOICES = NODES.rows.flatMap((row) => row.choice());
    if (CHOICES.length === 0) {
        NODES.status.textContent = "Select a book to sync.";
        return;
    }
    setBusy(nodes, true);
    NODES.status.textContent = "Saving reading progress…";
    try {
        NODES.status.textContent = await apply(CHOICES);
        NODES.dialog.close();
    } catch (error) {
        NODES.status.textContent = syncErrorMessage(error, NODES.sourceLabel);
    } finally {
        setBusy(nodes, false);
    }
}

/** Starts an import action with an explicit terminal error handler. */
function runApply(
    nodes: ReviewNodes,
    apply: (choices: SyncImportChoice[]) => Promise<string>,
): void {
    const NODES = nodes;
    applyChoices(nodes, apply).catch((error: unknown) => {
        NODES.status.textContent = syncErrorMessage(error, NODES.sourceLabel);
        setBusy(nodes, false);
    });
}

/** Select all adds safe rows; individual conflict approvals survive it until Deselect all. */
function selectionButtons(nodes: ReviewNodes): HTMLButtonElement[] {
    return [true, false].map((selected) => {
        let label = "Deselect all";
        if (selected) {
            label = "Select all";
        }
        return syncButton(label, () => {
            for (const ROW of nodes.rows) {
                ROW.selectSafe(selected);
            }
        });
    });
}

/** Imports only checked rows; the header X and Escape dismiss without importing. */
function bindActions(
    nodes: ReviewNodes,
    apply: (choices: SyncImportChoice[]) => Promise<string>,
): void {
    const NODES = nodes;
    NODES.actions.append(
        ...selectionButtons(NODES),
        syncButton("Update selected", () => {
            runApply(NODES, apply);
        }),
    );
    NODES.dialog.addEventListener("cancel", (event) => {
        if (NODES.dialog.dataset.busy === "true") {
            event.preventDefault();
        }
    });
}

/** Presents a modal with focus restoration and removes its nodes after dismissal. */
export function showSyncReview(options: SyncReviewPresentation): void {
    const NODES = createReviewNodes(options);
    const FOCUS = bindDialogFocus(NODES.dialog, {
        initialFocusSelector: ".sync-review-close",
    });
    bindSyncRowActions(NODES.rows, options, {
        setBusy: (busy) => {
            setBusy(NODES, busy);
        },
        sourceLabel: options.sourceLabel,
        status: (message) => {
            NODES.status.textContent = message;
        },
    });
    bindActions(NODES, options.apply);
    document.body.append(NODES.dialog);
    NODES.dialog.addEventListener("close", () => {
        NODES.dialog.remove();
    });
    FOCUS.rememberOpener();
    NODES.dialog.showModal();
    FOCUS.focusInitialTarget();
}
