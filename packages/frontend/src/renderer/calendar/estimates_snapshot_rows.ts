import type {
    CompletionChecker,
    EstimateRow,
    EstimateState,
} from "../../types/types.ts";

import { todayDateKey } from "./selection.ts";

const SESSION_INDEX_PAD = 3;

type CandidateState = {
    bookId: string;
    today: string;
    targetSortKey: string;
    targetIsFuture: boolean;
    isSessionCompleted: CompletionChecker;
};

type PlannedWordsArgs = {
    row: EstimateRow;
    state: EstimateState;
    bookId: string;
    isSessionCompleted: CompletionChecker;
};

type PlannedWordTotals = {
    before: number;
    through: number;
};

/**
 * Builds sortable key from estimate row date and session index.
 * @param row - Estimate row.
 * @returns Lexicographically sortable key.
 */
function rowSortKey(row: Pick<EstimateRow, "date" | "session_index">): string {
    const SESSION_INDEX = String(row.session_index).padStart(
        SESSION_INDEX_PAD,
        "0",
    );
    return `${row.date}-${SESSION_INDEX}`;
}

/**
 * Builds stable session key for estimate completion checks.
 * @param row - Estimate row.
 * @returns Session key.
 */
function estimateSessionKey(row: EstimateRow): string {
    return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Checks whether a candidate belongs to the target book.
 * @param candidate - Candidate row.
 * @param bookId - Target book id.
 * @returns `true` when the candidate belongs to the same book.
 */
function candidateMatchesBook(candidate: EstimateRow, bookId: string): boolean {
    return String(candidate.book_id) === bookId;
}

/**
 * Checks whether a candidate should be skipped for a completed future target.
 * @param candidate - Candidate row.
 * @param state - Candidate-evaluation state.
 * @returns `true` when the candidate is already completed and excluded.
 */
function isCompletedFutureCandidate(
    candidate: EstimateRow,
    state: CandidateState,
): boolean {
    if (!state.targetIsFuture) {
        return false;
    }
    return state.isSessionCompleted(estimateSessionKey(candidate));
}

/**
 * Returns normalized estimate rows from state.
 * @param state - Estimate state context.
 * @returns Array of estimate rows, or an empty array when unavailable.
 */
function estimateRows(state: EstimateState): EstimateRow[] {
    if (!Array.isArray(state.rows)) {
        return [];
    }
    return state.rows;
}

/**
 * Returns planned words contributed by one candidate row.
 * @param candidate - Candidate row.
 * @returns Non-negative planned words.
 */
function plannedWordsForCandidate(candidate: EstimateRow): number {
    return Math.max(0, Number(candidate.words_planned ?? 0));
}

/**
 * Adds candidate planned words into running totals.
 * @param args - Candidate accumulation inputs.
 */
function addCandidateWords(args: {
    totals: PlannedWordTotals;
    candidateSortKey: string;
    targetSortKey: string;
    plannedWords: number;
}): void {
    const TOTALS = args.totals;
    TOTALS.through += args.plannedWords;
    if (args.candidateSortKey < args.targetSortKey) {
        TOTALS.before += args.plannedWords;
    }
}

/**
 * Checks whether the target row is already completed today.
 * @param row - Target estimate row.
 * @param today - Today's day key.
 * @param isSessionCompleted - Completion checker.
 * @returns `true` when the target should contribute no planned words.
 */
function isCompletedTodayTarget(
    row: EstimateRow,
    today: string,
    isSessionCompleted: CompletionChecker,
): boolean {
    if (String(row.date) !== today) {
        return false;
    }
    return isSessionCompleted(estimateSessionKey(row));
}

/**
 * Builds evaluation state for planned-word accumulation.
 * @param args - Planned-word inputs for the target row.
 * @param today - Today's day key.
 * @returns Candidate-evaluation state.
 */
function candidateState(args: PlannedWordsArgs, today: string): CandidateState {
    const TARGET_DATE = String(args.row.date);
    return {
        bookId: args.bookId,
        isSessionCompleted: args.isSessionCompleted,
        targetIsFuture: TARGET_DATE > today,
        targetSortKey: rowSortKey(args.row),
        today,
    };
}

/**
 * Checks whether a candidate row date is eligible for accumulation.
 * @param candidate - Candidate row.
 * @param today - Today's day key.
 * @returns `true` when the row date should be considered.
 */
function hasEligibleCandidateDate(
    candidate: EstimateRow,
    today: string,
): boolean {
    const DATE = String(candidate.date);
    return DATE !== "" && DATE >= today;
}

/**
 * Returns candidate sort key when row should contribute to estimate totals.
 * @param candidate - Candidate row.
 * @param state - Candidate-evaluation state.
 * @param state.bookId - Target book id.
 * @param state.today - Today's day key.
 * @param state.targetSortKey - Target row sort key.
 * @param state.targetIsFuture - Whether target row is in future.
 * @param state.isSessionCompleted - Completion checker.
 * @returns Candidate sort key when eligible; otherwise `null`.
 */
function eligibleSortKeyForCandidate(
    candidate: EstimateRow,
    state: CandidateState,
): string | null {
    if (!candidateMatchesBook(candidate, state.bookId)) {
        return null;
    }
    if (!hasEligibleCandidateDate(candidate, state.today)) {
        return null;
    }
    const CANDIDATE_SORT_KEY = rowSortKey(candidate);
    if (CANDIDATE_SORT_KEY > state.targetSortKey) {
        return null;
    }
    if (isCompletedFutureCandidate(candidate, state)) {
        return null;
    }
    return CANDIDATE_SORT_KEY;
}

/**
 * Accumulates planned words across eligible rows for a target state.
 * @param rows - Estimate rows to evaluate.
 * @param state - Candidate-evaluation state.
 * @returns Planned words before target row and through target row.
 */
function plannedWordTotals(
    rows: EstimateRow[],
    state: CandidateState,
): PlannedWordTotals {
    const TOTALS = { before: 0, through: 0 };
    for (const CANDIDATE of rows) {
        const CANDIDATE_SORT_KEY = eligibleSortKeyForCandidate(
            CANDIDATE,
            state,
        );
        if (CANDIDATE_SORT_KEY === null) {
            continue;
        }
        addCandidateWords({
            candidateSortKey: CANDIDATE_SORT_KEY,
            plannedWords: plannedWordsForCandidate(CANDIDATE),
            targetSortKey: state.targetSortKey,
            totals: TOTALS,
        });
    }
    return TOTALS;
}

/**
 * Computes planned words before and through target estimate row.
 * @param args - Planned-word inputs for the target row.
 * @returns Planned words before target row and through target row.
 */
export function plannedWordsBeforeAndThroughRow(
    args: PlannedWordsArgs,
): PlannedWordTotals {
    const TODAY = todayDateKey();
    if (isCompletedTodayTarget(args.row, TODAY, args.isSessionCompleted)) {
        return { before: 0, through: 0 };
    }
    return plannedWordTotals(
        estimateRows(args.state),
        candidateState(args, TODAY),
    );
}
