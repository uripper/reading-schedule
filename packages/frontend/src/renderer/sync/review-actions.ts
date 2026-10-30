/** Coordinates per-book add and ignore actions while preserving pending review selections. */
import type { SyncReviewPresentation } from "@reading-schedule/contracts";
import { syncErrorMessage } from "./dom.ts";
import type { createSyncReviewRow } from "./review-row.ts";

// audit-allow-local-types: Private row controls are inferred from this renderer's DOM API.
type ReviewRow = ReturnType<typeof createSyncReviewRow>;
// audit-allow-local-types: Callbacks apply to the current dialog's DOM lifecycle only.
type ActionHost = Parameters<typeof bindSyncRowActions>[2];

/** Locks only the review while its nested book or confirmation dialog is active. */
async function runAction(
    action: () => Promise<void>,
    host: ActionHost,
): Promise<void> {
    const OPENER = document.activeElement;
    host.setBusy(true);
    try {
        await action();
    } catch (error) {
        host.status(syncErrorMessage(error, host.sourceLabel));
    } finally {
        host.setBusy(false);
        restoreActionFocus(OPENER);
    }
}

/** Nested dialogs restore focus after the review's buttons become usable again. */
function restoreActionFocus(opener: Element | null): void {
    if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        opener.closest("[hidden]") === null
    ) {
        opener.focus();
    }
}

/** Starts an async row action with an explicit final error path. */
function startAction(action: () => Promise<void>, host: ActionHost): void {
    runAction(action, host).catch((error: unknown) => {
        host.setBusy(false);
        host.status(syncErrorMessage(error, host.sourceLabel));
    });
}

/** Uses the normal add-book form, then selects the saved book in this existing review. */
async function addBook(
    row: ReviewRow,
    options: SyncReviewPresentation,
    rows: readonly ReviewRow[],
): Promise<void> {
    const BOOK = await options.addBook(row.record);
    if (BOOK !== null) {
        for (const ROW of rows) {
            ROW.registerBook(BOOK);
        }
        row.setBook(BOOK);
    }
}

/** Hides an ignored row only after its persistent exclusion succeeds. */
async function ignoreBook(
    row: ReviewRow,
    options: SyncReviewPresentation,
): Promise<void> {
    if (await options.ignore(row.record)) {
        row.dismiss();
    }
}

/** Supplies row controls without closing or rebuilding the user's review. */
export function bindSyncRowActions(
    rows: readonly ReviewRow[],
    options: SyncReviewPresentation,
    host: {
        setBusy(busy: boolean): void;
        sourceLabel: string;
        status(message: string): void;
    },
): void {
    for (const ROW of rows) {
        ROW.bindActions({
            add: () => {
                startAction(async () => {
                    await addBook(ROW, options, rows);
                }, host);
            },
            ignore: () => {
                startAction(async () => {
                    await ignoreBook(ROW, options);
                }, host);
            },
        });
    }
}
