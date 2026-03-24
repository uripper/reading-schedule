/**
 * Binds Today carousel controls to shared schedule and progress mutations.
 */
import type { CalendarHandlers } from "../../../types/types.ts";
import { el } from "../../dom.ts";
import {
    buildProgressUpdatePayload,
    parseMinutesInput,
} from "./today_carousel_actions.ts";
import type { TodayCarouselActiveItem } from "./today_carousel_model.ts";
import {
    clearTodayCarouselRowState,
    closeMinutesEditor,
    minutesEditor,
    openMinutesEditor,
    pinRowKey,
    setMinutesEditorValue,
} from "./today_carousel_state.ts";

// TODO: Move Today carousel binding contracts into `electron/types` once the
// renderer Today modules settle.
/**
 * Schedule and progress callbacks exposed to the Today carousel UI.
 */
export interface TodayCarouselActionBindings {
    onSessionCompletionChanged: CalendarHandlers["onSessionCompletionChanged"];
    onSessionMinutesUpdated: CalendarHandlers["onSessionMinutesUpdated"];
    onSessionProgressUpdated: CalendarHandlers["onSessionProgressUpdated"];
    onSessionRemoved: CalendarHandlers["onSessionRemoved"];
    rerender(): void;
    setStatus(message: string, isError?: boolean): void;
}

interface MinutesEditorOptions {
    active: TodayCarouselActiveItem;
    bindings: TodayCarouselActionBindings | null;
    onUiRerender(): void;
}

interface ToggleButtonOptions {
    active: TodayCarouselActiveItem;
    bindings: TodayCarouselActionBindings | null;
}

function saveMinutesUpdate(
    options: MinutesEditorOptions,
    minutesText: string,
): void {
    const PARSED = parseMinutesInput(minutesText);
    if (PARSED.minutes === null) {
        options.bindings?.setStatus(PARSED.error, true);
        return;
    }
    const BINDINGS = options.bindings;
    if (BINDINGS === null) {
        return;
    }
    const APPLIED = BINDINGS.onSessionMinutesUpdated({
        minutes: PARSED.minutes,
        row: options.active.row.row,
    });
    if (!APPLIED) {
        return;
    }
    pinRowKey(options.active.book.bookId, options.active.row.rowKey);
    closeMinutesEditor();
    BINDINGS.rerender();
}

function bindMinutesEditButton(
    button: HTMLButtonElement,
    input: HTMLInputElement,
    options: MinutesEditorOptions,
): void {
    const BUTTON = button;
    BUTTON.onclick = () => {
        const EDIT_STATE = minutesEditor();
        const IS_EDITING_ACTIVE_ROW =
            EDIT_STATE?.rowKey === options.active.row.rowKey;
        if (!IS_EDITING_ACTIVE_ROW) {
            openMinutesEditor(
                options.active.row.rowKey,
                String(options.active.row.minutes),
            );
            options.onUiRerender();
            return;
        }
        saveMinutesUpdate(options, input.value);
    };
}

function bindMinutesInputKeys(
    input: HTMLInputElement,
    options: MinutesEditorOptions,
): void {
    const INPUT = input;
    INPUT.oninput = () => {
        setMinutesEditorValue(INPUT.value);
    };
    INPUT.onkeydown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            saveMinutesUpdate(options, INPUT.value);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            closeMinutesEditor();
            options.onUiRerender();
        }
    };
}

/**
 * Binds the Today inline minutes editor to the current active session.
 * @param options - Active row context and mutation callbacks.
 */
export function bindMinutesEditor(options: MinutesEditorOptions): void {
    const EDIT_BTN = el<HTMLButtonElement>("todayMinutesEditBtn");
    const INPUT = el<HTMLInputElement>("todayMinutesInput");
    bindMinutesEditButton(EDIT_BTN, INPUT, options);
    bindMinutesInputKeys(INPUT, options);
}

function progressUpdateDraft(): { pagesText: string; percentText: string } {
    return {
        pagesText: el<HTMLInputElement>("todayPagesInput").value,
        percentText: el<HTMLInputElement>("todayPercentInput").value,
    };
}

function hasProgressChange(payload: {
    pagesRead?: number | null;
    progressPercent?: number | null;
}): boolean {
    return (
        payload.pagesRead !== undefined || payload.progressPercent !== undefined
    );
}

function progressPayloadResult(options: ToggleButtonOptions) {
    return buildProgressUpdatePayload({
        bookId: options.active.book.bookId,
        currentPagesRead: options.active.pagesRead,
        currentPagesTotal: options.active.pagesTotal,
        currentPercent: options.active.progressPercent,
        draft: progressUpdateDraft(),
        row: options.active.row.row,
    });
}

function applyProgressChanges(
    bindings: TodayCarouselActionBindings,
    payload: {
        pagesRead?: number | null;
        progressPercent?: number | null;
        row: TodayCarouselActiveItem["row"]["row"];
        bookId: string;
    },
): boolean {
    if (!hasProgressChange(payload)) {
        return true;
    }
    const UPDATED = bindings.onSessionProgressUpdated(payload);
    return UPDATED !== null;
}

function completeActiveSession(
    options: ToggleButtonOptions,
    bindings: TodayCarouselActionBindings,
): void {
    const PAYLOAD_RESULT = progressPayloadResult(options);
    if (!PAYLOAD_RESULT.valid) {
        bindings.setStatus(PAYLOAD_RESULT.error, true);
        return;
    }
    if (!applyProgressChanges(bindings, PAYLOAD_RESULT.payload)) {
        return;
    }
    bindings.onSessionCompletionChanged({
        completed: true,
        row: options.active.row.row,
        sessionKey: options.active.row.rowKey,
    });
    closeMinutesEditor();
    bindings.rerender();
}

function uncompleteActiveSession(
    options: ToggleButtonOptions,
    bindings: TodayCarouselActionBindings,
): void {
    closeMinutesEditor();
    bindings.onSessionCompletionChanged({
        completed: false,
        row: options.active.row.row,
        sessionKey: options.active.row.rowKey,
    });
    bindings.rerender();
}

/**
 * Binds the Today completion/log button for the active session row.
 * @param options - Active row context and mutation callbacks.
 */
export function bindToggleButton(options: ToggleButtonOptions): void {
    const BUTTON = el<HTMLButtonElement>("todayLogSessionBtn");
    BUTTON.onclick = () => {
        const BINDINGS = options.bindings;
        if (BINDINGS === null) {
            return;
        }
        pinRowKey(options.active.book.bookId, options.active.row.rowKey);
        if (options.active.row.completed) {
            uncompleteActiveSession(options, BINDINGS);
            return;
        }
        completeActiveSession(options, BINDINGS);
    };
}

/**
 * Binds the Today remove-session button for the active session row.
 * @param options - Active row context and mutation callbacks.
 */
export function bindRemoveButton(options: {
    active: TodayCarouselActiveItem;
    bindings: TodayCarouselActionBindings | null;
}): void {
    const BUTTON = el<HTMLButtonElement>("todayRemoveSessionBtn");
    BUTTON.onclick = () => {
        if (options.bindings === null) {
            return;
        }
        const REMOVED = options.bindings.onSessionRemoved({
            row: options.active.row.row,
        });
        if (!REMOVED) {
            return;
        }
        clearTodayCarouselRowState(
            options.active.book.bookId,
            options.active.row.rowKey,
        );
        options.bindings.rerender();
    };
}
