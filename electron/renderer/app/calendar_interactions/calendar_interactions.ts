import type {
	AppCalendarInteractionArgs,
	CalendarInteractionHandlers,
	CompletionRow,
	CompletionUpdate,
	ProgressUpdateInput,
} from "../../../types/types.js";
import { sessionKeyFor } from "../../calendar/utils.js";
import {
	dayBookCompletionKey,
	dayBookCompletionKeyFromSession,
	manualSessionBooks,
} from "./calendar_interactions_helpers.js";
import { buildScheduleMutationHandlers } from "./calendar_interactions_schedule_handlers.js";

const completionFallbackKey = (row: CompletionRow | undefined): string => {
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

const setCompletionState = (
	completionStateInput: Record<string, boolean>,
	sessionKey: string,
	fallbackKey: string,
	completed: boolean,
): void => {
	const completionState = completionStateInput;
	if (completed) {
		completionState[sessionKey] = true;
		if (fallbackKey !== "") {
			completionState[fallbackKey] = true;
		}
		return;
	}
	delete completionState[sessionKey];
	if (fallbackKey !== "") {
		delete completionState[fallbackKey];
	}
};

const completionStatusMessage = (
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

const isCompleted = (
	completionState: Record<string, boolean>,
	sessionKey: string,
): boolean => {
	if (completionState[sessionKey]) {
		return true;
	}
	const fallbackKey = dayBookCompletionKeyFromSession(sessionKey);
	if (fallbackKey === "") {
		return false;
	}
	return completionState[fallbackKey];
};

const handleCompletionChanged = (
	args: AppCalendarInteractionArgs,
	payload: CompletionUpdate,
): void => {
	const completionState = { ...args.state.scheduleCompletions };
	const fallbackKey = completionFallbackKey(payload.row);
	setCompletionState(
		completionState,
		payload.sessionKey,
		fallbackKey,
		payload.completed,
	);
	args.applyStateMutation({
		type: "set_schedule_completions",
		scheduleCompletions: completionState,
	});
	args.queuePersist();
	const statusMessage = completionStatusMessage(payload.row, payload.completed);
	if (statusMessage !== "") {
		args.setStatus(statusMessage);
	}
	if (args.onSessionCompletionUpdated !== undefined) {
		args.onSessionCompletionUpdated(payload);
	}
};

const handleProgressUpdated = (
	args: AppCalendarInteractionArgs,
	payload: ProgressUpdateInput,
): ReturnType<AppCalendarInteractionArgs["updateBookProgress"]> => {
	const updatedBook = args.updateBookProgress(
		payload.bookId,
		{ pagesRead: payload.pagesRead, progressPercent: payload.progressPercent },
		{ notifyBooksChanged: false },
	);
	if (updatedBook === null) {
		args.setStatus("Could not find that book to update progress.", true);
		return null;
	}
	if (payload.row !== undefined) {
		const completionState = { ...args.state.scheduleCompletions };
		completionState[sessionKeyFor(payload.row)] = true;
		completionState[
			dayBookCompletionKey(payload.row.date, payload.row.book_id)
		] = true;
		args.applyStateMutation({
			type: "set_schedule_completions",
			scheduleCompletions: completionState,
		});
	}
	if (updatedBook.title === "") {
		args.setStatus("Updated progress for book.");
	} else {
		args.setStatus(`Updated progress for ${updatedBook.title}.`);
	}
	args.queuePersist();
	if (args.onProgressUpdated !== undefined) {
		args.onProgressUpdated(updatedBook);
	}
	return updatedBook;
};

const buildCalendarHandlers = (
	args: AppCalendarInteractionArgs,
): CalendarInteractionHandlers => {
	const scheduleMutationHandlers = buildScheduleMutationHandlers(args);
	return {
		isSessionCompleted: (sessionKey) =>
			isCompleted(args.state.scheduleCompletions, sessionKey),
		onSessionCompletionChanged: (payload) => {
			handleCompletionChanged(args, payload);
		},
		onSessionProgressUpdated: (payload) => handleProgressUpdated(args, payload),
		getBookById: (bookId) => args.getBookById(bookId),
		listSessionBooks: () => manualSessionBooks(args.collectAllBooks()),
		...scheduleMutationHandlers,
	};
};

export const configureAppCalendarInteractions = (
	args: AppCalendarInteractionArgs,
): void => {
	args.configureCalendarInteractions(buildCalendarHandlers(args));
};
