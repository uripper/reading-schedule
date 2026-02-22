import type {
  CompletionChecker,
  EstimateRow,
  EstimateState,
} from "./estimates_snapshot.js";

const SESSION_INDEX_PAD = 3;

/**
 *
 */
function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 *
 * @param row
 */
function rowSortKey(row: Pick<EstimateRow, "date" | "session_index">): string {
  const sessionIndex = String(row.session_index).padStart(SESSION_INDEX_PAD, "0");
  return `${row.date}-${sessionIndex}`;
}

/**
 *
 * @param row
 */
function estimateSessionKey(row: EstimateRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 *
 * @param candidate
 * @param state
 * @param state.bookId
 * @param state.today
 * @param state.targetSortKey
 * @param state.targetIsFuture
 * @param state.isSessionCompleted
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
  if (String(candidate.book_id || "") !== state.bookId) {
    return null;
  }
  const date = String(candidate.date || "");
  if (!date || date < state.today) {
    return null;
  }
  const candidateSortKey = rowSortKey(candidate);
  if (candidateSortKey > state.targetSortKey) {
    return null;
  }
  if (
    state.targetIsFuture &&
    state.isSessionCompleted(estimateSessionKey(candidate))
  ) {
    return null;
  }
  return candidateSortKey;
}

/**
 *
 * @param row
 * @param state
 * @param bookId
 * @param isSessionCompleted
 */
export function plannedWordsBeforeAndThroughRow(
  row: EstimateRow,
  state: EstimateState,
  bookId: string,
  isSessionCompleted: CompletionChecker,
): { before: number; through: number } {
  const today = todayDateKey();
  const targetDate = String(row.date || "");
  const targetSessionKey = estimateSessionKey(row);
  if (targetDate === today && isSessionCompleted(targetSessionKey)) {
    return { before: 0, through: 0 };
  }

  const targetIsFuture = targetDate > today;
  const targetSortKey = rowSortKey(row);
  let before = 0;
  let through = 0;
  const rows: EstimateRow[] = [];
  if (Array.isArray(state.rows)) {
    rows.push(...state.rows);
  }
  const candidateState = {
    bookId,
    today,
    targetSortKey,
    targetIsFuture,
    isSessionCompleted,
  };

  rows.forEach((candidate) => {
    const candidateSortKey = eligibleSortKeyForCandidate(candidate, candidateState);
    if (candidateSortKey === null) {
      return;
    }
    const plannedWords = Math.max(0, Number(candidate.words_planned || 0));
    through += plannedWords;
    if (candidateSortKey < targetSortKey) {
      before += plannedWords;
    }
  });

  return { before, through };
}
