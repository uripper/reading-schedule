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

export function selectedBookId(): string {
    return UI_STATE.selectedBookId;
}

export function setSelectedBookId(bookId: string): void {
    UI_STATE.selectedBookId = String(bookId || "").trim();
}
export function pinnedRowKeySnapshot(): Record<string, string> {
    return { ...UI_STATE.pinnedRowKeyByBookId };
}

export function pinRowKey(bookId: string, rowKey: string): void {
    const BOOK_ID = String(bookId || "").trim();
    const ROW_KEY = String(rowKey || "").trim();
    if (!BOOK_ID || !ROW_KEY) {
        return;
    }
    UI_STATE.pinnedRowKeyByBookId[BOOK_ID] = ROW_KEY;
}

export function progressDraft(rowKey: string): ProgressDraft | null {
    const ROW_KEY = String(rowKey || "").trim();
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

export function setProgressDraft(options: {
    rowKey: string;
    pagesText: string;
    percentText: string;
}): void {
    const ROW_KEY = String(options.rowKey || "").trim();
    if (!ROW_KEY) {
        return;
    }
    UI_STATE.progressDraftByRowKey[ROW_KEY] = {
        pagesText: String(options.pagesText ?? "").trim(),
        percentText: String(options.percentText ?? "").trim(),
    };
}

export function minutesEditor(): MinutesEditorState | null {
    if (UI_STATE.minutesEditor === null) {
        return null;
    }
    return {
        rowKey: UI_STATE.minutesEditor.rowKey,
        valueText: UI_STATE.minutesEditor.valueText,
    };
}

export function openMinutesEditor(rowKey: string, valueText: string): void {
    const ROW_KEY = String(rowKey || "").trim();
    if (!ROW_KEY) {
        return;
    }
    UI_STATE.minutesEditor = {
        rowKey: ROW_KEY,
        valueText: String(valueText || "").trim(),
    };
}

export function closeMinutesEditor(): void {
    UI_STATE.minutesEditor = null;
}

export function setMinutesEditorValue(valueText: string): void {
    if (UI_STATE.minutesEditor === null) {
        return;
    }
    UI_STATE.minutesEditor = {
        rowKey: UI_STATE.minutesEditor.rowKey,
        valueText: String(valueText || "").trim(),
    };
}
