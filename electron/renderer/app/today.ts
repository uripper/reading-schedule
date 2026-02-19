
import { firstPlannedRow } from "../calendar.js";
import { el } from "../dom.js";
import { todayKey } from "../sessions/utils.js";

const MIN_GOAL_MINUTES = 1;
const MAX_PERCENT = 100;

function scheduleKey(row) {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

function completedPlannedMinutesForToday(lastResult, scheduleCompletions) {
  const today = todayKey();
  let rows = [];
  if (Array.isArray(lastResult?.schedule)) {
    rows = lastResult.schedule;
  }
  return rows.reduce((totalMinutes, row) => {
    if (String(row?.date || "") !== today) {
      return totalMinutes;
    }
    if (!scheduleCompletions?.[scheduleKey(row)]) {
      return totalMinutes;
    }
    return totalMinutes + Number(row?.minutes || 0);
  }, 0);
}

export function updateTodayDashboard({
  lastResult,
  scheduleCompletions,
  preferences,
  featureFlags,
  sessionsUI,
  defaultDailyGoalMinutes,
}) {
  const summaryNode = el("todaySummary");
  const goalText = el("todayGoalText");
  const goalProgress = el("todayGoalProgress");
  const goalBar = el("todayGoalBar");
  const gamificationCard = el("gamificationCard");
  const streakNode = el("streakText");

  const next = firstPlannedRow(lastResult?.schedule || []);
  if (next) {
    summaryNode.textContent = `Next planned session: ${next.title} for ${next.minutes} minutes on ${next.date}.`;
  } else {
    summaryNode.textContent = "No schedule yet. Add or update books and settings to auto-build your plan.";
  }

  let todayMinutes = 0;
  if (sessionsUI) {
    todayMinutes = sessionsUI.todayMinutes();
  }
  todayMinutes += completedPlannedMinutesForToday(lastResult, scheduleCompletions);

  const goalMinutes = Math.max(
    MIN_GOAL_MINUTES,
    Number(preferences.dailyGoalMinutes || defaultDailyGoalMinutes),
  );
  const pct = Math.min(MAX_PERCENT, Math.round((todayMinutes / goalMinutes) * MAX_PERCENT));
  goalText.textContent = `${todayMinutes} / ${goalMinutes} minutes logged today`;
  goalProgress.setAttribute("aria-valuenow", String(pct));
  goalBar.style.width = `${pct}%`;

  const gamificationOn = Boolean(featureFlags.gamificationEnabled);
  gamificationCard.hidden = !gamificationOn;
  if (gamificationOn) {
    let streak = 0;
    if (sessionsUI) {
      streak = sessionsUI.streakDays();
    }
    streakNode.textContent = `${streak} day streak`;
  }
}

export function activateSessionsAndStartTimer(lastResult, sessionsUI, activateTab) {
  const next = firstPlannedRow(lastResult?.schedule || []);
  if (next?.book_id && sessionsUI) {
    sessionsUI.selectBookById(next.book_id);
  }
  activateTab("sessions", { focusPanel: true });
  if (sessionsUI) {
    sessionsUI.startTimer();
  }
}
