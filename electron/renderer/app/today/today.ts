import {
    type PlannerResult,
    type PlannerScheduleRow,
    type TodayScheduleSnapshot,
    type UpdateTodayDashboardArgs,
} from "../../../types/types.js";
import {
    dayMinutesForKey,
    dayMinutesFromActivity,
    streakFromDayMinutes,
} from "../../activity/day_minutes.js";
import { el } from "../../dom.js";
import { todayKey } from "../../sessions/utils.js";
import { renderTodayScheduledBooks } from "./today_books_view.js";
import { buildTodayScheduleSnapshot } from "./today_schedule.js";

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
    const TARGET_BUTTON = button;
    if (!nextRow) {
        TARGET_BUTTON.dataset.focusSessionBookId = "";
        TARGET_BUTTON.dataset.focusSessionDate = "";
        TARGET_BUTTON.dataset.focusSessionIndex = "";
        TARGET_BUTTON.dataset.focusSessionMinutes = "";
        TARGET_BUTTON.dataset.focusSessionTitle = "";
        TARGET_BUTTON.dispatchEvent(new Event(FOCUS_SESSION_UPDATE_EVENT));
        return;
    }
    TARGET_BUTTON.dataset.focusSessionBookId = String(nextRow.book_id);
    TARGET_BUTTON.dataset.focusSessionDate = String(nextRow.date);
    TARGET_BUTTON.dataset.focusSessionIndex = String(nextRow.session_index);
    TARGET_BUTTON.dataset.focusSessionMinutes = String(nextRow.minutes);
    TARGET_BUTTON.dataset.focusSessionTitle = String(nextRow.title);
    TARGET_BUTTON.dispatchEvent(new Event(FOCUS_SESSION_UPDATE_EVENT));
}

/**
 * Computes bounded goal-completion percentage for today's minutes bar.
 * @param todayMinutesRaw Minutes logged today.
 * @param goalMinutesRaw Daily goal minutes.
 * @returns Integer percent between 0 and 100.
 */
function goalProgressPercent(
    todayMinutesRaw: number,
    goalMinutesRaw: number,
): number {
    const GOAL_MINUTES = Math.max(
        MIN_GOAL_MINUTES,
        Number(goalMinutesRaw || MIN_GOAL_MINUTES),
    );
    const TODAY_MINUTES = Math.max(
        MIN_PERCENT,
        Number(todayMinutesRaw || MIN_PERCENT),
    );
    const RAW_PERCENT = Math.round(
        (TODAY_MINUTES / GOAL_MINUTES) * MAX_PERCENT,
    );
    const BOUNDED = Math.min(MAX_PERCENT, RAW_PERCENT);
    return Math.max(MIN_PERCENT, BOUNDED);
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
    const SUMMARY_NODE = el("todaySummary");
    const GOAL_TEXT = el("todayGoalText");
    const GOAL_PROGRESS = el<HTMLProgressElement>("todayGoalProgress");
    const FOCUS_ENTRY_BUTTON = el<HTMLButtonElement>(
        "startSessionFromTodayBtn",
    );
    const GAMIFICATION_CARD = el("gamificationCard");
    const STREAK_NODE = el("streakText");

    const SNAPSHOT = buildTodayScheduleSnapshot(
        lastResult,
        scheduleCompletions,
        books,
    );
    const NEXT = SNAPSHOT.nextUncompletedRow;
    SUMMARY_NODE.textContent = summaryText(lastResult, SNAPSHOT, NEXT);
    setFocusSessionDataset(FOCUS_ENTRY_BUTTON, NEXT);
    renderTodayScheduledBooks(SNAPSHOT);

    const ACTIVITY_BY_DAY = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year: null,
    });

    const GOAL_MINUTES = Math.max(
        MIN_GOAL_MINUTES,
        Number(preferences.dailyGoalMinutes || defaultDailyGoalMinutes),
    );
    const TODAY_MINUTES = dayMinutesForKey(ACTIVITY_BY_DAY, todayKey());
    const PCT = goalProgressPercent(TODAY_MINUTES, GOAL_MINUTES);
    GOAL_TEXT.textContent = `${TODAY_MINUTES} / ${GOAL_MINUTES} minutes logged today`;
    GOAL_PROGRESS.value = PCT;

    const GAMIFICATION_ON = Boolean(featureFlags.gamificationEnabled);
    GAMIFICATION_CARD.hidden = !GAMIFICATION_ON;
    if (GAMIFICATION_ON) {
        const STREAK = streakFromDayMinutes(ACTIVITY_BY_DAY, GOAL_MINUTES);
        STREAK_NODE.textContent = `${STREAK} day streak`;
    }
}
