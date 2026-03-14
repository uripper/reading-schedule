import type {
    AddManualSessionArgs,
    Book,
    PlannerScheduleRow,
    PlannerSettings,
} from "../../../types/types.ts";
import { emptyPlannerResult } from "./calendar_interactions_helpers.ts";
import {
    normalizedManualMinutes,
    wordsPlannedForManualSession,
} from "./calendar_interactions_manual_helpers.ts";
import { nextSessionIndexForDate } from "./calendar_interactions_row_helpers.ts";
import {
    applyNextResult,
    finishScheduleUpdate,
    markSessionCompleted,
    nextResultWithRows,
    setBlockedDayBook,
} from "./calendar-interactions-schedule-update-helpers.ts";

type ManualSessionDateOptions = Pick<
    AddManualSessionArgs,
    "date" | "setStatus"
>;
type ManualSessionBookOptions = Pick<
    AddManualSessionArgs,
    "bookId" | "getBookById" | "setStatus"
>;
type ManualSessionValidationOptions = ManualSessionDateOptions &
    ManualSessionBookOptions;
type ManualSessionRowBase = Omit<PlannerScheduleRow, "words_planned">;

interface ManualSessionValidation {
    book: Book;
    normalizedDate: string;
}

interface BuildRowArgs {
    book: Book;
    collectSettings: () => PlannerSettings;
    minutes: number;
    normalizedDate: string;
    previousRows: PlannerScheduleRow[];
}

export interface ManualSessionAddResult {
    nextResult: ReturnType<typeof nextResultWithRows>;
    normalizedDate: string;
    row: PlannerScheduleRow;
}

function invalidManualSession(
    options: Pick<AddManualSessionArgs, "setStatus">,
    message: string,
): null {
    options.setStatus(message, true);
    return null;
}

function normalizedManualSessionDate(
    options: ManualSessionDateOptions,
): string | null {
    const NORMALIZED_DATE = String(options.date).trim();
    if (NORMALIZED_DATE) {
        return NORMALIZED_DATE;
    }
    return invalidManualSession(
        options,
        "Choose a calendar day before adding a session.",
    );
}

function manualSessionBook(options: ManualSessionBookOptions): Book | null {
    const BOOK = options.getBookById(options.bookId);
    if (BOOK) {
        return BOOK;
    }
    return invalidManualSession(options, "Could not find that book.");
}

function validateManualSessionInput(
    options: ManualSessionValidationOptions,
): ManualSessionValidation | null {
    const NORMALIZED_DATE = normalizedManualSessionDate(options);
    const BOOK = manualSessionBook(options);
    if (NORMALIZED_DATE === null || BOOK === null) {
        return null;
    }
    return { book: BOOK, normalizedDate: NORMALIZED_DATE };
}

function manualSessionWordsArgs(args: BuildRowArgs, minutes: number) {
    return {
        bookId: args.book.book_id,
        difficulty: Number(args.book.difficulty),
        minutes,
        rows: args.previousRows,
        settings: args.collectSettings(),
    };
}

function manualSessionWordsPlanned(
    args: BuildRowArgs,
    minutes: number,
): number {
    return wordsPlannedForManualSession(manualSessionWordsArgs(args, minutes));
}

function manualSessionRowBase(
    args: BuildRowArgs,
    minutes: number,
): ManualSessionRowBase {
    return {
        book_id: args.book.book_id,
        date: args.normalizedDate,
        minutes,
        session_index: nextSessionIndexForDate(
            args.normalizedDate,
            args.previousRows,
        ),
        title: args.book.title,
    };
}

function buildManualSessionRow(args: BuildRowArgs): PlannerScheduleRow {
    const NORMALIZED_MINUTES = normalizedManualMinutes(args.minutes);
    return {
        ...manualSessionRowBase(args, NORMALIZED_MINUTES),
        words_planned: manualSessionWordsPlanned(args, NORMALIZED_MINUTES),
    };
}

function manualSessionRowArgs(
    options: AddManualSessionArgs,
    validated: ManualSessionValidation,
    previousRows: PlannerScheduleRow[],
): BuildRowArgs {
    return {
        book: validated.book,
        collectSettings: options.collectSettings,
        minutes: options.minutes,
        normalizedDate: validated.normalizedDate,
        previousRows,
    };
}

function manualSessionAddOutcome(
    previousResult: ReturnType<typeof emptyPlannerResult>,
    validated: ManualSessionValidation,
    row: PlannerScheduleRow,
): ManualSessionAddResult {
    return {
        nextResult: nextResultWithRows(previousResult, [
            ...previousResult.schedule,
            row,
        ]),
        normalizedDate: validated.normalizedDate,
        row,
    };
}

function manualSessionAddResult(
    options: AddManualSessionArgs,
    validated: ManualSessionValidation,
): ManualSessionAddResult {
    const PREVIOUS_RESULT = options.state.lastResult ?? emptyPlannerResult();
    const ROW = buildManualSessionRow(
        manualSessionRowArgs(options, validated, PREVIOUS_RESULT.schedule),
    );
    return manualSessionAddOutcome(PREVIOUS_RESULT, validated, ROW);
}

function applyManualSessionCompletion(
    options: AddManualSessionArgs,
    row: PlannerScheduleRow,
): void {
    if (!options.completed) {
        return;
    }
    markSessionCompleted(
        row,
        options.state.scheduleCompletions,
        options.applyStateMutation,
    );
}

function addedManualSessionMessage(result: ManualSessionAddResult): string {
    return `Added ${result.row.minutes} minute session for "${result.row.title}" on ${result.normalizedDate}.`;
}

export function prepareManualSessionAdd(
    options: AddManualSessionArgs,
): ManualSessionAddResult | null {
    const VALIDATED = validateManualSessionInput(options);
    if (VALIDATED === null) {
        return null;
    }
    return manualSessionAddResult(options, VALIDATED);
}

export function finalizeManualSessionAdd(
    options: AddManualSessionArgs,
    result: ManualSessionAddResult,
): void {
    applyNextResult(options, result.nextResult);
    setBlockedDayBook(options.applyStateMutation, result.row, false);
    applyManualSessionCompletion(options, result.row);
    finishScheduleUpdate(options, addedManualSessionMessage(result));
}
