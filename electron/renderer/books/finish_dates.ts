// @ts-nocheck
const SESSION_INDEX_PAD = 3;

function rowSortKey(row) {
  const index = String(row.session_index || 0).padStart(SESSION_INDEX_PAD, "0");
  return `${String(row.date || "")}-${index}`;
}

function sortRows(rows = []) {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

export function finishDatesByBookId(rows = []) {
  const out = {};
  sortRows(rows).forEach((row) => {
    const bookId = String(row?.book_id || "");
    const date = String(row?.date || "");
    if (!bookId || !date) {
      return;
    }
    out[bookId] = date;
  });
  return out;
}
