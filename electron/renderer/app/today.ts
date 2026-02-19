import { firstPlannedRow } from '../calendar.js';
import { el } from '../dom.js';
import { todayKey } from '../sessions/utils.js';
import type { FeatureFlags, Preferences } from './experience.js';
import type { PlannerResult, PlannerScheduleRow } from './types.js';

const MIN_GOAL_MINUTES = 1;
const MAX_PERCENT = 100;

type SessionsUI = {
  todayMinutes: () => number;
  streakDays: () => number;
  selectBookById: (bookId: string) => void;
  startTimer: () => void;
};

function scheduleKey(row: PlannerScheduleRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

function completedPlannedMinutesForToday(
  lastResult: PlannerResult | null,
  scheduleCompletions: Record<string, boolean>,
): number {
  const today = todayKey();
  const rows = Array.isArray(lastResult?.schedule) ? lastResult.schedule : [];
  return rows.reduce((totalMinutes, row) => {
    if (String(row.date || '') !== today) {
      return totalMinutes;
    }
    if (!scheduleCompletions[scheduleKey(row)]) {
      return totalMinutes;
    }
    return totalMinutes + Number(row.minutes || 0);
  }, 0);
}

type UpdateTodayDashboardArgs = {
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  sessionsUI: SessionsUI | null;
  defaultDailyGoalMinutes: number;
};

export function updateTodayDashboard({
  lastResult,
  scheduleCompletions,
  preferences,
  featureFlags,
  sessionsUI,
  defaultDailyGoalMinutes,
}: UpdateTodayDashboardArgs): void {
  const summaryNode = el('todaySummary');
  const goalText = el('todayGoalText');
  const goalProgress = el('todayGoalProgress');
  const goalBar = el('todayGoalBar');
  const gamificationCard = el('gamificationCard');
  const streakNode = el('streakText');

  const next = firstPlannedRow(lastResult?.schedule || []);
  if (next) {
    summaryNode.textContent = `Next planned session: ${next.title} for ${next.minutes} minutes on ${next.date}.`;
  } else {
    summaryNode.textContent = 'No schedule yet. Add or update books and settings to auto-build your plan.';
  }

  let todayMinutes = sessionsUI ? sessionsUI.todayMinutes() : 0;
  todayMinutes += completedPlannedMinutesForToday(lastResult, scheduleCompletions);

  const goalMinutes = Math.max(
    MIN_GOAL_MINUTES,
    Number(preferences.dailyGoalMinutes || defaultDailyGoalMinutes),
  );
  const pct = Math.min(MAX_PERCENT, Math.round((todayMinutes / goalMinutes) * MAX_PERCENT));
  goalText.textContent = `${todayMinutes} / ${goalMinutes} minutes logged today`;
  goalProgress.setAttribute('aria-valuenow', String(pct));
  goalBar.style.width = `${pct}%`;

  const gamificationOn = Boolean(featureFlags.gamificationEnabled);
  gamificationCard.hidden = !gamificationOn;
  if (gamificationOn) {
    const streak = sessionsUI ? sessionsUI.streakDays() : 0;
    streakNode.textContent = `${streak} day streak`;
  }
}

export function activateSessionsAndStartTimer(
  lastResult: PlannerResult | null,
  sessionsUI: SessionsUI | null,
  activateTab: (name: string, options: { focusPanel: boolean }) => void,
): void {
  const next = firstPlannedRow(lastResult?.schedule || []);
  if (next?.book_id && sessionsUI) {
    sessionsUI.selectBookById(next.book_id);
  }
  activateTab('sessions', { focusPanel: true });
  if (sessionsUI) {
    sessionsUI.startTimer();
  }
}
