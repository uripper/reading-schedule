const SESSION_INDEX_PAD = 3;

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowSortKey(row: { session_index: any; date: any; }) {
  const sessionIndex = String(row?.session_index || 0).padStart(SESSION_INDEX_PAD, "0");
  return `${String(row?.date || "")}-${sessionIndex}`;
}

function bookBaselineWords(book: { progress_percent: any; }, totalWords: number) {
  const progressPercent = Number(book?.progress_percent || 0);
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return Math.round((clamped / 100) * totalWords);
}

function projectedWordsForRow(row: any, state: { rows: any[]; }, bookId: string, baselineWords: number, totalWords: number) {
  const today = todayDateKey();
  const targetSortKey = rowSortKey(row);
  let plannedWords = 0;
  let rows = [];
  if (Array.isArray(state?.rows)) {
    rows = state.rows;
  }
  rows.forEach((candidate: { book_id: any; date: any; words_planned: any; }) => {
    if (String(candidate?.book_id || "") !== bookId) {
      return;
    }
    const date = String(candidate?.date || "");
    if (!date || date < today) {
      return;
    }
    if (rowSortKey(candidate) > targetSortKey) {
      return;
    }
    plannedWords += Number(candidate?.words_planned || 0);
  });
  return Math.min(totalWords, baselineWords + plannedWords);
}

function projectedPages(projectedWords: number, totalWords: number, pagesTotal: number) {
  if (totalWords <= 0 || pagesTotal <= 0) {
    return null;
  }
  return Math.round((projectedWords / totalWords) * pagesTotal);
}

export function estimateProgressLabel(row: { book_id: any; }, state: { totalsByBookId: { [x: string]: any; }; }, getBookById: (arg0: string) => {}) {
  const bookId = String(row?.book_id || "");
  if (!bookId) {
    return "No estimate available";
  }
  const totalWords = Number(state?.totalsByBookId?.[bookId] || 0);
  if (totalWords <= 0) {
    return "No estimate available";
  }

  const book = getBookById(bookId) || {};
  const baselineWords = bookBaselineWords(book, totalWords);
  const projectedWords = projectedWordsForRow(row, state, bookId, baselineWords, totalWords);
  const projectedPercent = Math.round((projectedWords / totalWords) * 1000) / 10;
  const pagesTotal = Number(book?.pages_total || 0);
  const pages = projectedPages(projectedWords, totalWords, pagesTotal);
  if (pages !== null) {
    return `Estimated by this session: ${pages} pages read (${projectedPercent}% complete)`;
  }
  return `Estimated by this session: ${projectedPercent}% complete`;
}
