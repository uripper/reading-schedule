import type {
  TodayBookSummary,
  TodayScheduleSnapshot,
} from "./today_schedule.js";

const SINGULAR_SESSION_COUNT = 1;
const SINGULAR_MINUTE_COUNT = 1;

/**
 *
 * @param count
 */
function sessionLabel(count: number): string {
  if (count === SINGULAR_SESSION_COUNT) {
    return "session";
  }
  return "sessions";
}

/**
 *
 * @param count
 */
function minuteLabel(count: number): string {
  if (count === SINGULAR_MINUTE_COUNT) {
    return "minute";
  }
  return "minutes";
}

/**
 *
 * @param snapshot
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
 *
 * @param summary
 */
export function perBookSessionText(summary: TodayBookSummary): string {
  const label = sessionLabel(summary.scheduledSessions);
  return `${summary.completedSessions} / ${summary.scheduledSessions} ${label} complete`;
}

/**
 *
 * @param summary
 */
export function plannedMinutesText(summary: TodayBookSummary): string {
  const label = minuteLabel(summary.plannedMinutes);
  return `${summary.plannedMinutes} ${label} planned`;
}

/**
 *
 * @param title
 */
export function coverFallbackText(title: string): string {
  const trimmed = String(title || "").trim();
  if (!trimmed) {
    return "No Cover";
  }
  return trimmed.slice(0, SINGULAR_SESSION_COUNT).toUpperCase();
}
