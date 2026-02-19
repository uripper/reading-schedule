// @ts-nocheck
const SESSION_INDEX_PAD = 3;

function dayKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDayKeyFromIso(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return dayKeyFromDate(date);
}

function rowSortKey(row) {
  const session = String(row.session_index || 0).padStart(SESSION_INDEX_PAD, "0");
  return `${String(row.date || "")}-${session}`;
}

function sortedRows(rows = []) {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

function lockedDates(previousRows = [], sessions = []) {
  const locked = new Set();
  const previousDates = new Set();
  const todayKey = dayKeyFromDate(new Date());

  previousRows.forEach((row) => {
    const rowDate = String(row?.date || "");
    if (!rowDate) {
      return;
    }
    previousDates.add(rowDate);
    if (rowDate <= todayKey) {
      locked.add(rowDate);
    }
  });

  sessions.forEach((session) => {
    const endedAt = String(session?.ended_at || "");
    const key = localDayKeyFromIso(endedAt);
    if (!key) {
      return;
    }
    if (previousDates.has(key)) {
      locked.add(key);
    }
  });

  return locked;
}

function scheduleKey(row) {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

export function mergeScheduleRows(previousRows = [], nextRows = [], sessions = []) {
  const locked = lockedDates(previousRows, sessions);
  if (!locked.size) {
    return sortedRows(nextRows);
  }

  const keptRows = previousRows.filter((row) => {
    return locked.has(String(row?.date || ""));
  });
  const newRows = nextRows.filter((row) => {
    return !locked.has(String(row?.date || ""));
  });

  const mergedByKey = new Map();
  [...keptRows, ...newRows].forEach((row) => {
    mergedByKey.set(scheduleKey(row), row);
  });
  return sortedRows([...mergedByKey.values()]);
}

export function pruneScheduleCompletions(scheduleCompletions = {}, rows = []) {
  const allowed = new Set(rows.map((row) => scheduleKey(row)));
  const out = {};
  Object.entries(scheduleCompletions || {}).forEach(([key, value]) => {
    if (!allowed.has(key)) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
}
