import type {
    DayMinutesMap,
    TodayScheduleSnapshot,
    UpdateTodayDashboardArgs,
} from "../../../types/types.js";
import {
    dayMinutesForKey,
    dayMinutesFromActivity,
    streakFromDayMinutes,
} from "../../activity/day_minutes.js";
import { todayKey } from "../../sessions/utils.js";
import { renderTodayCarousel } from "./today_carousel_render.js";
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

function resolvedGoalMinutes(
    preferredGoalMinutes: number,
    defaultGoalMinutes: number,
): number {
    return Math.max(
        MIN_GOAL_MINUTES,
        Number(preferredGoalMinutes || defaultGoalMinutes),
    );
}

function getOptionalElement(id: string): HTMLElement | null {
    const NODE = globalThis.document.getElementById(id);
    if (!(NODE instanceof HTMLElement)) {
        return null;
    }
    return NODE;
}

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
    const COMPLETE = isHeaderSessionsComplete(
        options.snapshot.completedSessions,
        options.snapshot.scheduledSessions,
    );
    if (options.completeIndicator !== null) {
        applyIndicatorState(options.completeIndicator, COMPLETE);
    }
}

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

function applyHeaderGoalMetric(
    activityByDay: DayMinutesMap,
    goalMinutes: number,
): void {
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
        STREAK_FLAME.classList.toggle(
            "is-goal-complete",
            GOAL_METRIC.goalComplete,
        );
    }
}

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

    renderTodayCarousel({
        books,
        lastResult,
        scheduleCompletions,
    });

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
