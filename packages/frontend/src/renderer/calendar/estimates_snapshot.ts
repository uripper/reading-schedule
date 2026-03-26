import type {
    BookGetter,
    CompletionChecker,
    EstimateRow,
    EstimateSnapshot,
    EstimateState,
} from "../../types/types.ts";
import {
    fullWordsForBook,
    percentFromWords,
    projectedPages,
    wordsReadFromBook,
} from "./estimates_math.ts";
import { plannedWordsBeforeAndThroughRow } from "./estimates_snapshot_rows.ts";

type EstimateSnapshotArgs = {
    row: EstimateRow;
    state: EstimateState;
    getBookById: BookGetter;
    isSessionCompleted: CompletionChecker;
};

type EstimateBookContext = {
    bookId: string;
    book: ReturnType<BookGetter>;
    fullWords: number;
};

type EstimatePercentages = {
    startPercent: number;
    endPercent: number;
    startPages: number | null;
    endPages: number | null;
};

type EstimateWordRange = {
    startWords: number;
    endWords: number;
};

type EstimateRangePercents = {
    startPercent: number;
    endPercent: number;
};

function estimateBookContext(
    args: EstimateSnapshotArgs,
): EstimateBookContext | null {
    const BOOK_ID = String(args.row.book_id || "");
    if (!BOOK_ID) {
        return null;
    }
    const REMAINING_WORDS = Number(args.state.totalsByBookId?.[BOOK_ID] ?? 0);
    const BOOK = args.getBookById(BOOK_ID);
    const FULL_WORDS = fullWordsForBook(BOOK, REMAINING_WORDS);
    if (FULL_WORDS <= 0) {
        return null;
    }
    return { book: BOOK, bookId: BOOK_ID, fullWords: FULL_WORDS };
}

function estimatePercentages(
    args: EstimateSnapshotArgs,
    context: EstimateBookContext,
): EstimatePercentages {
    const CURRENT_WORDS_READ = wordsReadFromBook(
        context.book,
        context.fullWords,
    );
    const PAGES_TOTAL = Number(context.book?.pages_total ?? 0);
    const WORD_RANGE = estimateWordRange(args, context, CURRENT_WORDS_READ);
    const PERCENTS = estimateRangePercents(WORD_RANGE, context.fullWords);
    return {
        endPages: projectedPages(PERCENTS.endPercent, PAGES_TOTAL),
        endPercent: PERCENTS.endPercent,
        startPages: projectedPages(PERCENTS.startPercent, PAGES_TOTAL),
        startPercent: PERCENTS.startPercent,
    };
}

function estimateRangePercents(
    wordRange: EstimateWordRange,
    fullWords: number,
): EstimateRangePercents {
    return {
        endPercent: percentFromWords(wordRange.endWords, fullWords),
        startPercent: percentFromWords(wordRange.startWords, fullWords),
    };
}

function plannedWordWindow(
    args: EstimateSnapshotArgs,
    context: EstimateBookContext,
) {
    return plannedWordsBeforeAndThroughRow({
        bookId: context.bookId,
        isSessionCompleted: args.isSessionCompleted,
        row: args.row,
        state: args.state,
    });
}

function estimateWordRange(
    args: EstimateSnapshotArgs,
    context: EstimateBookContext,
    currentWordsRead: number,
): EstimateWordRange {
    const PLANNED_WORDS = plannedWordWindow(args, context);
    return {
        endWords: Math.min(
            context.fullWords,
            currentWordsRead + PLANNED_WORDS.through,
        ),
        startWords: Math.min(
            context.fullWords,
            currentWordsRead + PLANNED_WORDS.before,
        ),
    };
}

/**
 * Builds estimate snapshot for target row using current progress and plan.
 * @param args - Snapshot inputs for the target row.
 * @returns Estimate snapshot or `null` when estimate cannot be computed.
 */
export function estimateSnapshotForRow(
    args: EstimateSnapshotArgs,
): EstimateSnapshot | null {
    const CONTEXT = estimateBookContext(args);
    if (CONTEXT === null) {
        return null;
    }
    const PERCENTAGES = estimatePercentages(args, CONTEXT);
    return {
        changedInSession: PERCENTAGES.endPercent > PERCENTAGES.startPercent,
        endPages: PERCENTAGES.endPages,
        endPercent: PERCENTAGES.endPercent,
        startPages: PERCENTAGES.startPages,
        startPercent: PERCENTAGES.startPercent,
    };
}
