/**
 * Binds Today carousel controls to shared schedule and progress mutations.
 */
import type { CalendarHandlers } from "../../../types/types.js";
import { el } from "../../dom.js";
import {
    buildProgressUpdatePayload,
    parseMinutesInput,
} from "./today_carousel_actions.js";
import type { TodayCarouselActiveItem } from "./today_carousel_model.js";
import {
    clearTodayCarouselRowState,
    closeMinutesEditor,
    minutesEditor,
    openMinutesEditor,
    pinRowKey,
    setMinutesEditorValue,
} from "./today_carousel_state.js";

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

/**
 * Binds the Today inline minutes editor to the current active session.
 * @param options - Active row context and mutation callbacks.
 */
export function bindMinutesEditor(options: {
    active: TodayCarouselActiveItem;
    bindings: TodayCarouselActionBindings | null;
    onUiRerender(): void;
}): void {
    const EDIT_BTN = el<HTMLButtonElement>("todayMinutesEditBtn");
    const INPUT = el<HTMLInputElement>("todayMinutesInput");

    const SAVE_MINUTES = (): void => {
        const PARSED = parseMinutesInput(INPUT.value);
        if (PARSED.minutes === null) {
            options.bindings?.setStatus(PARSED.error, true);
            return;
        }
        if (options.bindings === null) {
            return;
        }
        const APPLIED = options.bindings.onSessionMinutesUpdated({
            minutes: PARSED.minutes,
            row: options.active.row.row,
        });
        if (!APPLIED) {
            return;
        }
        pinRowKey(options.active.book.bookId, options.active.row.rowKey);
        closeMinutesEditor();
        options.bindings.rerender();
    };

    EDIT_BTN.onclick = () => {
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
        SAVE_MINUTES();
    };
    INPUT.oninput = () => {
        setMinutesEditorValue(INPUT.value);
    };
    INPUT.onkeydown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            SAVE_MINUTES();
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
 * Binds the Today completion/log button for the active session row.
 * @param options - Active row context and mutation callbacks.
 */
export function bindToggleButton(options: {
    active: TodayCarouselActiveItem;
    bindings: TodayCarouselActionBindings | null;
}): void {
    const BUTTON = el<HTMLButtonElement>("todayLogSessionBtn");
    BUTTON.onclick = () => {
        if (options.bindings === null) {
            return;
        }
        pinRowKey(options.active.book.bookId, options.active.row.rowKey);
        if (options.active.row.completed) {
            closeMinutesEditor();
            options.bindings.onSessionCompletionChanged({
                completed: false,
                row: options.active.row.row,
                sessionKey: options.active.row.rowKey,
            });
            options.bindings.rerender();
            return;
        }

        const PAYLOAD_RESULT = buildProgressUpdatePayload({
            bookId: options.active.book.bookId,
            currentPagesRead: options.active.pagesRead,
            currentPercent: options.active.progressPercent,
            draft: {
                pagesText: el<HTMLInputElement>("todayPagesInput").value,
                percentText: el<HTMLInputElement>("todayPercentInput").value,
            },
            row: options.active.row.row,
        });
        if (!PAYLOAD_RESULT.valid) {
            options.bindings.setStatus(PAYLOAD_RESULT.error, true);
            return;
        }

        const HAS_PROGRESS_CHANGE =
            PAYLOAD_RESULT.payload.pagesRead !== undefined ||
            PAYLOAD_RESULT.payload.progressPercent !== undefined;
        if (HAS_PROGRESS_CHANGE) {
            const UPDATED = options.bindings.onSessionProgressUpdated(
                PAYLOAD_RESULT.payload,
            );
            if (UPDATED === null) {
                return;
            }
        }
        options.bindings.onSessionCompletionChanged({
            completed: true,
            row: options.active.row.row,
            sessionKey: options.active.row.rowKey,
        });
        closeMinutesEditor();
        options.bindings.rerender();
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
