import { el } from '../dom.js';
import { dayMinutesForKey, dayMinutesFromActivity, streakFromDayMinutes } from '../activity/day_minutes.js';
import type { Book } from '../books/types.js';
import type { FeatureFlags, Preferences } from './experience.js';
import { renderTodayScheduledBooks } from './today_books_view.js';
import { buildTodayScheduleSnapshot, nextUncompletedPlannedRow, type TodayScheduleSnapshot } from './today_schedule.js';
import type { PlannerResult } from './types.js';
import type { Session } from '../sessions/normalize.js';
import { todayKey } from '../sessions/utils.js';

const MIN_GOAL_MINUTES = 1;
const MAX_PERCENT = 100;
const NO_SCHEDULE_TEXT = 'No schedule yet. Add or update books and settings to auto-build your plan.';
const TODAY_DONE_TEXT = 'All planned sessions for today are complete.';
const NO_INCOMPLETE_TEXT = 'No incomplete planned sessions ahead. Update books or settings to refresh your plan.';

function hasPlannedRows(lastResult: PlannerResult | null): boolean {
  if (!Array.isArray(lastResult?.schedule)) {
    return false;
  }
  return lastResult.schedule.length > 0;
}

function summaryText(
  lastResult: PlannerResult | null,
  snapshot: TodayScheduleSnapshot,
  next: ReturnType<typeof nextUncompletedPlannedRow>,
): string {
  if (next) {
    return `Next planned session: ${next.title} for ${next.minutes} minutes on ${next.date}.`;
  }
  if (hasPlannedRows(lastResult)) {
    if (snapshot.scheduledSessions && snapshot.completedSessions >= snapshot.scheduledSessions) {
      return TODAY_DONE_TEXT;
    }
    return NO_INCOMPLETE_TEXT;
  }
  return NO_SCHEDULE_TEXT;
}

type UpdateTodayDashboardArgs = {
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  books: Book[];
  sessions: Session[];
  preferences: Preferences;
  featureFlags: FeatureFlags;
  defaultDailyGoalMinutes: number;
};

export function updateTodayDashboard({
  lastResult,
  scheduleCompletions,
  books,
  sessions,
  preferences,
  featureFlags,
  defaultDailyGoalMinutes,
}: UpdateTodayDashboardArgs): void {
  const summaryNode = el('todaySummary');
  const goalText = el('todayGoalText');
  const goalProgress = el('todayGoalProgress');
  const goalBar = el('todayGoalBar');
  const gamificationCard = el('gamificationCard');
  const streakNode = el('streakText');

  const snapshot = buildTodayScheduleSnapshot(lastResult, scheduleCompletions, books);
  const next = snapshot.nextUncompletedRow;
  summaryNode.textContent = summaryText(lastResult, snapshot, next);
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
  const pct = Math.min(MAX_PERCENT, Math.round((todayMinutes / goalMinutes) * MAX_PERCENT));
  goalText.textContent = `${todayMinutes} / ${goalMinutes} minutes logged today`;
  goalProgress.setAttribute('aria-valuenow', String(pct));
  goalBar.style.width = `${pct}%`;

  const gamificationOn = Boolean(featureFlags.gamificationEnabled);
  gamificationCard.hidden = !gamificationOn;
  if (gamificationOn) {
    const streak = streakFromDayMinutes(activityByDay, goalMinutes);
    streakNode.textContent = `${streak} day streak`;
  }
}
