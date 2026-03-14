import type {
    CalendarRowWithFinish,
    CalendarStateSubset,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { fallbackBookForRow } from "./details_fallback_book.ts";
import { minutesFormForSession } from "./details_minutes_form.ts";
import { progressFormForToday } from "./details_progress_form.ts";
import {
    baseSessionItem,
    COMPLETE_ITEM_CLASS,
    COMPLETE_TOGGLE_LABEL,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.ts";
import { estimateProgressLabel } from "./estimates.ts";
import { sessionKeyFor } from "./utils.ts";

export interface BuildTodaySessionItemArgs {
    interactionHandlers: DetailInteractionHandlers;
    rerenderDetails: () => void;
    row: CalendarRowWithFinish;
    state: CalendarStateSubset;
}

interface CompletionUi {
    checkbox: HTMLInputElement;
    label: HTMLElement;
    sessionKey: string;
}

interface CompletionChangeArgs {
    interactionHandlers: DetailInteractionHandlers;
    item: HTMLElement;
    rerenderDetails: () => void;
    row: CalendarRowWithFinish;
    sessionKey: string;
}

type CompletionUiArgs = Omit<CompletionChangeArgs, "sessionKey">;

interface AppendTodaySessionEditorsArgs extends CompletionChangeArgs {
    book: ReturnType<DetailInteractionHandlers["getBookById"]>;
    checkbox: HTMLInputElement;
}

function completionToggle(
    interactionHandlers: DetailInteractionHandlers,
    sessionKey: string,
): CompletionUi {
    const LABEL = document.createElement("label");
    LABEL.className = "day-complete-toggle";
    const CHECKBOX = document.createElement("input");
    CHECKBOX.type = "checkbox";
    CHECKBOX.checked = Boolean(
        interactionHandlers.isSessionCompleted(sessionKey),
    );
    LABEL.append(CHECKBOX, COMPLETE_TOGGLE_LABEL);
    return { checkbox: CHECKBOX, label: LABEL, sessionKey };
}

function notifyCompletionChange(
    args: CompletionChangeArgs,
    completed: boolean,
): void {
    args.item.classList.toggle(COMPLETE_ITEM_CLASS, completed);
    args.interactionHandlers.onSessionCompletionChanged({
        completed,
        row: args.row,
        sessionKey: args.sessionKey,
    });
    args.rerenderDetails();
}

function createCompletionUi(args: CompletionUiArgs): CompletionUi {
    const SESSION_KEY = sessionKeyFor(args.row);
    const TOGGLE = completionToggle(args.interactionHandlers, SESSION_KEY);
    args.item.classList.toggle(COMPLETE_ITEM_CLASS, TOGGLE.checkbox.checked);
    TOGGLE.checkbox.onchange = () => {
        notifyCompletionChange(
            { ...args, sessionKey: SESSION_KEY },
            Boolean(TOGGLE.checkbox.checked),
        );
    };
    return { ...TOGGLE, sessionKey: SESSION_KEY };
}

function markSessionComplete(args: AppendTodaySessionEditorsArgs): void {
    const CHECKBOX = args.checkbox;
    if (CHECKBOX.checked) {
        return;
    }
    CHECKBOX.checked = true;
    notifyCompletionChange(args, true);
}

function todaySessionBook(args: BuildTodaySessionItemArgs) {
    return (
        args.interactionHandlers.getBookById(args.row.book_id) ??
        fallbackBookForRow(args.row)
    );
}

function progressEditor(
    args: AppendTodaySessionEditorsArgs,
): ReturnType<typeof progressFormForToday> {
    return progressFormForToday(
        args.row,
        args.book,
        args.interactionHandlers,
        () => {
            markSessionComplete(args);
        },
    );
}

function appendTodaySessionEditors(args: AppendTodaySessionEditorsArgs): void {
    args.item.append(
        minutesFormForSession(
            args.row,
            args.interactionHandlers,
            args.rerenderDetails,
        ),
    );
    args.item.append(progressEditor(args));
}

function estimateElement(
    args: BuildTodaySessionItemArgs,
): HTMLParagraphElement {
    const ESTIMATE = document.createElement("p");
    ESTIMATE.className = DAY_DETAILS_META_CLASS;
    ESTIMATE.textContent = estimateProgressLabel(
        args.row,
        args.state,
        args.interactionHandlers.getBookById,
        args.interactionHandlers.isSessionCompleted,
    );
    return ESTIMATE;
}

function appendEstimateIfIncomplete(options: {
    completionUi: CompletionUi;
    estimate: HTMLParagraphElement;
    interactionHandlers: DetailInteractionHandlers;
    item: HTMLElement;
}): void {
    const IS_COMPLETED = options.interactionHandlers.isSessionCompleted(
        options.completionUi.sessionKey,
    );
    if (!IS_COMPLETED) {
        options.item.append(options.estimate);
    }
}

function appendTodaySessionContent(
    args: BuildTodaySessionItemArgs,
    completionUi: CompletionUi,
    item: HTMLElement,
): void {
    item.append(completionUi.label);
    appendTodaySessionEditors({
        ...args,
        book: todaySessionBook(args),
        checkbox: completionUi.checkbox,
        item,
        sessionKey: completionUi.sessionKey,
    });
    item.append(
        removeSessionButton(
            args.row,
            args.interactionHandlers,
            args.rerenderDetails,
        ),
    );
}

export function buildTodaySessionItem(
    args: BuildTodaySessionItemArgs,
): HTMLElement {
    const ITEM = baseSessionItem(args.row);
    const COMPLETION_UI = createCompletionUi({ ...args, item: ITEM });
    appendTodaySessionContent(args, COMPLETION_UI, ITEM);
    appendEstimateIfIncomplete({
        completionUi: COMPLETION_UI,
        estimate: estimateElement(args),
        interactionHandlers: args.interactionHandlers,
        item: ITEM,
    });
    return ITEM;
}
