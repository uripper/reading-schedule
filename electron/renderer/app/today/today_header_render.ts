import { buildSessionDotStates } from "./today_header.js";

/**
 * Toggles complete-state CSS for a checkbox-style metric indicator.
 * @param indicatorNode - Indicator DOM element.
 * @param complete - Whether the metric is complete.
 */
export function applyIndicatorState(
    indicatorNode: HTMLElement,
    complete: boolean,
): void {
    const INDICATOR = indicatorNode;
    if (complete) {
        INDICATOR.classList.add("is-complete");
        return;
    }
    INDICATOR.classList.remove("is-complete");
}

/**
 * Renders session completion circles in the header metric.
 * @param container - Dot grid container element.
 * @param completedSessions - Completed sessions count.
 * @param scheduledSessions - Scheduled sessions count.
 */
export function renderSessionDots(
    container: HTMLElement,
    completedSessions: number,
    scheduledSessions: number,
): void {
    const DOT_STATES = buildSessionDotStates(
        completedSessions,
        scheduledSessions,
    );
    const DOTS: HTMLSpanElement[] = [];
    for (const IS_COMPLETE of DOT_STATES) {
        const DOT = document.createElement("span");
        DOT.className = "neo-session-dot";
        if (IS_COMPLETE) {
            DOT.classList.add("is-complete");
        }
        DOT.setAttribute("aria-hidden", "true");
        DOTS.push(DOT);
    }
    container.replaceChildren(...DOTS);
}
