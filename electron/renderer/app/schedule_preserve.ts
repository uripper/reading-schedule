import type { Session } from '../sessions/normalize.js';
import type { PlannerScheduleRow } from './types.js';

const SESSION_INDEX_PAD = 3;

function dayKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localDayKeyFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return dayKeyFromDate(date);
}

function rowSortKey(row: PlannerScheduleRow): string {
  const session = String(row.session_index || 0).padStart(SESSION_INDEX_PAD, '0');
  return `${String(row.date || '')}-${session}`;
}

function sortedRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
  return [...rows].sort((left, right) => {
    return rowSortKey(left).localeCompare(rowSortKey(right));
  });
}

function lockedDates(previousRows: PlannerScheduleRow[] = [], sessions: Session[] = []): Set<string> {
  const locked = new Set<string>();
  const previousDates = new Set<string>();
  const todayKey = dayKeyFromDate(new Date());

  previousRows.forEach((row) => {
    const rowDate = String(row.date || '');
    if (!rowDate) {
      return;
    }
    previousDates.add(rowDate);
    if (rowDate <= todayKey) {
      locked.add(rowDate);
    }
  });

  sessions.forEach((session) => {
    const endedAt = String(session.ended_at || '');
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

function scheduleKey(row: PlannerScheduleRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

function dayBookCompletionKey(row: PlannerScheduleRow): string {
  return `${row.date}|${row.book_id}`;
}

export function mergeScheduleRows(
  previousRows: PlannerScheduleRow[] = [],
  nextRows: PlannerScheduleRow[] = [],
  sessions: Session[] = [],
): PlannerScheduleRow[] {
  const locked = lockedDates(previousRows, sessions);
  if (!locked.size) {
    return sortedRows(nextRows);
  }

  const keptRows = previousRows.filter((row) => {
    return locked.has(String(row.date || ''));
  });
  const newRows = nextRows.filter((row) => {
    return !locked.has(String(row.date || ''));
  });

  const mergedByKey = new Map<string, PlannerScheduleRow>();
  [...keptRows, ...newRows].forEach((row) => {
    mergedByKey.set(scheduleKey(row), row);
  });
  return sortedRows([...mergedByKey.values()]);
}

export function pruneScheduleCompletions(
  scheduleCompletions: Record<string, boolean> = {},
  rows: PlannerScheduleRow[] = [],
): Record<string, boolean> {
  const allowedSessionKeys = new Set(rows.map((row) => scheduleKey(row)));
  const allowedDayBookKeys = new Set(rows.map((row) => dayBookCompletionKey(row)));
  const out: Record<string, boolean> = {};
  Object.entries(scheduleCompletions).forEach(([key, value]) => {
    if (!allowedSessionKeys.has(key) && !allowedDayBookKeys.has(key)) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
}
