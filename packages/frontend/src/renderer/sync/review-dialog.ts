/** Shows a single accessible review dialog before approved Kobo progress is imported. */
import type {
    KoboImportChoice,
    KoboReviewPresentation,
} from "@reading-schedule/contracts";
import { bindDialogFocus } from "../accessibility/a11y-dialog-focus.ts";
import { koboButton, koboElement } from "./dom.ts";
import { koboErrorMessage } from "./monitor.ts";
import { bindKoboRowActions } from "./review-actions.ts";
import { bindKoboRowCollisions } from "./review-collisions.ts";
import { createKoboReviewRow } from "./review-row.ts";

// audit-allow-local-types: Private DOM state derived from this renderer's NODES.
type ReviewNodes = ReturnType<typeof createReviewNodes>;

/** Builds the dialog shell with an accessible result area. */
function createDialogShell() {
    const DIALOG = koboElement("dialog");
    DIALOG.className = "kobo-review";
    DIALOG.setAttribute("aria-labelledby", "kobo-review-title");
    const TITLE = koboElement("h2", "Update progress from Kobo?");
    TITLE.id = "kobo-review-title";
    const STATUS = koboElement("p");
    STATUS.setAttribute("role", "status");
    const ACTIONS = koboElement("div");
    ACTIONS.className = "kobo-actions";
    DIALOG.append(dialogHeader(DIALOG, TITLE));
    return { actions: ACTIONS, dialog: DIALOG, status: STATUS };
}

/** Uses the app's shared X at the top right of the review title. */
function dialogHeader(
    dialog: HTMLDialogElement,
    title: HTMLElement,
): HTMLElement {
    const HEADER = koboElement("header");
    HEADER.className = "kobo-review-header";
    const CLOSE = koboButton("X", () => {
        dialog.close();
    });
    CLOSE.className = "action-confirm-close kobo-review-close";
    CLOSE.setAttribute("aria-label", "Close Kobo sync");
    HEADER.append(title, CLOSE);
    return HEADER;
}

/** Builds rows without interpreting device strings as HTML. */
function createReviewNodes(options: KoboReviewPresentation) {
    const NODES = createDialogShell();
    const ROWS = options.entries.map((entry) =>
        createKoboReviewRow(entry, options.books),
    );
    const LIST = koboElement("ul");
    LIST.className = "kobo-review-list";
    bindKoboRowCollisions(ROWS);
    LIST.append(...ROWS.map((row) => row.element));
    if (options.invalidRows > 0) {
        NODES.status.textContent = `${options.invalidRows} invalid Kobo records were skipped.`;
    }
    NODES.dialog.append(LIST, NODES.status, NODES.actions);
    return { ...NODES, rows: ROWS };
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
    apply: (choices: KoboImportChoice[]) => Promise<string>,
    all: boolean,
): Promise<void> {
    const NODES = nodes;
    const CHOICES = NODES.rows.flatMap((row) => row.choice(all));
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
        NODES.status.textContent = koboErrorMessage(error);
    } finally {
        setBusy(nodes, false);
    }
}

/** Starts an import action with an explicit terminal error handler. */
function runApply(
    nodes: ReviewNodes,
    apply: (choices: KoboImportChoice[]) => Promise<string>,
    all: boolean,
): void {
    const NODES = nodes;
    applyChoices(nodes, apply, all).catch((error: unknown) => {
        NODES.status.textContent = koboErrorMessage(error);
        setBusy(nodes, false);
    });
}

/** Creates select/deselect controls that preserve explicit conflict approval. */
function selectionButtons(nodes: ReviewNodes): HTMLButtonElement[] {
    return [true, false].map((selected) => {
        let label = "Deselect all";
        if (selected) {
            label = "Select all";
        }
        return koboButton(label, () => {
            for (const ROW of nodes.rows) {
                ROW.selectSafe(selected);
            }
        });
    });
}

/** Adds bulk controls and a cancel action that retains unimported records. */
function bindActions(
    nodes: ReviewNodes,
    apply: (choices: KoboImportChoice[]) => Promise<string>,
): void {
    const NODES = nodes;
    NODES.actions.append(
        ...selectionButtons(NODES),
        koboButton("Update all", () => {
            runApply(NODES, apply, true);
        }),
        koboButton("Update selected", () => {
            runApply(NODES, apply, false);
        }),
        koboButton("Not now", () => {
            NODES.dialog.close();
        }),
    );
    NODES.dialog.addEventListener("cancel", (event) => {
        if (NODES.dialog.dataset.busy === "true") {
            event.preventDefault();
        }
    });
}

/** Presents a modal with focus restoration and removes its nodes after dismissal. */
export function showKoboReview(options: KoboReviewPresentation): void {
    const NODES = createReviewNodes(options);
    const FOCUS = bindDialogFocus(NODES.dialog, {
        initialFocusSelector: ".kobo-review-close",
    });
    bindKoboRowActions(NODES.rows, options, {
        setBusy: (busy) => {
            setBusy(NODES, busy);
        },
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
