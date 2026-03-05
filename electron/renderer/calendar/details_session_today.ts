import type {
    CalendarRowWithFinish,
    CalendarStateSubset,
    DetailInteractionHandlers,
} from "../../types/types.js";
import { fallbackBookForRow } from "./details_fallback_book.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import { progressFormForToday } from "./details_progress_form.js";
import {
    baseSessionItem,
    COMPLETE_ITEM_CLASS,
    COMPLETE_TOGGLE_LABEL,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.js";
import { estimateProgressLabel } from "./estimates.js";
import { sessionKeyFor } from "./utils.js";

interface CompletionUi {
    checkbox: HTMLInputElement;
    label: HTMLElement;
    sessionKey: string;
}

function createCompletionUi(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    item: HTMLElement,
    rerenderDetails: () => void,
): CompletionUi {
    const SESSION_KEY = sessionKeyFor(row);
    const COMPLETE_LABEL = document.createElement("label");
    COMPLETE_LABEL.className = "day-complete-toggle";
    const COMPLETE_INPUT = document.createElement("input");
    COMPLETE_INPUT.type = "checkbox";
    COMPLETE_INPUT.checked = Boolean(
        interactionHandlers.isSessionCompleted(SESSION_KEY),
    );
    COMPLETE_LABEL.append(COMPLETE_INPUT, COMPLETE_TOGGLE_LABEL);
    item.classList.toggle(COMPLETE_ITEM_CLASS, COMPLETE_INPUT.checked);
    COMPLETE_INPUT.onchange = () => {
        const CHECKED = Boolean(COMPLETE_INPUT.checked);
        item.classList.toggle(COMPLETE_ITEM_CLASS, CHECKED);
        interactionHandlers.onSessionCompletionChanged({
            completed: CHECKED,
            row,
            sessionKey: SESSION_KEY,
        });
        rerenderDetails();
    };
    return {
        checkbox: COMPLETE_INPUT,
        label: COMPLETE_LABEL,
        sessionKey: SESSION_KEY,
    };
}

function appendTodaySessionEditors(args: {
    book: ReturnType<DetailInteractionHandlers["getBookById"]>;
    completeCheckbox: HTMLInputElement;
    interactionHandlers: DetailInteractionHandlers;
    item: HTMLElement;
    rerenderDetails: () => void;
    row: CalendarRowWithFinish;
    sessionKey: string;
}): void {
    const BOOK = args.book ?? fallbackBookForRow(args.row);
    const MARK_COMPLETE_FROM_PROGRESS_UPDATE = (): void => {
        if (args.completeCheckbox.checked) {
            return;
        }
        args.completeCheckbox.checked = true;
        args.item.classList.add(COMPLETE_ITEM_CLASS);
        args.interactionHandlers.onSessionCompletionChanged({
            completed: true,
            row: args.row,
            sessionKey: args.sessionKey,
        });
        args.rerenderDetails();
    };
    args.item.append(
        minutesFormForSession(
            args.row,
            args.interactionHandlers,
            args.rerenderDetails,
        ),
    );
    args.item.append(
        progressFormForToday(
            args.row,
            BOOK,
            args.interactionHandlers,
            MARK_COMPLETE_FROM_PROGRESS_UPDATE,
        ),
    );
}

/**
 * Builds details row node for today sessions with progress and completion UX.
 * @param row - Calendar row.
 * @param state - Calendar state subset.
 * @param interactionHandlers - Detail interaction handlers.
 * @param rerenderDetails - Details rerender callback.
 * @returns Rendered row element.
 */
export function buildTodaySessionItem(
    row: CalendarRowWithFinish,
    state: CalendarStateSubset,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const ITEM = baseSessionItem(row);
    const COMPLETION_UI = createCompletionUi(
        row,
        interactionHandlers,
        ITEM,
        rerenderDetails,
    );
    const ESTIMATE = document.createElement("p");
    ESTIMATE.className = DAY_DETAILS_META_CLASS;
    ESTIMATE.textContent = estimateProgressLabel(
        row,
        state,
        interactionHandlers.getBookById,
        interactionHandlers.isSessionCompleted,
    );
    const INCLUDE_ESTIMATE = !interactionHandlers.isSessionCompleted(
        COMPLETION_UI.sessionKey,
    );
    ITEM.append(COMPLETION_UI.label);
    appendTodaySessionEditors({
        book: interactionHandlers.getBookById(row.book_id),
        completeCheckbox: COMPLETION_UI.checkbox,
        interactionHandlers,
        item: ITEM,
        rerenderDetails,
        row,
        sessionKey: COMPLETION_UI.sessionKey,
    });
    if (INCLUDE_ESTIMATE) {
        ITEM.append(ESTIMATE);
    }
    ITEM.append(removeSessionButton(row, interactionHandlers, rerenderDetails));
    return ITEM;
}
