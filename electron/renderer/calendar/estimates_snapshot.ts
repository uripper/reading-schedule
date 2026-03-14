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
    const CURRENT_WORDS_READ = wordsReadFromBook(context.book, context.fullWords);
    const PAGES_TOTAL = Number(context.book?.pages_total ?? 0);
    const PLANNED_WORDS = plannedWordsBeforeAndThroughRow({
        bookId: context.bookId,
        isSessionCompleted: args.isSessionCompleted,
        row: args.row,
        state: args.state,
    });
    const START_WORDS = Math.min(
        context.fullWords,
        CURRENT_WORDS_READ + PLANNED_WORDS.before,
    );
    const END_WORDS = Math.min(
        context.fullWords,
        CURRENT_WORDS_READ + PLANNED_WORDS.through,
    );
    const START_PERCENT = percentFromWords(START_WORDS, context.fullWords);
    const END_PERCENT = percentFromWords(END_WORDS, context.fullWords);
    return {
        endPages: projectedPages(END_PERCENT, PAGES_TOTAL),
        endPercent: END_PERCENT,
        startPages: projectedPages(START_PERCENT, PAGES_TOTAL),
        startPercent: START_PERCENT,
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
