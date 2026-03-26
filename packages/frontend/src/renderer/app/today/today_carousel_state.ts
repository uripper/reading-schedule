/**
 * Stores ephemeral Today carousel UI state that should survive rerenders but
 * not be persisted with the planner state.
 */
interface ProgressDraft {
    pagesText: string;
    percentText: string;
}

interface MinutesEditorState {
    rowKey: string;
    valueText: string;
}

interface TodayCarouselUiState {
    minutesEditor: MinutesEditorState | null;
    pinnedRowKeyByBookId: Record<string, string>;
    progressDraftByRowKey: Record<string, ProgressDraft>;
    selectedBookId: string;
}

const EMPTY_TEXT = "";

const UI_STATE: TodayCarouselUiState = {
    minutesEditor: null,
    pinnedRowKeyByBookId: {},
    progressDraftByRowKey: {},
    selectedBookId: EMPTY_TEXT,
};

/**
 * Trims row and book identity keys before storing them in UI state.
 * @param value - Raw key text.
 * @returns Normalized key text.
 */
function normalizeKeyText(value: string): string {
    return value.trim();
}

/**
 * Returns the currently selected Today carousel book id.
 * @returns Selected book id or an empty string.
 */
export function selectedBookId(): string {
    return UI_STATE.selectedBookId;
}

/**
 * Stores the selected Today carousel book id.
 * @param bookId - Book id to persist in UI state.
 */
export function setSelectedBookId(bookId: string): void {
    UI_STATE.selectedBookId = normalizeKeyText(bookId);
}

/**
 * Returns a copy of pinned row keys by book id.
 * @returns Snapshot of pinned row state.
 */
export function pinnedRowKeySnapshot(): Record<string, string> {
    return { ...UI_STATE.pinnedRowKeyByBookId };
}

/**
 * Pins a Today row for a book so rerenders can preserve row focus.
 * @param bookId - Book id owning the row.
 * @param rowKey - Stable row identity key.
 */
export function pinRowKey(bookId: string, rowKey: string): void {
    const BOOK_ID = normalizeKeyText(bookId);
    const ROW_KEY = normalizeKeyText(rowKey);
    if (!(BOOK_ID && ROW_KEY)) {
        return;
    }
    UI_STATE.pinnedRowKeyByBookId[BOOK_ID] = ROW_KEY;
}

/**
 * Returns the stored progress draft for a Today row.
 * @param rowKey - Stable row identity key.
 * @returns Draft values or `null` when none exist.
 */
export function progressDraft(rowKey: string): ProgressDraft | null {
    const ROW_KEY = normalizeKeyText(rowKey);
    if (!ROW_KEY) {
        return null;
    }
    const DRAFT = UI_STATE.progressDraftByRowKey[ROW_KEY];
    if (!DRAFT) {
        return null;
    }
    return {
        pagesText: DRAFT.pagesText,
        percentText: DRAFT.percentText,
    };
}

/**
 * Stores the current editable progress draft for a Today row.
 * @param options - Row identity and draft values.
 */
export function setProgressDraft(options: {
    rowKey: string;
    pagesText: string;
    percentText: string;
}): void {
    const ROW_KEY = normalizeKeyText(options.rowKey);
    if (!ROW_KEY) {
        return;
    }
    UI_STATE.progressDraftByRowKey[ROW_KEY] = {
        pagesText: options.pagesText.trim(),
        percentText: options.percentText.trim(),
    };
}

/**
 * Returns the currently open minutes editor state.
 * @returns Minutes editor snapshot or `null`.
 */
export function minutesEditor(): MinutesEditorState | null {
    if (UI_STATE.minutesEditor === null) {
        return null;
    }
    return {
        rowKey: UI_STATE.minutesEditor.rowKey,
        valueText: UI_STATE.minutesEditor.valueText,
    };
}

/**
 * Opens the inline minutes editor for a Today row.
 * @param rowKey - Stable row identity key.
 * @param valueText - Initial minutes text to display.
 */
export function openMinutesEditor(rowKey: string, valueText: string): void {
    const ROW_KEY = normalizeKeyText(rowKey);
    if (!ROW_KEY) {
        return;
    }
    UI_STATE.minutesEditor = {
        rowKey: ROW_KEY,
        valueText: valueText.trim(),
    };
}

/**
 * Closes the inline minutes editor for the Today carousel.
 */
export function closeMinutesEditor(): void {
    UI_STATE.minutesEditor = null;
}

/**
 * Updates the live text for the currently open minutes editor.
 * @param valueText - Latest user-entered minutes text.
 */
export function setMinutesEditorValue(valueText: string): void {
    if (UI_STATE.minutesEditor === null) {
        return;
    }
    UI_STATE.minutesEditor = {
        rowKey: UI_STATE.minutesEditor.rowKey,
        valueText: valueText.trim(),
    };
}

/**
 * Clears row-scoped Today UI state after a row is removed from the schedule.
 * @param bookId - Book id owning the removed row.
 * @param rowKey - Removed row identity key.
 */
export function clearTodayCarouselRowState(
    bookId: string,
    rowKey: string,
): void {
    const BOOK_ID = normalizeKeyText(bookId);
    const ROW_KEY = normalizeKeyText(rowKey);
    if (ROW_KEY === "") {
        return;
    }
    if (UI_STATE.minutesEditor?.rowKey === ROW_KEY) {
        UI_STATE.minutesEditor = null;
    }
    if (BOOK_ID !== "" && UI_STATE.pinnedRowKeyByBookId[BOOK_ID] === ROW_KEY) {
        delete UI_STATE.pinnedRowKeyByBookId[BOOK_ID];
    }
    delete UI_STATE.progressDraftByRowKey[ROW_KEY];
}

/**
 * Resets all ephemeral Today carousel UI state.
 */
export function resetTodayCarouselUiState(): void {
    UI_STATE.minutesEditor = null;
    UI_STATE.pinnedRowKeyByBookId = {};
    UI_STATE.progressDraftByRowKey = {};
    UI_STATE.selectedBookId = EMPTY_TEXT;
}
