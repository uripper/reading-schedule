import type {
  TodayBookSummary,
  TodayScheduleSnapshot,
} from "../../../types/types.js";

const SINGULAR_SESSION_COUNT = 1;
const SINGULAR_MINUTE_COUNT = 1;

/**
 * Chooses the singular/plural label for session counts.
 * @param count Session count value.
 * @returns `"session"` for 1, otherwise `"sessions"`.
 */
function sessionLabel(count: number): string {
  if (count === SINGULAR_SESSION_COUNT) {
    return "session";
  }
  return "sessions";
}

/**
 * Chooses the singular/plural label for minute counts.
 * @param count Minute count value.
 * @returns `"minute"` for 1, otherwise `"minutes"`.
 */
function minuteLabel(count: number): string {
  if (count === SINGULAR_MINUTE_COUNT) {
    return "minute";
  }
  return "minutes";
}

/**
 * Builds the summary sentence shown above the today's-books list.
 * @param snapshot Today schedule snapshot used for count text.
 * @returns Human-readable completion progress text.
 */
export function todaySessionCountsText(
  snapshot: TodayScheduleSnapshot,
): string {
  const scheduled = snapshot.scheduledSessions;
  if (!scheduled) {
    return "No sessions scheduled for today.";
  }
  const completed = snapshot.completedSessions;
  const label = sessionLabel(scheduled);
  return `${completed} / ${scheduled} ${label} complete today`;
}

/**
 * Builds per-book completion text for the today list.
 * @param summary Per-book today summary.
 * @returns Text like `1 / 3 sessions complete`.
 */
export function perBookSessionText(summary: TodayBookSummary): string {
  const label = sessionLabel(summary.scheduledSessions);
  return `${summary.completedSessions} / ${summary.scheduledSessions} ${label} complete`;
}

/**
 * Builds planned-minute text for one book in the today list.
 * @param summary Per-book today summary.
 * @returns Text like `25 minutes planned`.
 */
export function plannedMinutesText(summary: TodayBookSummary): string {
  const label = minuteLabel(summary.plannedMinutes);
  return `${summary.plannedMinutes} ${label} planned`;
}

/**
 * Creates fallback cover text from a book title.
 * @param title Book title source text.
 * @returns Uppercase first character, or `No Cover` when unavailable.
 */
export function coverFallbackText(title: string): string {
  const trimmed = String(title || "").trim();
  if (!trimmed) {
    return "No Cover";
  }
  return trimmed.slice(0, SINGULAR_SESSION_COUNT).toUpperCase();
}
