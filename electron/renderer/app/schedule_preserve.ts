import { dayKeyFromDate, localDayKeyFromIso } from "./date_keys.js";
import { isOnOrBeforeDay, isValidDayKey } from "./day_keys_compare.js";
import type { PlannerScheduleRow, Session } from "../../types/types.js";

const SESSION_INDEX_PAD = 3;

/**
 * Builds a sortable key for stable schedule ordering by day and session index.
 * @param row Planner schedule row.
 * @returns Lexicographic key used for deterministic row sorting.
 */
function rowSortKey(row: PlannerScheduleRow): string {
  const session = String(row.session_index || 0).padStart(
    SESSION_INDEX_PAD,
    "0",
  );
  return `${String(row.date || "")}-${session}`;
}

/**
 * Returns schedule rows sorted by day and session index.
 * @param rows Unsanitized schedule rows.
 * @returns New sorted row array.
 */
function sortedRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

/**
 * Computes days that should remain fixed when regenerating schedules.
 * A day is locked when it already exists in the prior plan and is today/past,
 * or when an ended session occurred on that day.
 * @param previousRows Previously planned rows.
 * @param sessions Recorded reading sessions.
 * @returns Set of locked day keys.
 */
function lockedDates(
  previousRows: PlannerScheduleRow[] = [],
  sessions: Session[] = [],
): Set<string> {
  const locked = new Set<string>();
  const previousDates = new Set<string>();
  const todayKey = dayKeyFromDate(new Date());

  previousRows.forEach((row) => {
    const rowDate = String(row.date || "");
    if (!isValidDayKey(rowDate)) {
      return;
    }
    previousDates.add(rowDate);
    if (isOnOrBeforeDay(rowDate, todayKey)) {
      locked.add(rowDate);
    }
  });

  sessions.forEach((session) => {
    const endedAt = String(session.ended_at || "");
    const key = localDayKeyFromIso(endedAt);
    if (!isValidDayKey(key || "")) {
      return;
    }
    if (previousDates.has(key) && isOnOrBeforeDay(key, todayKey)) {
      locked.add(key);
    }
  });

  return locked;
}

/**
 * Builds a completion key scoped to exact schedule row identity.
 * @param row Planner schedule row.
 * @returns Key combining date, session index, and book id.
 */
function scheduleKey(row: PlannerScheduleRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Builds a completion key scoped to day and book only.
 * @param row Planner schedule row.
 * @returns Key combining date and book id.
 */
function dayBookCompletionKey(row: PlannerScheduleRow): string {
  return `${row.date}|${row.book_id}`;
}

/**
 * Removes rows whose day-book key has been manually blocked by the user.
 * @param rows Candidate schedule rows.
 * @param blockedDayBooks Block map keyed by `YYYY-MM-DD|book_id`.
 * @returns Rows that are still allowed for scheduling.
 */
function rowsWithoutBlockedDayBooks(
  rows: PlannerScheduleRow[],
  blockedDayBooks: Record<string, boolean>,
): PlannerScheduleRow[] {
  return rows.filter((row) => {
    const key = dayBookCompletionKey(row);
    return !blockedDayBooks[key];
  });
}

/**
 * Merges new plan rows with locked rows from the previous plan.
 * Locked days are preserved from `previousRows`; other days come from `nextRows`.
 * @param previousRows Previous schedule rows.
 * @param nextRows Newly generated schedule rows.
 * @param sessions Recorded reading sessions used to infer locked days.
 * @param blockedDayBooks Manually blocked day-book keys to exclude from replans.
 * @returns Sorted merged schedule rows with duplicate keys removed.
 */
export function mergeScheduleRows(
  previousRows: PlannerScheduleRow[] = [],
  nextRows: PlannerScheduleRow[] = [],
  sessions: Session[] = [],
  blockedDayBooks: Record<string, boolean> = {},
): PlannerScheduleRow[] {
  const filteredNextRows = rowsWithoutBlockedDayBooks(nextRows, blockedDayBooks);
  const locked = lockedDates(previousRows, sessions);
  if (!locked.size) {
    return sortedRows(filteredNextRows);
  }

  const keptRows = previousRows.filter((row) => {
    return locked.has(String(row.date || ""));
  });
  const newRows = filteredNextRows.filter((row) => {
    return !locked.has(String(row.date || ""));
  });

  const mergedByKey = new Map<string, PlannerScheduleRow>();
  [...keptRows, ...newRows].forEach((row) => {
    mergedByKey.set(scheduleKey(row), row);
  });
  return sortedRows([...mergedByKey.values()]);
}

/**
 * Removes completion entries that no longer map to rows in the current schedule.
 * Supports both full session keys and day-book aggregate keys.
 * @param scheduleCompletions Existing completion map.
 * @param rows Current schedule rows.
 * @returns Pruned completion map containing only valid keys.
 */
export function pruneScheduleCompletions(
  scheduleCompletions: Record<string, boolean> = {},
  rows: PlannerScheduleRow[] = [],
): Record<string, boolean> {
  const allowedSessionKeys = new Set(rows.map((row) => scheduleKey(row)));
  const allowedDayBookKeys = new Set(
    rows.map((row) => dayBookCompletionKey(row)),
  );
  const out: Record<string, boolean> = {};
  Object.entries(scheduleCompletions).forEach(([key, value]) => {
    if (!allowedSessionKeys.has(key) && !allowedDayBookKeys.has(key)) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
}
