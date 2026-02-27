import type {
  CompletionChecker,
  EstimateRow,
  EstimateState,
} from "./estimates_snapshot.js";

const SESSION_INDEX_PAD = 3;

/**
 * Returns today's local day key for estimate row filtering.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds sortable key from estimate row date and session index.
 * @param row Estimate row.
 * @returns Lexicographically sortable key.
 */
function rowSortKey(row: Pick<EstimateRow, "date" | "session_index">): string {
  const sessionIndex = String(row.session_index).padStart(SESSION_INDEX_PAD, "0");
  return `${row.date}-${sessionIndex}`;
}

/**
 * Builds stable session key for estimate completion checks.
 * @param row Estimate row.
 * @returns Session key.
 */
function estimateSessionKey(row: EstimateRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Returns candidate sort key when row should contribute to estimate totals.
 * @param candidate Candidate row.
 * @param state Candidate-evaluation state.
 * @param state.bookId Target book id.
 * @param state.today Today's day key.
 * @param state.targetSortKey Target row sort key.
 * @param state.targetIsFuture Whether target row is in future.
 * @param state.isSessionCompleted Completion checker.
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
  if (String(candidate.book_id ?? "") !== state.bookId) {
    return null;
  }
  const date = String(candidate.date ?? "");
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
 * Computes planned words before and through target estimate row.
 * @param row Target estimate row.
 * @param state Estimate state context.
 * @param bookId Target book id.
 * @param isSessionCompleted Completion checker.
 * @returns Planned words before target row and through target row.
 */
export function plannedWordsBeforeAndThroughRow(
  row: EstimateRow,
  state: EstimateState,
  bookId: string,
  isSessionCompleted: CompletionChecker,
): { before: number; through: number } {
  const today = todayDateKey();
  const targetDate = String(row.date ?? "");
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
    const plannedWords = Math.max(0, Number(candidate.words_planned ?? 0));
    through += plannedWords;
    if (candidateSortKey < targetSortKey) {
      before += plannedWords;
    }
  });

  return { before, through };
}
