import type {
    CompletionChecker,
    EstimateRow,
    EstimateState,
} from "../../types/types.ts";

import { todayDateKey } from "./selection.ts";

const SESSION_INDEX_PAD = 3;

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
    state: {
        bookId: string;
        today: string;
        targetSortKey: string;
        targetIsFuture: boolean;
        isSessionCompleted: CompletionChecker;
    },
): string | null {
    if (String(candidate.book_id) !== state.bookId) {
        return null;
    }
    const DATE = String(candidate.date);
    if (!DATE || DATE < state.today) {
        return null;
    }
    const CANDIDATE_SORT_KEY = rowSortKey(candidate);
    if (CANDIDATE_SORT_KEY > state.targetSortKey) {
        return null;
    }
    if (
        state.targetIsFuture &&
        state.isSessionCompleted(estimateSessionKey(candidate))
    ) {
        return null;
    }
    return CANDIDATE_SORT_KEY;
}

/**
 * Computes planned words before and through target estimate row.
 * @param row - Target estimate row.
 * @param state - Estimate state context.
 * @param bookId - Target book id.
 * @param isSessionCompleted - Completion checker.
 * @returns Planned words before target row and through target row.
 */
export function plannedWordsBeforeAndThroughRow(
    row: EstimateRow,
    state: EstimateState,
    bookId: string,
    isSessionCompleted: CompletionChecker,
): { before: number; through: number } {
    const TODAY = todayDateKey();
    const TARGET_DATE = String(row.date);
    const TARGET_SESSION_KEY = estimateSessionKey(row);
    if (TARGET_DATE === TODAY && isSessionCompleted(TARGET_SESSION_KEY)) {
        return { before: 0, through: 0 };
    }

    const TARGET_IS_FUTURE = TARGET_DATE > TODAY;
    const TARGET_SORT_KEY = rowSortKey(row);
    let before = 0;
    let through = 0;
    const ROWS: EstimateRow[] = [];
    if (Array.isArray(state.rows)) {
        ROWS.push(...state.rows);
    }
    const CANDIDATE_STATE = {
        bookId,
        isSessionCompleted,
        targetIsFuture: TARGET_IS_FUTURE,
        targetSortKey: TARGET_SORT_KEY,
        today: TODAY,
    };

    for (const CANDIDATE of ROWS) {
        const CANDIDATE_SORT_KEY = eligibleSortKeyForCandidate(
            CANDIDATE,
            CANDIDATE_STATE,
        );
        if (CANDIDATE_SORT_KEY === null) {
            continue;
        }
        const PLANNED_WORDS = Math.max(0, Number(CANDIDATE.words_planned ?? 0));
        through += PLANNED_WORDS;
        if (CANDIDATE_SORT_KEY < TARGET_SORT_KEY) {
            before += PLANNED_WORDS;
        }
    }

    return { before, through };
}
