import {
    type AppCalendarInteractionArgs,
    type CalendarInteractionHandlers,
    type CompletionRow,
    type CompletionUpdate,
    type ProgressUpdateInput,
} from "../../../types/types.js";
import { sessionKeyFor } from "../../calendar/utils.js";
import {
    dayBookCompletionKey,
    dayBookCompletionKeyFromSession,
    manualSessionBooks,
} from "./calendar_interactions_helpers.js";
import { BUILD_SCHEDULE_MUTATION_HANDLERS } from "./calendar_interactions_schedule_handlers.js";

const COMPLETION_FALLBACK_KEY = (row: CompletionRow | undefined): string => {
    if (row === undefined) {
        return "";
    }
    if (typeof row.date !== "string" || row.date === "") {
        return "";
    }
    if (typeof row.book_id !== "string" || row.book_id === "") {
        return "";
    }
    return dayBookCompletionKey(row.date, row.book_id);
};

const SET_COMPLETION_STATE = (
    completionStateInput: Record<string, boolean>,
    sessionKey: string,
    fallbackKey: string,
    completed: boolean,
): void => {
    const COMPLETION_STATE = completionStateInput;
    if (completed) {
        COMPLETION_STATE[sessionKey] = true;
        if (fallbackKey !== "") {
            COMPLETION_STATE[fallbackKey] = true;
        }
        return;
    }
    delete COMPLETION_STATE[sessionKey];
    if (fallbackKey !== "") {
        delete COMPLETION_STATE[fallbackKey];
    }
};

const COMPLETION_STATUS_MESSAGE = (
    row: CompletionRow | undefined,
    completed: boolean,
): string => {
    if (row === undefined) {
        return "";
    }
    if (typeof row.title !== "string" || row.title === "") {
        return "";
    }
    if (typeof row.date !== "string" || row.date === "") {
        return "";
    }
    if (completed) {
        return `Marked "${row.title}" complete on ${row.date}.`;
    }
    return `Marked "${row.title}" incomplete on ${row.date}.`;
};

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
    return completionState[FALLBACK_KEY];
};

const HANDLE_COMPLETION_CHANGED = (
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void => {
    const COMPLETION_STATE = { ...args.state.scheduleCompletions };
    const FALLBACK_KEY = COMPLETION_FALLBACK_KEY(payload.row);
    SET_COMPLETION_STATE(
        COMPLETION_STATE,
        payload.sessionKey,
        FALLBACK_KEY,
        payload.completed,
    );
    args.applyStateMutation({
        scheduleCompletions: COMPLETION_STATE,
        type: "set_schedule_completions",
    });
    args.queuePersist();
    const STATUS_MESSAGE = COMPLETION_STATUS_MESSAGE(
        payload.row,
        payload.completed,
    );
    if (STATUS_MESSAGE !== "") {
        args.setStatus(STATUS_MESSAGE);
    }
    if (args.onSessionCompletionUpdated !== undefined) {
        args.onSessionCompletionUpdated(payload);
    }
};

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
        { notifyBooksChanged: false },
    );
    if (UPDATED_BOOK === null) {
        args.setStatus("Could not find that book to update progress.", true);
        return null;
    }
    if (payload.row !== undefined) {
        const COMPLETION_STATE = { ...args.state.scheduleCompletions };
        COMPLETION_STATE[sessionKeyFor(payload.row)] = true;
        COMPLETION_STATE[
            dayBookCompletionKey(payload.row.date, payload.row.book_id)
        ] = true;
        args.applyStateMutation({
            scheduleCompletions: COMPLETION_STATE,
            type: "set_schedule_completions",
        });
    }
    if (UPDATED_BOOK.title === "") {
        args.setStatus("Updated progress for book.");
    } else {
        args.setStatus(`Updated progress for ${UPDATED_BOOK.title}.`);
    }
    args.queuePersist();
    if (args.onProgressUpdated !== undefined) {
        args.onProgressUpdated(UPDATED_BOOK);
    }
    return UPDATED_BOOK;
};

const BUILD_CALENDAR_HANDLERS = (
    args: AppCalendarInteractionArgs,
): CalendarInteractionHandlers => {
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
): void {
    args.configureCalendarInteractions(BUILD_CALENDAR_HANDLERS(args));
}
