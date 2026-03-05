import type {
    DayMinutesMap,
    PlannerResult,
    PlannerScheduleRow,
    TodayScheduleSnapshot,
    UpdateTodayDashboardArgs,
} from "../../../types/types.js";
import {
    dayMinutesForKey,
    dayMinutesFromActivity,
    streakFromDayMinutes,
} from "../../activity/day_minutes.js";
import { todayKey } from "../../sessions/utils.js";
import { renderTodayScheduledBooks } from "./today_books_view.js";
import { goalProgressPercent } from "./today_goal.js";
import {
    formatHeaderSessionsText,
    formatStreakText,
    isHeaderGoalComplete,
    isHeaderSessionsComplete,
} from "./today_header.js";
import {
    applyIndicatorState,
    renderSessionDots,
} from "./today_header_render.js";
import { buildTodayScheduleSnapshot } from "./today_schedule.js";

const MIN_GOAL_MINUTES = 1;
const NO_SCHEDULE_TEXT =
    "No schedule yet. Add or update books and settings to auto-build your plan.";
const TODAY_DONE_TEXT = "All planned sessions for today are complete.";
const NO_INCOMPLETE_TEXT =
    "No incomplete planned sessions ahead. Update books or settings to refresh your plan.";

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
 * Updates optional Today summary copy when the summary node exists.
 * @param lastResult Latest planner result.
 * @param snapshot Computed today schedule snapshot.
 */
function renderSummaryCopy(
    lastResult: PlannerResult | null,
    snapshot: TodayScheduleSnapshot,
): void {
    const SUMMARY_NODE = globalThis.document.getElementById("todaySummary");
    if (!(SUMMARY_NODE instanceof HTMLElement)) {
        return;
    }
    SUMMARY_NODE.textContent = summaryText(
        lastResult,
        snapshot,
        snapshot.nextUncompletedRow,
    );
}

/**
 * Resolves daily goal minutes from preferences with fallback.
 * @param preferredGoalMinutes Preferred daily goal.
 * @param defaultGoalMinutes Default daily goal.
 * @returns Normalized minimum positive goal.
 */
function resolvedGoalMinutes(
    preferredGoalMinutes: number,
    defaultGoalMinutes: number,
): number {
    return Math.max(
        MIN_GOAL_MINUTES,
        Number(preferredGoalMinutes || defaultGoalMinutes),
    );
}

/**
 * Renders top-header goal text and completion indicator state.
 * @param activityByDay Aggregated day-minute activity map.
 * @param goalMinutes Daily goal minutes.
 * @param goalText Goal text node.
 * @param goalIndicator Goal completion indicator node.
 */
function renderHeaderGoalMetric(
    activityByDay: DayMinutesMap,
    goalMinutes: number,
): {
    goalComplete: boolean;
    goalProgressPercent: number;
    todayMinutes: number;
} {
    const TODAY_MINUTES = dayMinutesForKey(activityByDay, todayKey());
    return {
        goalComplete: isHeaderGoalComplete(TODAY_MINUTES, goalMinutes),
        goalProgressPercent: goalProgressPercent(TODAY_MINUTES, goalMinutes),
        todayMinutes: TODAY_MINUTES,
    };
}

/**
 * Renders top-header sessions status and completion dots.
 * @param snapshot Today schedule snapshot.
 * @param sessionsStatus Hidden sessions status text node.
 * @param sessionDots Sessions dot-grid container.
 */
function renderHeaderSessionsMetric(options: {
    snapshot: TodayScheduleSnapshot;
    sessionsStatus: HTMLElement;
    sessionDots: HTMLElement;
    completeIndicator: HTMLElement | null;
}): void {
    options.sessionsStatus.textContent = formatHeaderSessionsText(
        options.snapshot.completedSessions,
        options.snapshot.scheduledSessions,
    );
    renderSessionDots(
        options.sessionDots,
        options.snapshot.completedSessions,
        options.snapshot.scheduledSessions,
    );
    const IS_COMPLETE = isHeaderSessionsComplete(
        options.snapshot.completedSessions,
        options.snapshot.scheduledSessions,
    );
    if (options.completeIndicator !== null) {
        applyIndicatorState(options.completeIndicator, IS_COMPLETE);
    }
}

/**
 * Renders top-header streak metric visibility and text.
 * @param activityByDay Aggregated day-minute activity map.
 * @param goalMinutes Daily goal minutes used for streak threshold.
 * @param gamificationEnabled Feature-flag toggle value.
 * @param streakMetric Streak metric wrapper.
 * @param streakNode Streak text node.
 */
function renderHeaderStreakMetric(options: {
    activityByDay: DayMinutesMap;
    goalMinutes: number;
    gamificationEnabled: boolean;
    streakMetric: HTMLElement;
    streakNode: HTMLElement;
}): void {
    options.streakMetric.hidden = !options.gamificationEnabled;
    if (!options.gamificationEnabled) {
        return;
    }
    const STREAK = streakFromDayMinutes(
        options.activityByDay,
        options.goalMinutes,
    );
    options.streakNode.textContent = formatStreakText(STREAK);
}

/**
 * Returns an element by id when it exists and is an HTMLElement.
 * @param id Element id.
 * @returns HTMLElement instance or null when unavailable.
 */
function getOptionalElement(id: string): HTMLElement | null {
    const NODE = globalThis.document.getElementById(id);
    if (!(NODE instanceof HTMLElement)) {
        return null;
    }
    return NODE;
}

/**
 * Applies top-header daily-goal state and streak-flame complete style.
 * @param activityByDay Aggregated day-minute activity map.
 * @param goalMinutes Daily goal minute target.
 * @returns Computed goal metric state.
 */
function applyHeaderGoalMetric(
    activityByDay: DayMinutesMap,
    goalMinutes: number,
): {
    goalComplete: boolean;
    goalProgressPercent: number;
    todayMinutes: number;
} {
    const GOAL_METRIC = renderHeaderGoalMetric(activityByDay, goalMinutes);
    const GOAL_TEXT = getOptionalElement("todayGoalText");
    if (GOAL_TEXT !== null) {
        GOAL_TEXT.textContent = `${GOAL_METRIC.todayMinutes}/${goalMinutes} Minutes`;
    }
    const GOAL_INDICATOR = getOptionalElement("headerGoalIndicator");
    if (GOAL_INDICATOR !== null) {
        GOAL_INDICATOR.setAttribute(
            "data-progress-percent",
            String(GOAL_METRIC.goalProgressPercent),
        );
        applyIndicatorState(GOAL_INDICATOR, GOAL_METRIC.goalComplete);
    }
    const STREAK_FLAME = getOptionalElement("headerStreakFlame");
    if (STREAK_FLAME !== null) {
        if (GOAL_METRIC.goalComplete) {
            STREAK_FLAME.classList.add("is-goal-complete");
        } else {
            STREAK_FLAME.classList.remove("is-goal-complete");
        }
    }
    return GOAL_METRIC;
}

/**
 * Applies top-header sessions text, completion dots, and complete indicator state.
 * @param snapshot Today schedule snapshot.
 */
function applyHeaderSessionsMetric(snapshot: TodayScheduleSnapshot): void {
    const SESSIONS_STATUS = getOptionalElement("headerSessionsStatus");
    const SESSION_DOTS = getOptionalElement("headerSessionsDots");
    if (SESSIONS_STATUS === null || SESSION_DOTS === null) {
        return;
    }
    renderHeaderSessionsMetric({
        completeIndicator: getOptionalElement("headerSessionsIndicator"),
        sessionDots: SESSION_DOTS,
        sessionsStatus: SESSIONS_STATUS,
        snapshot,
    });
}

/**
 * Applies top-header streak metric visibility and text.
 * @param activityByDay Aggregated day-minute activity map.
 * @param goalMinutes Daily goal minute target.
 * @param gamificationEnabled Feature toggle for streak visibility.
 */
function applyHeaderStreakMetric(
    activityByDay: DayMinutesMap,
    goalMinutes: number,
    gamificationEnabled: boolean,
): void {
    const STREAK_METRIC = getOptionalElement("headerStreakMetric");
    const STREAK_NODE = getOptionalElement("streakText");
    if (STREAK_METRIC === null || STREAK_NODE === null) {
        return;
    }
    renderHeaderStreakMetric({
        activityByDay,
        gamificationEnabled,
        goalMinutes,
        streakMetric: STREAK_METRIC,
        streakNode: STREAK_NODE,
    });
}

/**
 * Re-renders Today dashboard content and progress widgets.
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
    const SNAPSHOT = buildTodayScheduleSnapshot(
        lastResult,
        scheduleCompletions,
        books,
    );
    renderSummaryCopy(lastResult, SNAPSHOT);
    renderTodayScheduledBooks(SNAPSHOT);

    const ACTIVITY_BY_DAY = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year: null,
    });
    const GOAL_MINUTES = resolvedGoalMinutes(
        Number(preferences.dailyGoalMinutes),
        defaultDailyGoalMinutes,
    );
    applyHeaderGoalMetric(ACTIVITY_BY_DAY, GOAL_MINUTES);
    applyHeaderSessionsMetric(SNAPSHOT);
    applyHeaderStreakMetric(
        ACTIVITY_BY_DAY,
        GOAL_MINUTES,
        Boolean(featureFlags.gamificationEnabled),
    );
}
