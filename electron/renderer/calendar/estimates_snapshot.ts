import {
    type BookGetter,
    type CompletionChecker,
    type EstimateRow,
    type EstimateSnapshot,
    type EstimateState,
} from "../../types/types.js";
import {
    fullWordsForBook,
    percentFromWords,
    projectedPages,
    wordsReadFromBook,
} from "./estimates_math.js";
import { plannedWordsBeforeAndThroughRow } from "./estimates_snapshot_rows.js";

/**
 * Builds estimate snapshot for target row using current progress and plan.
 * @param row Target estimate row.
 * @param state Estimate state context.
 * @param getBookById Book lookup function.
 * @param isSessionCompleted Completion checker.
 * @returns Estimate snapshot or `null` when estimate cannot be computed.
 */
export function estimateSnapshotForRow(
    row: EstimateRow,
    state: EstimateState,
    getBookById: BookGetter,
    isSessionCompleted: CompletionChecker,
): EstimateSnapshot | null {
    const BOOK_ID = String(row.book_id || "");
    if (!BOOK_ID) {
        return null;
    }
    const REMAINING_WORDS = Number(state.totalsByBookId?.[BOOK_ID] ?? 0);
    const BOOK = getBookById(BOOK_ID);
    const FULL_WORDS = fullWordsForBook(BOOK, REMAINING_WORDS);
    if (FULL_WORDS <= 0) {
        return null;
    }
    const PAGES_TOTAL = Number(BOOK?.pages_total ?? 0);
    const CURRENT_WORDS_READ = wordsReadFromBook(BOOK, FULL_WORDS);
    const PLANNED_WORDS = plannedWordsBeforeAndThroughRow(
        row,
        state,
        BOOK_ID,
        isSessionCompleted,
    );
    const START_WORDS = Math.min(
        FULL_WORDS,
        CURRENT_WORDS_READ + PLANNED_WORDS.before,
    );
    const END_WORDS = Math.min(
        FULL_WORDS,
        CURRENT_WORDS_READ + PLANNED_WORDS.through,
    );
    const START_PERCENT = percentFromWords(START_WORDS, FULL_WORDS);
    const END_PERCENT = percentFromWords(END_WORDS, FULL_WORDS);
    return {
        changedInSession: END_PERCENT > START_PERCENT,
        endPages: projectedPages(END_PERCENT, PAGES_TOTAL),
        endPercent: END_PERCENT,
        startPages: projectedPages(START_PERCENT, PAGES_TOTAL),
        startPercent: START_PERCENT,
    };
}
