import type {
    AppCalendarInteractionArgs,
    CalendarHandlers,
    CompletionRow,
    CompletionUpdate,
    ProgressUpdateInput,
} from "../../../types/types.ts";
import {
    dayBookCompletionKey,
    dayBookCompletionKeyFromSession,
    sessionKeyFor,
} from "../../calendar/utils.ts";
import { manualSessionBooks } from "./calendar_interactions_helpers.ts";
import { BUILD_SCHEDULE_MUTATION_HANDLERS } from "./calendar_interactions_schedule_handlers.ts";
import { markBookStartedForCompletedRow } from "./calendar-interactions-completion-books.ts";

interface CompletionStateUpdateArgs {
    completed: boolean;
    completionState: Record<string, boolean>;
    keys: string[];
}

function rowText(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value;
}

const COMPLETION_FALLBACK_KEY = (row: CompletionRow | undefined): string => {
    const DATE = rowText(row?.date);
    const BOOK_ID = rowText(row?.book_id);
    if (DATE === "" || BOOK_ID === "") {
        return "";
    }
    return dayBookCompletionKey(DATE, BOOK_ID);
};

function completionKeys(sessionKey: string, fallbackKey: string): string[] {
    if (fallbackKey === "") {
        return [sessionKey];
    }
    return [sessionKey, fallbackKey];
}

const SET_COMPLETION_STATE = ({
    completed,
    completionState,
    keys,
}: CompletionStateUpdateArgs): void => {
    if (completed) {
        for (const KEY of keys) {
            completionState[KEY] = true;
        }
        return;
    }
    for (const KEY of keys) {
        delete completionState[KEY];
    }
};

const COMPLETION_STATUS_MESSAGE = (
    row: CompletionRow | undefined,
    completed: boolean,
): string => {
    const TITLE = rowText(row?.title);
    const DATE = rowText(row?.date);
    if (TITLE === "" || DATE === "") {
        return "";
    }
    return completionStatusText(TITLE, DATE, completed);
};

function completionStatusText(
    title: string,
    date: string,
    completed: boolean,
): string {
    if (completed) {
        return `Marked "${title}" complete on ${date}.`;
    }
    return `Marked "${title}" incomplete on ${date}.`;
}

const IS_COMPLETED = (
    completionState: Record<string, boolean>,
    sessionKey: string,
): boolean => {
    if (completionState[sessionKey]) {
        return true;
    }
    const FALLBACK_KEY = dayBookCompletionKeyFromSession(sessionKey);
    if (FALLBACK_KEY === "") {
        return false;
    }
    return completionState[FALLBACK_KEY] === true;
};

const HANDLE_COMPLETION_CHANGED = (
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void => {
    markBookStartedForCompletedRow(args, payload);
    applyCompletionChangedState(args, payload);
    applyCompletionChangedStatus(args, payload);
    notifySessionCompletionUpdated(args, payload);
};

function applyCompletionChangedState(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    const COMPLETION_STATE = { ...args.state.scheduleCompletions };
    const FALLBACK_KEY = COMPLETION_FALLBACK_KEY(payload.row);
    SET_COMPLETION_STATE({
        completed: payload.completed,
        completionState: COMPLETION_STATE,
        keys: completionKeys(payload.sessionKey, FALLBACK_KEY),
    });
    args.applyStateMutation({
        scheduleCompletions: COMPLETION_STATE,
        type: "set_schedule_completions",
    });
    args.queuePersist();
}

function applyCompletionChangedStatus(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    const STATUS_MESSAGE = COMPLETION_STATUS_MESSAGE(
        payload.row,
        payload.completed,
    );
    if (STATUS_MESSAGE !== "") {
        args.setStatus(STATUS_MESSAGE);
    }
}

function notifySessionCompletionUpdated(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    if (args.onSessionCompletionUpdated === undefined) {
        return;
    }
    args.onSessionCompletionUpdated(payload);
}

function markProgressRowCompleted(
    args: AppCalendarInteractionArgs,
    row: ProgressUpdateInput["row"],
): void {
    if (row === undefined) {
        return;
    }
    const COMPLETION_STATE = { ...args.state.scheduleCompletions };
    SET_COMPLETION_STATE({
        completed: true,
        completionState: COMPLETION_STATE,
        keys: completionKeys(
            sessionKeyFor(row),
            dayBookCompletionKey(row.date, row.book_id),
        ),
    });
    args.applyStateMutation({
        scheduleCompletions: COMPLETION_STATE,
        type: "set_schedule_completions",
    });
}

function progressStatusMessage(
    updatedBook: Exclude<
        ReturnType<AppCalendarInteractionArgs["updateBookProgress"]>,
        null
    >,
): string {
    if (updatedBook.title === "") {
        return "Updated progress for book.";
    }
    return `Updated progress for ${updatedBook.title}.`;
}

const HANDLE_PROGRESS_UPDATED = (
    args: AppCalendarInteractionArgs,
    payload: ProgressUpdateInput,
): ReturnType<AppCalendarInteractionArgs["updateBookProgress"]> => {
    const UPDATED_BOOK = args.updateBookProgress(
        payload.bookId,
        {
            pagesRead: payload.pagesRead,
            progressPercent: payload.progressPercent,
        },
        {
            completedAt: rowText(payload.row?.date),
            notifyBooksChanged: false,
        },
    );
    if (UPDATED_BOOK === null) {
        args.setStatus("Could not find that book to update progress.", true);
        return null;
    }
    markProgressRowCompleted(args, payload.row);
    args.setStatus(progressStatusMessage(UPDATED_BOOK));
    args.queuePersist();
    if (args.onProgressUpdated !== undefined) {
        args.onProgressUpdated(UPDATED_BOOK);
    }
    return UPDATED_BOOK;
};

const BUILD_CALENDAR_HANDLERS = (
    args: AppCalendarInteractionArgs,
): CalendarHandlers => {
    const SCHEDULE_MUTATION_HANDLERS = BUILD_SCHEDULE_MUTATION_HANDLERS(args);
    return {
        getBookById: (bookId) => args.getBookById(bookId),
        isSessionCompleted: (sessionKey) =>
            IS_COMPLETED(args.state.scheduleCompletions, sessionKey),
        listSessionBooks: () => manualSessionBooks(args.collectAllBooks()),
        onSessionCompletionChanged: (payload) => {
            HANDLE_COMPLETION_CHANGED(args, payload);
        },
        onSessionProgressUpdated: (payload) =>
            HANDLE_PROGRESS_UPDATED(args, payload),
        ...SCHEDULE_MUTATION_HANDLERS,
    };
};

export function configureAppCalendarInteractions(
    args: AppCalendarInteractionArgs,
): CalendarHandlers {
    const HANDLERS = BUILD_CALENDAR_HANDLERS(args);
    args.configureCalendarInteractions(HANDLERS);
    return HANDLERS;
}
