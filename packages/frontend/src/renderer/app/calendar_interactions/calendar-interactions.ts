import type {
    AppCalendarInteractionArgs,
    CalendarHandlers,
    CompletionRow,
    CompletionUpdate,
    ProgressUpdateInput,
} from "../../../types/types.ts";
import { sessionKeyFor } from "../../calendar/utils.ts";
import { manualSessionBooks } from "./calendar_interactions_helpers.ts";
import {
    dayBookCompletionKey,
    dayBookCompletionKeyFromSession,
} from "./calendar_interactions_key_helpers.ts";
import { BUILD_SCHEDULE_MUTATION_HANDLERS } from "./calendar_interactions_schedule_handlers.ts";

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

/**
 * Returns a day-book completion key for a given completion row or an empty string when the row or required fields are missing.
 * @example
 * rowToDayBookCompletionKey({ date: '2023-01-01', book_id: 'book123' })
 * dayBookCompletionKey('2023-01-01', 'book123')
 * @param {CompletionRow|undefined} row - Completion row object that should contain non-empty date and book_id fields.
 * @returns {string} A string key produced by dayBookCompletionKey(date, book_id) or an empty string if row is undefined or invalid.
 **/
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

/**
 * Update a completion-state map by setting or removing entries for a session key and an optional fallback key based on a completion flag.
 * @example
 * updateCompletionState(completionState, 'session123', 'fallback456', true)
 * undefined
 * @param completionStateInput - The mutable map that tracks completion status by session keys.
 * @param sessionKey - The primary session key to set to true or remove from the map.
 * @param fallbackKey - An optional fallback session key; if non-empty it is treated the same as the primary key.
 * @param completed - If true, set the keys to true; if false, remove the keys from the map.
 * @returns No return value; the function mutates the provided completionStateInput in place.
 **/
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

/**
 * Create a human-readable message indicating whether a completion row was marked complete or incomplete.
 * @example
 * formatCompletionStatus({ title: "Write report", date: "2026-03-13" }, true)
 * Marked "Write report" complete on 2026-03-13.
 * @param row - The completion row object or undefined.
 * @param completed - True if the row is marked complete, false if marked incomplete.
 * @returns Return a formatted status message or an empty string if input is invalid.
 **/
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

function completionDate(row: CompletionRow | undefined): string | undefined {
    const DATE = rowText(row?.date);
    if (DATE === "") {
        return undefined;
    }
    return DATE;
}

function isProjectedFinishRow(row: CompletionRow | undefined): boolean {
    if (row === undefined) {
        return false;
    }
    return row.finish === true;
}

function markBookReadForFinishedRow(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    if (!payload.completed) {
        return;
    }
    if (!isProjectedFinishRow(payload.row)) {
        return;
    }
    const BOOK_ID = rowText(payload.row?.book_id);
    if (BOOK_ID === "") {
        return;
    }
    const UPDATED = args.updateBookProgress(
        BOOK_ID,
        { progressPercent: 100 },
        {
            completedAt: completionDate(payload.row),
            notifyBooksChanged: false,
        },
    );
    if (UPDATED === null) {
        return;
    }
    if (args.onProgressUpdated !== undefined) {
        args.onProgressUpdated(UPDATED);
    }
}

/**
 * Determines whether a session (or its day-book fallback session) is marked complete in the provided completion state.
 * @example
 * isSessionComplete({ "session:123": true }, "session:123")
 * true
 * @param {Record<string, boolean>} completionState - Mapping of session keys to booleans indicating completion.
 * @param {string} sessionKey - The session key to check for completion; a day-book fallback key will be used if present.
 * @returns {boolean} True if the session or its fallback key is complete, otherwise false.
 **/
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

/**
 * Update session completion state, persist changes, set an optional status message, and invoke any configured callback.
 * @example
 * handleCompletionUpdate(args, payload)
 * undefined
 * @param args - Calendar interaction helpers and state accessor used to update completions and trigger persistence.
 * @param payload - Payload describing which row/session was updated and the new completed boolean.
 * @returns Does not return a value; updates state, queues persistence, sets status, and calls onSessionCompletionUpdated if present.
 **/
const HANDLE_COMPLETION_CHANGED = (
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void => {
    markBookReadForFinishedRow(args, payload);
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

/**
 * Update a book's reading progress, mark schedule completion if provided, persist the change, and notify listeners.
 * @example
 * updateProgress(args, { bookId: "book-123", pagesRead: 50, progressPercent: 25 })
 * { id: "book-123", title: "Example Title", pagesRead: 50, progressPercent: 25 }
 * @param args - Helpers, state accessors, and callbacks used to perform the calendar update.
 * @param payload - Progress data including bookId, pagesRead, optional progressPercent, and optional schedule row for completion.
 * @returns The updated book object returned by updateBookProgress, or null if the book was not found.
 **/
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

/**
 * Create CalendarHandlers from the provided AppCalendarInteractionArgs; wires up book lookup, session completion/progress handlers and schedule mutation handlers.
 * @example
 * buildCalendarHandlers(args)
 * { getBookById: [Function], isSessionCompleted: [Function], listSessionBooks: [Function], onSessionCompletionChanged: [Function], onSessionProgressUpdated: [Function], ...scheduleMutationHandlers }
 * @param {AppCalendarInteractionArgs} args - The arguments and application state required to build calendar interaction handlers.
 * @returns {CalendarHandlers} A collection of handlers for calendar interactions (getBookById, session completion/progress handlers and mutation handlers).
 **/
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
