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

/**
 * Create UI controls for marking a session complete and wire up interaction handlers.
 * @example
 * createCompletionUi(row, interactionHandlers, item, rerenderDetails)
 * { checkbox: HTMLInputElement, label: HTMLLabelElement, sessionKey: string }
 * @param {CalendarRowWithFinish} row - The calendar row describing the session (including finish info).
 * @param {DetailInteractionHandlers} interactionHandlers - Handlers to query and update session completion state.
 * @param {HTMLElement} item - Container DOM element to attach the completion UI and toggle completion class on.
 * @param {() => void} rerenderDetails - Callback invoked to re-render detail UI after completion changes.
 * @returns {CompletionUi} An object containing the created checkbox input, label element, and sessionKey.
 **/
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

/**
 * Append editors for today's session (minutes and progress forms) to the given item element and wire up completion handling.
 * @example
 * appendTodaySessionEditors({
 *   book: someBook, // ReturnType<DetailInteractionHandlers["getBookById"]>
 *   completeCheckbox: document.createElement('input') as HTMLInputElement,
 *   interactionHandlers: interactionHandlersInstance,
 *   item: document.createElement('div'),
 *   rerenderDetails: () => { /* re-render callback */
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
    /**
     * Mark the given session as completed, update its UI state, and notify listeners.
     * @example
     * markSessionComplete(args)
     * undefined
     * @param {Object} args - Object containing completeCheckbox, item, interactionHandlers, row, sessionKey and rerenderDetails used to complete the session.
     * @returns {void} Does not return a value.
     **/
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
