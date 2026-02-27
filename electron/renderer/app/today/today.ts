import { el } from "../../dom.js";
import { dayMinutesForKey, dayMinutesFromActivity, streakFromDayMinutes } from "../../activity/day_minutes.js";

import { renderTodayScheduledBooks } from "./today_books_view.js";
import { buildTodayScheduleSnapshot, type TodayScheduleSnapshot } from "./today_schedule.js";
import type { PlannerResult, PlannerScheduleRow } from "../../../types/types.js";

import { todayKey } from "../../sessions/utils.js";
import type { UpdateTodayDashboardArgs } from "../../../types/app/today/today.js";

const MIN_GOAL_MINUTES = 1;
const MAX_PERCENT = 100;
const MIN_PERCENT = 0;
const NO_SCHEDULE_TEXT =
  "No schedule yet. Add or update books and settings to auto-build your plan.";
const TODAY_DONE_TEXT = "All planned sessions for today are complete.";
const NO_INCOMPLETE_TEXT =
  "No incomplete planned sessions ahead. Update books or settings to refresh your plan.";
const FOCUS_SESSION_UPDATE_EVENT = "today-focus-session-updated";

/**
 * Checks whether planner results contain any schedule rows.
 * @param lastResult Latest planner result.
 * @returns True when at least one planned row exists.
 */
function hasPlannedRows(lastResult: PlannerResult | null): boolean {
  if (!Array.isArray(lastResult?.schedule)) {
    return false;
  }
  return lastResult.schedule.length > 0;
}

/**
 * Builds the Today summary sentence shown above the schedule cards.
 * @param lastResult Latest planner result.
 * @param snapshot Computed today schedule snapshot.
 * @param next Next uncompleted planned row, if any.
 * @returns User-facing summary text.
 */
function summaryText(
  lastResult: PlannerResult | null,
  snapshot: TodayScheduleSnapshot,
  next: PlannerScheduleRow | null,
): string {
  if (next) {
    return `Next planned session: ${next.title} for ${next.minutes} minutes on ${next.date}.`;
  }
  if (hasPlannedRows(lastResult)) {
    if (
      snapshot.scheduledSessions &&
      snapshot.completedSessions >= snapshot.scheduledSessions
    ) {
      return TODAY_DONE_TEXT;
    }
    return NO_INCOMPLETE_TEXT;
  }
  return NO_SCHEDULE_TEXT;
}

/**
 * Mirrors next focus session fields into data attributes for focus-mode controls.
 * @param button Today focus entry button element.
 * @param nextRow Next uncompleted row for today/future schedule.
 */
function setFocusSessionDataset(
  button: HTMLButtonElement,
  nextRow: PlannerScheduleRow | null,
): void {
  const targetButton = button;
  if (!nextRow) {
    targetButton.dataset.focusSessionBookId = "";
    targetButton.dataset.focusSessionDate = "";
    targetButton.dataset.focusSessionIndex = "";
    targetButton.dataset.focusSessionMinutes = "";
    targetButton.dataset.focusSessionTitle = "";
    targetButton.dispatchEvent(new Event(FOCUS_SESSION_UPDATE_EVENT));
    return;
  }
  targetButton.dataset.focusSessionBookId = String(nextRow.book_id);
  targetButton.dataset.focusSessionDate = String(nextRow.date);
  targetButton.dataset.focusSessionIndex = String(nextRow.session_index);
  targetButton.dataset.focusSessionMinutes = String(nextRow.minutes);
  targetButton.dataset.focusSessionTitle = String(nextRow.title);
  targetButton.dispatchEvent(new Event(FOCUS_SESSION_UPDATE_EVENT));
}

/**
 * Computes bounded goal-completion percentage for today's minutes bar.
 * @param todayMinutesRaw Minutes logged today.
 * @param goalMinutesRaw Daily goal minutes.
 * @returns Integer percent between 0 and 100.
 */
export function goalProgressPercent(
  todayMinutesRaw: number,
  goalMinutesRaw: number,
): number {
  const goalMinutes = Math.max(
    MIN_GOAL_MINUTES,
    Number(goalMinutesRaw || MIN_GOAL_MINUTES),
  );
  const todayMinutes = Math.max(MIN_PERCENT, Number(todayMinutesRaw || MIN_PERCENT));
  const rawPercent = Math.round((todayMinutes / goalMinutes) * MAX_PERCENT);
  const bounded = Math.min(MAX_PERCENT, rawPercent);
  return Math.max(MIN_PERCENT, bounded);
}

/**
 * Re-renders Today dashboard content, progress, and focus-session metadata.
 * @param root0 Inputs used to render Today summary, books, and progress.
 * @param root0.lastResult Latest planner result.
 * @param root0.scheduleCompletions Completion map keyed by session/day-book keys.
 * @param root0.books Current book catalog.
 * @param root0.sessions Logged reading sessions.
 * @param root0.preferences Experience preferences.
 * @param root0.featureFlags Feature flag state.
 * @param root0.defaultDailyGoalMinutes Fallback goal minutes when preference is empty.
 */
export function updateTodayDashboard({
  lastResult,
  scheduleCompletions,
  books,
  sessions,
  preferences,
  featureFlags,
  defaultDailyGoalMinutes,
}: UpdateTodayDashboardArgs): void {
  const summaryNode = el("todaySummary");
  const goalText = el("todayGoalText");
  const goalProgress = el<HTMLProgressElement>("todayGoalProgress");
  const focusEntryButton = el<HTMLButtonElement>("startSessionFromTodayBtn");
  const gamificationCard = el("gamificationCard");
  const streakNode = el("streakText");

  const snapshot = buildTodayScheduleSnapshot(
    lastResult,
    scheduleCompletions,
    books,
  );
  const next = snapshot.nextUncompletedRow;
  summaryNode.textContent = summaryText(lastResult, snapshot, next);
  setFocusSessionDataset(focusEntryButton, next);
  renderTodayScheduledBooks(snapshot);

  const activityByDay = dayMinutesFromActivity({
    sessions,
    lastResult,
    scheduleCompletions,
    year: null,
  });

  const goalMinutes = Math.max(
    MIN_GOAL_MINUTES,
    Number(preferences.dailyGoalMinutes || defaultDailyGoalMinutes),
  );
  const todayMinutes = dayMinutesForKey(activityByDay, todayKey());
  const pct = goalProgressPercent(todayMinutes, goalMinutes);
  goalText.textContent = `${todayMinutes} / ${goalMinutes} minutes logged today`;
  goalProgress.value = pct;

  const gamificationOn = Boolean(featureFlags.gamificationEnabled);
  gamificationCard.hidden = !gamificationOn;
  if (gamificationOn) {
    const streak = streakFromDayMinutes(activityByDay, goalMinutes);
    streakNode.textContent = `${streak} day streak`;
  }
}
