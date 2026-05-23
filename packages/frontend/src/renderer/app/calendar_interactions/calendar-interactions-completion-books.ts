import type {
    AppCalendarInteractionArgs,
    CompletionRow,
    CompletionUpdate,
} from "../../../types/types.ts";

function rowText(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }
    return value;
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

function notifyProgressUpdated(
    args: AppCalendarInteractionArgs,
    updated: ReturnType<AppCalendarInteractionArgs["updateBookProgress"]>,
): void {
    if (updated === null || args.onProgressUpdated === undefined) {
        return;
    }
    args.onProgressUpdated(updated);
}

export function markBookReadForFinishedRow(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    if (!(payload.completed && isProjectedFinishRow(payload.row))) {
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
    notifyProgressUpdated(args, UPDATED);
}

export function markBookStartedForCompletedRow(
    args: AppCalendarInteractionArgs,
    payload: CompletionUpdate,
): void {
    if (!payload.completed || isProjectedFinishRow(payload.row)) {
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
