/** Renders suggested or manually searched library matches with progress approval. */
import type {
    Book,
    SyncImportChoice,
    SyncReviewEntry,
} from "@reading-schedule/contracts";
import { syncButton, syncElement } from "./dom.ts";
import { syncProviderLabel } from "./links.ts";
import { createSyncMatchPicker } from "./match-picker.ts";
import { assessSyncProgress } from "./model.ts";
import {
    syncReadDateLabel,
    syncRecordName,
    syncReviewConflicts,
} from "./review-conflicts.ts";
import { createSyncSessionControl } from "./review-session.ts";

// audit-allow-local-types: Private DOM state derived from the row renderer.
type RowNodes = ReturnType<typeof createRowNodes>;

/** Constructs the source label, library search, and selection controls. */
function createRowControls(entry: SyncReviewEntry, books: readonly Book[]) {
    const CHECK = syncElement("input");
    CHECK.type = "checkbox";
    const LABEL = syncElement("label");
    LABEL.append(CHECK, syncElement("span", syncRecordName(entry.record)));
    const PICKER = createSyncMatchPicker(entry, books);
    const DETAILS = syncElement("p");
    const REASON = syncElement("p");
    const SESSION = createSyncSessionControl(syncRecordName(entry.record));
    return {
        check: CHECK,
        details: DETAILS,
        entry,
        label: LABEL,
        picker: PICKER,
        reason: REASON,
        session: SESSION,
    };
}

/** Groups the source controls in a single review row. */
function createRowNodes(entry: SyncReviewEntry, books: readonly Book[]) {
    const ROW = syncElement("li");
    const CONTROLS = createRowControls(entry, books);
    ROW.append(
        CONTROLS.label,
        CONTROLS.picker.search,
        CONTROLS.picker.select,
        CONTROLS.details,
        CONTROLS.reason,
        CONTROLS.session.element,
    );
    return { ...CONTROLS, row: ROW };
}

/** Exposes approval actions while leaving uncertain matches unchecked. */
export function createSyncReviewRow(
    entry: SyncReviewEntry,
    books: readonly Book[] = entry.matches,
) {
    const NODES = createRowNodes(entry, books);
    NODES.picker.select.addEventListener("change", () => {
        refreshRow(NODES, false);
    });
    NODES.check.addEventListener("change", () => {
        refreshSession(NODES);
    });
    refreshRow(NODES, true);
    return rowController(NODES);
}

/** Exposes only row actions needed by the enclosing review. */
function rowController(nodes: RowNodes) {
    const NODES = nodes;
    return {
        bindActions: (actions: { add(): void; ignore(): void }): void => {
            appendActions(NODES, actions);
        },
        conflicts: (records: SyncReviewEntry["conflictingRecords"]): void => {
            updateConflicts(NODES, records);
        },
        dismiss: (): void => {
            dismissRow(NODES);
        },
        element: NODES.row,
        matchId: (): string => activeMatchId(NODES),
        observeMatch: (handler: () => void): void => {
            NODES.picker.select.addEventListener("change", handler);
        },
        record: NODES.entry.record,
        registerBook: (book: Book): void => {
            NODES.picker.registerBook(book);
        },
        setBook: (book: Book): void => {
            setAddedBook(NODES, book);
        },
        ...approvalControls(NODES),
    };
}

/** Groups approval controls shared by individual and bulk review actions. */
function approvalControls(nodes: RowNodes) {
    const NODES = nodes;
    return {
        choice: (): SyncImportChoice[] => rowChoice(NODES),
        refresh: (): void => {
            refreshApproval(NODES);
        },
        selectSafe: (selected: boolean): void => {
            selectRow(NODES, selected);
        },
    };
}

/** Hidden ignored rows no longer compete for a library match. */
function activeMatchId(nodes: RowNodes): string {
    if (nodes.row.hidden) {
        return "";
    }
    return nodes.picker.select.value;
}

/** Refreshes conflict details without clearing the user's approval checkbox. */
function updateConflicts(
    nodes: RowNodes,
    records: SyncReviewEntry["conflictingRecords"],
): void {
    const ENTRY = nodes.entry;
    ENTRY.conflictingRecords = records;
    ENTRY.requiresSourceReview = records.length > 0;
    const BOOK = nodes.picker.selectedBook();
    if (BOOK !== undefined) {
        renderMatchedBook(nodes, BOOK);
    }
    refreshSession(nodes);
}

/** Session entry follows the explicit approval of this source book. */
function refreshSession(nodes: RowNodes): void {
    nodes.session.setEnabled(nodes.check.checked && !nodes.check.disabled);
}

/** Keeps add and ignore available even when a progress change cannot be applied. */
function appendActions(
    nodes: RowNodes,
    actions: { add(): void; ignore(): void },
): void {
    const ACTIONS = syncElement("div");
    ACTIONS.className = "sync-row-actions";
    ACTIONS.append(
        syncButton("Add book", actions.add),
        syncButton("Ignore", actions.ignore),
    );
    nodes.row.append(ACTIONS);
}

/** Resets approval after any manual match or query change. */
function refreshRow(nodes: RowNodes, initial: boolean): void {
    const NODES = nodes;
    const BOOK = NODES.picker.selectedBook();
    NODES.check.checked = false;
    NODES.check.disabled = true;
    NODES.details.textContent = `${sourceLabel(NODES)}: ${NODES.entry.record.percentRead}% · ${syncReadDateLabel(NODES.entry.record.dateLastRead)}`;
    NODES.reason.textContent = "";
    if (BOOK !== undefined) {
        renderMatchedBook(NODES, BOOK);
        NODES.check.checked = initial && isSafeChoice(NODES);
    }
    refreshSession(NODES);
}

/** Names the actual source in progress comparisons. */
function sourceLabel(nodes: RowNodes): string {
    return syncProviderLabel(nodes.entry.record.provider);
}

/** Displays progress differences and only the warnings relevant to the chosen book. */
function renderMatchedBook(nodes: RowNodes, book: Book): void {
    const NODES = nodes;
    const ASSESSMENT = assessSyncProgress(NODES.entry.record, book);
    NODES.details.textContent = `Bartleby: ${book.progress_percent}% → ${sourceLabel(NODES)}: ${NODES.entry.record.percentRead}% · ${syncReadDateLabel(NODES.entry.record.dateLastRead)}`;
    NODES.reason.textContent = syncReviewConflicts(
        NODES.entry,
        book,
        ASSESSMENT,
    );
    NODES.check.disabled =
        ASSESSMENT.kind === "blocked" || ASSESSMENT.kind === "unchanged";
}

/** Select all includes only clear suggestions without progress conflicts. */
function isSafeChoice(nodes: RowNodes): boolean {
    const BOOK = nodes.picker.selectedBook();
    return (
        BOOK !== undefined &&
        BOOK.book_id === nodes.entry.suggestedBookId &&
        !nodes.entry.requiresSourceReview &&
        !nodes.entry.requiresMatchReview &&
        canApproveSuggestion(nodes.entry, BOOK)
    );
}

/** Equal progress is a valid association confirmation without rewriting reading history. */
function canApproveSuggestion(entry: SyncReviewEntry, book: Book): boolean {
    const KIND = assessSyncProgress(entry.record, book).kind;
    return KIND === "ready" || KIND === "link";
}

/** Uses explicitly checked matches, including books found through search. */
function rowChoice(nodes: RowNodes): SyncImportChoice[] {
    if (nodes.check.disabled || nodes.row.hidden || !nodes.check.checked) {
        return [];
    }
    const CHOICE: SyncImportChoice = {
        bookId: nodes.picker.select.value,
        record: nodes.entry.record,
    };
    const MINUTES = nodes.session.minutes();
    if (MINUTES !== undefined) {
        CHOICE.sessionMinutes = MINUTES;
    }
    return [CHOICE];
}

/** Select all checks safe rows without clearing individually approved conflicts. */
function selectRow(nodes: RowNodes, selected: boolean): void {
    const NODES = nodes;
    if (!selected) {
        NODES.check.checked = false;
        refreshSession(NODES);
        return;
    }
    if (isSafeChoice(NODES)) {
        NODES.check.checked = true;
    }
    refreshSession(NODES);
}

/** Excluded rows cannot contribute hidden selections to a later import. */
function dismissRow(nodes: RowNodes): void {
    const NODES = nodes;
    NODES.row.hidden = true;
    NODES.check.checked = false;
    NODES.picker.select.dispatchEvent(new Event("change"));
}

/** Keeps deliberate checkmarks when nested actions finish. */
function refreshApproval(nodes: RowNodes): void {
    const NODES = nodes;
    const CHECKED = NODES.check.checked;
    refreshRow(NODES, false);
    NODES.check.checked = CHECKED && !NODES.check.disabled;
    refreshSession(NODES);
}

/** Selects and approves the book just saved through the normal form. */
function setAddedBook(nodes: RowNodes, book: Book): void {
    const NODES = nodes;
    NODES.picker.addBook(book);
    NODES.check.checked = !NODES.check.disabled;
    refreshSession(NODES);
}
