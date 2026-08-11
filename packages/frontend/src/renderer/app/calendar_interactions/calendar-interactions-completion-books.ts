import type {
    AppCalendarInteractionArgs,
    CompletionUpdate,
} from "../../../types/types.ts";

function rowText(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value;
}

function notifyProgressUpdated(
    args: AppCalendarInteractionArgs,
    updated: ReturnType<AppCalendarInteractionArgs["updateBookProgress"]>,
): void {
    if (updated === null || args.onProgressUpdated === undefined) {
        return;
    }
    args.onProgressUpdated(updated);
}

export function markBookStartedForCompletedRow(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    if (!payload.completed) {
        return;
    }
    const BOOK_ID = rowText(payload.row?.book_id);
    if (BOOK_ID === "") {
        return;
    }
    const UPDATED = args.updateBookProgress(
        BOOK_ID,
        {},
        {
            markStarted: true,
            notifyBooksChanged: false,
        },
    );
    notifyProgressUpdated(args, UPDATED);
}
