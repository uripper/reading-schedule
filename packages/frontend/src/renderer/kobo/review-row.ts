/** Renders suggested or manually searched library matches with progress approval. */
import type {
    Book,
    KoboImportChoice,
    KoboReviewEntry,
} from "@reading-schedule/contracts";
import { koboButton, koboElement } from "./dom.ts";
import { createKoboMatchPicker } from "./match-picker.ts";
import { assessKoboProgress } from "./model.ts";
import { koboReadDateLabel, koboReviewConflicts } from "./review-conflicts.ts";

// audit-allow-local-types: Private DOM state derived from the row renderer.
type RowNodes = ReturnType<typeof createRowNodes>;

/** Constructs the source label, library search, and selection controls. */
function createRowNodes(entry: KoboReviewEntry, books: readonly Book[]) {
    const ROW = koboElement("li");
    const CHECK = koboElement("input");
    CHECK.type = "checkbox";
    const LABEL = koboElement("label");
    LABEL.append(CHECK, koboElement("span", entry.record.title));
    const PICKER = createKoboMatchPicker(entry, books);
    const DETAILS = koboElement("p");
    const REASON = koboElement("p");
    ROW.append(LABEL, PICKER.search, PICKER.select, DETAILS, REASON);
    return {
        check: CHECK,
        details: DETAILS,
        entry,
        picker: PICKER,
        reason: REASON,
        row: ROW,
    };
}

/** Exposes approval actions while leaving uncertain matches unchecked. */
export function createKoboReviewRow(
    entry: KoboReviewEntry,
    books: readonly Book[] = entry.matches,
) {
    const NODES = createRowNodes(entry, books);
    NODES.picker.select.addEventListener("change", () => {
        refreshRow(NODES, false);
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
        choice: (all: boolean): KoboImportChoice[] => rowChoice(NODES, all),
        conflicts: (records: KoboReviewEntry["conflictingRecords"]): void => {
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
        refresh: (): void => {
            refreshApproval(NODES);
        },
        selectSafe: (selected: boolean): void => {
            NODES.check.checked = selected && isSafeChoice(NODES);
        },
        setBook: (book: Book): void => {
            setAddedBook(NODES, book);
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
    records: KoboReviewEntry["conflictingRecords"],
): void {
    const ENTRY = nodes.entry;
    ENTRY.conflictingRecords = records;
    ENTRY.requiresSourceReview = records.length > 0;
    const BOOK = nodes.picker.selectedBook();
    if (BOOK !== undefined) {
        renderMatchedBook(nodes, BOOK);
    }
}

/** Keeps add and ignore available even when a progress change cannot be applied. */
function appendActions(
    nodes: RowNodes,
    actions: { add(): void; ignore(): void },
): void {
    const ACTIONS = koboElement("div");
    ACTIONS.className = "kobo-row-actions";
    ACTIONS.append(
        koboButton("Add book", actions.add),
        koboButton("Ignore", actions.ignore),
    );
    nodes.row.append(ACTIONS);
}

/** Resets approval after any manual match or query change. */
function refreshRow(nodes: RowNodes, initial: boolean): void {
    const NODES = nodes;
    const BOOK = NODES.picker.selectedBook();
    NODES.check.checked = false;
    NODES.check.disabled = true;
    NODES.details.textContent = `Kobo: ${NODES.entry.record.percentRead}% · ${koboReadDateLabel(NODES.entry.record.dateLastRead)}`;
    NODES.reason.textContent = "";
    if (BOOK !== undefined) {
        renderMatchedBook(NODES, BOOK);
        NODES.check.checked = initial && isSafeChoice(NODES);
    }
}

/** Displays progress differences and only the warnings relevant to the chosen book. */
function renderMatchedBook(nodes: RowNodes, book: Book): void {
    const NODES = nodes;
    const ASSESSMENT = assessKoboProgress(NODES.entry.record, book);
    NODES.details.textContent = `Bartleby: ${book.progress_percent}% → Kobo: ${NODES.entry.record.percentRead}% · ${koboReadDateLabel(NODES.entry.record.dateLastRead)}`;
    NODES.reason.textContent = koboReviewConflicts(
        NODES.entry,
        book,
        ASSESSMENT,
    );
    NODES.check.disabled =
        ASSESSMENT.kind === "blocked" || ASSESSMENT.kind === "unchanged";
}

/** Bulk approval includes only clear suggestions without progress conflicts. */
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
function canApproveSuggestion(entry: KoboReviewEntry, book: Book): boolean {
    const KIND = assessKoboProgress(entry.record, book).kind;
    return KIND === "ready" || KIND === "link";
}

/** Uses explicitly checked matches for manual choices, including books found through search. */
function rowChoice(nodes: RowNodes, all: boolean): KoboImportChoice[] {
    if (nodes.check.disabled || nodes.row.hidden) {
        return [];
    }
    if (approvedChoice(nodes, all)) {
        return [
            { bookId: nodes.picker.select.value, record: nodes.entry.record },
        ];
    }
    return [];
}

/** Bulk confirmation uses safe suggestions; manual confirmation uses the checkbox. */
function approvedChoice(nodes: RowNodes, all: boolean): boolean {
    if (all) {
        return isSafeChoice(nodes);
    }
    return nodes.check.checked;
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
}

/** Selects and approves the book just saved through the normal form. */
function setAddedBook(nodes: RowNodes, book: Book): void {
    const NODES = nodes;
    NODES.picker.addBook(book);
    NODES.check.checked = !NODES.check.disabled;
}
