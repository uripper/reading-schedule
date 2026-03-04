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
    const SCHEDULED = snapshot.scheduledSessions;
    if (!SCHEDULED) {
        return "No sessions scheduled for today.";
    }
    const COMPLETED = snapshot.completedSessions;
    const LABEL = sessionLabel(SCHEDULED);
    return `${COMPLETED} / ${SCHEDULED} ${LABEL} complete today`;
}

/**
 * Builds per-book completion text for the today list.
 * @param summary Per-book today summary.
 * @returns Text like `1 / 3 sessions complete`.
 */
export function perBookSessionText(summary: TodayBookSummary): string {
    const LABEL = sessionLabel(summary.scheduledSessions);
    return `${summary.completedSessions} / ${summary.scheduledSessions} ${LABEL} complete`;
}

/**
 * Builds planned-minute text for one book in the today list.
 * @param summary Per-book today summary.
 * @returns Text like `25 minutes planned`.
 */
export function plannedMinutesText(summary: TodayBookSummary): string {
    const LABEL = minuteLabel(summary.plannedMinutes);
    return `${summary.plannedMinutes} ${LABEL} planned`;
}

/**
 * Creates fallback cover text from a book title.
 * @param title Book title source text.
 * @returns Uppercase first character, or `No Cover` when unavailable.
 */
export function coverFallbackText(title: string): string {
    const TRIMMED = String(title || "").trim();
    if (!TRIMMED) {
        return "No Cover";
    }
    return TRIMMED.slice(0, SINGULAR_SESSION_COUNT).toUpperCase();
}
