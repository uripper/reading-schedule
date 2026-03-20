/**
 * Renders the Today dashboard and coordinates header metrics derived from
 * activity, schedule progress, and reading goals.
 */
import type {
    DayMinutesMap,
    TodayScheduleSnapshot,
    UpdateTodayDashboardArgs,
} from "../../../types/types.ts";
import {
    dayMinutesForKey,
    dayMinutesFromActivity,
    streakFromDayMinutes,
} from "../../activity/day-minutes.ts";
import { todayKey } from "../../sessions/utils.ts";
import { renderTodayCarousel } from "./today_carousel_render.ts";
import { goalProgressPercent } from "./today_goal.ts";
import {
    formatHeaderSessionsText,
    formatStreakText,
    isHeaderGoalComplete,
    isHeaderSessionsComplete,
} from "./today_header.ts";
import {
    applyIndicatorState,
    renderSessionDots,
} from "./today_header_render.ts";
import { buildTodayScheduleSnapshot } from "./today_schedule.ts";

/** Minimum goal minutes allowed when resolving Today progress targets. */
const MIN_GOAL_MINUTES = 1;

/** DOM nodes required to render the header sessions metric. */
type RenderHeaderSessionsMetricOptions = {
    snapshot: TodayScheduleSnapshot;
    sessionsStatus: HTMLElement;
    sessionDots: HTMLElement;
    completeIndicator: HTMLElement | null;
};

/** Resolve the effective Today goal minutes from saved and fallback settings. */
function resolvedGoalMinutes(
    preferredGoalMinutes: number,
    defaultGoalMinutes: number,
): number {
    return Math.max(
        MIN_GOAL_MINUTES,
        Number(preferredGoalMinutes || defaultGoalMinutes),
    );
}

/** Look up an element by id and return it only when it is an `HTMLElement`. */
function getOptionalElement(id: string): HTMLElement | null {
    const NODE = globalThis.document.getElementById(id);
    if (!(NODE instanceof HTMLElement)) {
        return null;
    }
    return NODE;
}

/**
 * Compute header goal metrics for today based on the provided activity map and goal minutes.
 * @example
 * renderHeaderGoalMetric(activityByDay, 60)
 * { goalComplete: false, goalProgressPercent: 75, todayMinutes: 45 }
 * @param activityByDay - Map of day keys to minutes of activity for each day.
 * @param goalMinutes - Goal time in minutes used to evaluate today's progress.
 * @returns Return object with whether the goal is complete, the progress percent toward the goal, and today's minutes.
 **/
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

/** Apply completion state to the optional header indicator when it exists. */
function applyOptionalIndicator(
    completeIndicator: HTMLElement | null,
    complete: boolean,
): void {
    if (completeIndicator === null) {
        return;
    }
    applyIndicatorState(completeIndicator, complete);
}

/** Return whether a Today snapshot has completed all scheduled sessions. */
function headerSessionsComplete(snapshot: TodayScheduleSnapshot): boolean {
    return isHeaderSessionsComplete(
        snapshot.completedSessions,
        snapshot.scheduledSessions,
    );
}

/**
 * Renders the header sessions metric (updates status text, session dots, and optional completion indicator) from a schedule snapshot.
 * @example
 * renderHeaderSessionsMetric({ snapshot: todaysSnapshot, sessionsStatus: statusEl, sessionDots: dotsEl, completeIndicator: indicatorEl })
 * undefined
 * @param options - Options object containing the schedule snapshot and DOM elements to update.
 * @returns Void return value.
 **/
function renderHeaderSessionsMetric(
    options: RenderHeaderSessionsMetricOptions,
): void {
    const { completeIndicator, sessionDots, sessionsStatus, snapshot } =
        options;
    sessionsStatus.textContent = formatHeaderSessionsText(
        snapshot.completedSessions,
        snapshot.scheduledSessions,
    );
    renderSessionDots(
        sessionDots,
        snapshot.completedSessions,
        snapshot.scheduledSessions,
    );
    applyOptionalIndicator(completeIndicator, headerSessionsComplete(snapshot));
}

/**
 * Update the header streak metric visibility and text based on activity, goal, and gamification setting.
 * @example
 * renderHeaderStreakMetric({
 *   activityByDay: myDayMinutesMap,
 *   goalMinutes: 30,
 *   gamificationEnabled: true,
 *   streakMetric: document.getElementById('streak-metric'),
 *   streakNode: document.getElementById('streak-text'),
 * })
 * undefined
 * @param {Object} options - Options for rendering the header streak metric.
 * @param {DayMinutesMap} options.activityByDay - Map of days to active minutes used to compute the streak.
 * @param {number} options.goalMinutes - Daily goal in minutes used to determine streak progress.
 * @param {boolean} options.gamificationEnabled - Whether gamification is enabled; the metric is hidden if false.
 * @param {HTMLElement} options.streakMetric - Element that will be shown or hidden based on gamificationEnabled.
 * @param {HTMLElement} options.streakNode - Element whose textContent will be set to the formatted streak string.
 * @returns {void} No return value.
 */
function renderHeaderStreakMetric(options: {
    activityByDay: DayMinutesMap;
    goalMinutes: number;
    gamificationEnabled: boolean;
    streakMetric: HTMLElement;
    streakNode: HTMLElement;
}): void {
    const {
        activityByDay,
        gamificationEnabled,
        goalMinutes,
        streakMetric,
        streakNode,
    } = options;

    streakMetric.hidden = !gamificationEnabled;
    if (!gamificationEnabled) {
        return;
    }
    const STREAK = streakFromDayMinutes(activityByDay, goalMinutes);
    streakNode.textContent = formatStreakText(STREAK);
}

/** Update the Today goal text with today's minutes and the configured target. */
function applyGoalText(goalMinutes: number, todayMinutes: number): void {
    const GOAL_TEXT = getOptionalElement("todayGoalText");
    if (GOAL_TEXT === null) {
        return;
    }
    GOAL_TEXT.textContent = `${todayMinutes}/${goalMinutes} Minutes`;
}

/** Sync the Today goal indicator with the latest progress and completion state. */
function applyGoalIndicator(options: {
    goalComplete: boolean;
    goalProgressPercent: number;
}): void {
    const GOAL_INDICATOR = getOptionalElement("headerGoalIndicator");
    if (GOAL_INDICATOR === null) {
        return;
    }
    GOAL_INDICATOR.setAttribute(
        "data-progress-percent",
        String(options.goalProgressPercent),
    );
    applyIndicatorState(GOAL_INDICATOR, options.goalComplete);
}

/** Toggle the streak flame styling to reflect goal completion. */
function applyGoalFlame(goalComplete: boolean): void {
    const STREAK_FLAME = getOptionalElement("headerStreakFlame");
    if (STREAK_FLAME === null) {
        return;
    }
    STREAK_FLAME.classList.toggle("is-goal-complete", goalComplete);
}

/**
 * Updates header UI elements (today's goal text, progress indicator, and streak flame) to reflect the computed goal metric for today.
 * @example
 * applyHeaderGoalMetric(activityByDay, 30)
 * undefined
 * @param activityByDay - Map of days to minutes of activity used to compute today's metric.
 * @param goalMinutes - Daily goal in minutes used to compute progress and completion state.
 * @returns No return value.
 **/
function applyHeaderGoalMetric(
    activityByDay: DayMinutesMap,
    goalMinutes: number,
): void {
    const GOAL_METRIC = renderHeaderGoalMetric(activityByDay, goalMinutes);
    applyGoalText(goalMinutes, GOAL_METRIC.todayMinutes);
    applyGoalIndicator(GOAL_METRIC);
    applyGoalFlame(GOAL_METRIC.goalComplete);
}

/**
 * Apply session-related metrics from a Today's schedule snapshot to the header UI.
 * @example
 * applyHeaderSessionsMetric({ date: '2026-03-13', sessions: [] })
 * undefined
 * @param snapshot - Today's schedule snapshot used to render header session indicators.
 * @returns No return value.
 **/
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
 * Locates header streak DOM elements and, if present, renders the header streak metric using activity data and settings.
 * @example
 * applyHeaderStreakMetric(activityByDay, 30, true)
 * undefined
 * @param activityByDay - Map of days to active minutes used to compute streaks.
 * @param goalMinutes - Daily goal in minutes used to evaluate streak progress.
 * @param gamificationEnabled - Whether gamification features (like streaks) are enabled.
 * @returns Returns nothing; renders UI directly when relevant DOM elements exist.
 **/
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
 * Update the Today dashboard UI by building a snapshot, rendering the carousel, computing activity metrics, and applying header metrics.
 * @example
 * updateTodayDashboard({ lastResult: {}, scheduleCompletions: [], books: [], sessions: [], preferences: { dailyGoalMinutes: '30' }, featureFlags: { gamificationEnabled: true }, defaultDailyGoalMinutes: 20 })
 * undefined
 * @param args - Configuration object containing lastResult, scheduleCompletions, books, sessions, preferences, featureFlags, and defaultDailyGoalMinutes.
 * @returns Does not return a value; updates the UI and header metrics for Today.
 **/
export function updateTodayDashboard(args: UpdateTodayDashboardArgs): void {
    const SNAPSHOT = renderTodayCarouselAndBuildSnapshot({
        books: args.books,
        lastResult: args.lastResult,
        scheduleCompletions: args.scheduleCompletions,
    });
    const HEADER_METRICS = todayHeaderMetrics(args);
    applyTodayHeaderMetrics({
        activityByDay: HEADER_METRICS.activityByDay,
        gamificationEnabled: HEADER_METRICS.gamificationEnabled,
        goalMinutes: HEADER_METRICS.goalMinutes,
        snapshot: SNAPSHOT,
    });
}

/** Collect the derived values needed to render the Today header. */
function todayHeaderMetrics(
    args: UpdateTodayDashboardArgs,
): ReturnType<typeof buildTodayHeaderMetrics> {
    return buildTodayHeaderMetrics({
        defaultDailyGoalMinutes: args.defaultDailyGoalMinutes,
        featureFlags: args.featureFlags,
        lastResult: args.lastResult,
        preferences: args.preferences,
        scheduleCompletions: args.scheduleCompletions,
        sessions: args.sessions,
    });
}

/** Render the carousel first, then return the snapshot used by header metrics. */
function renderTodayCarouselAndBuildSnapshot(options: {
    books: UpdateTodayDashboardArgs["books"];
    lastResult: UpdateTodayDashboardArgs["lastResult"];
    scheduleCompletions: UpdateTodayDashboardArgs["scheduleCompletions"];
}): TodayScheduleSnapshot {
    const SNAPSHOT = buildTodayScheduleSnapshot(
        options.lastResult,
        options.scheduleCompletions,
        options.books,
    );

    renderTodayCarousel({
        books: options.books,
        lastResult: options.lastResult,
        scheduleCompletions: options.scheduleCompletions,
    });

    return SNAPSHOT;
}

/** Build Today header state from planner results, sessions, and preferences. */
function buildTodayHeaderMetrics(options: {
    defaultDailyGoalMinutes: number;
    featureFlags: UpdateTodayDashboardArgs["featureFlags"];
    lastResult: UpdateTodayDashboardArgs["lastResult"];
    preferences: UpdateTodayDashboardArgs["preferences"];
    scheduleCompletions: UpdateTodayDashboardArgs["scheduleCompletions"];
    sessions: UpdateTodayDashboardArgs["sessions"];
}): {
    activityByDay: DayMinutesMap;
    gamificationEnabled: boolean;
    goalMinutes: number;
} {
    return {
        activityByDay: dayMinutesFromActivity({
            lastResult: options.lastResult,
            scheduleCompletions: options.scheduleCompletions,
            sessions: options.sessions,
            year: null,
        }),
        gamificationEnabled: Boolean(options.featureFlags.gamificationEnabled),
        goalMinutes: resolvedGoalMinutes(
            Number(options.preferences.dailyGoalMinutes),
            options.defaultDailyGoalMinutes,
        ),
    };
}

/** Apply all computed Today header metrics after the carousel has rendered. */
function applyTodayHeaderMetrics(options: {
    activityByDay: DayMinutesMap;
    gamificationEnabled: boolean;
    goalMinutes: number;
    snapshot: TodayScheduleSnapshot;
}): void {
    applyHeaderGoalMetric(options.activityByDay, options.goalMinutes);
    applyHeaderSessionsMetric(options.snapshot);
    applyHeaderStreakMetric(
        options.activityByDay,
        options.goalMinutes,
        options.gamificationEnabled,
    );
}
