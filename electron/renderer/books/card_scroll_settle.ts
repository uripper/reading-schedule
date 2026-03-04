import type { ScrollSettleState } from "../../types/types.js";

const RAF_FALLBACK_DELAY_MS = 16;
const _SCROLL_SETTLE_DELTA_PX = 0.5;
const SCROLL_SETTLE_MAX_WAIT_MS = 1800;
const SCROLL_SETTLE_REQUIRED_FRAMES = 3;

/**
 * Returns a monotonic timestamp in milliseconds.
 * @returns Current timestamp in milliseconds.
 */
function nowMs(): number {
    if (typeof globalThis.performance.now === "function") {
        return globalThis.performance.now();
    }
    return Date.now();
}

/**
 * Schedules one frame callback with a timer fallback.
 * @param task Callback to execute on the next frame.
 */
function requestFrame(task: () => void): void {
    if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
            task();
        });
        return;
    }
    globalThis.setTimeout(() => {
        task();
    }, RAF_FALLBACK_DELAY_MS);
}

/**
 * Captures initial settle-state metrics after scrolling starts.
 * @param card Card being tracked for motion settling.
 * @returns Mutable settle-state structure.
 */
function initialSettleState(card: HTMLElement): ScrollSettleState {
    const RECT = card.getBoundingClientRect();
    return {
        lastLeft: RECT.left,
        lastTop: RECT.top,
        stableFrames: 0,
        startedAtMs: nowMs(),
    };
}

/**
 * Returns next settle-state from current card bounds.
 * @param card Card being tracked for motion settling.
 * @param state Previous settle-state values.
 * @returns Updated settle-state.
 */
function nextSettleState(
    card: HTMLElement,
    state: ScrollSettleState,
): ScrollSettleState {
    const RECT = card.getBoundingClientRect();
    const DELTA_TOP = Math.abs(RECT.top - state.lastTop);
    const DELTA_LEFT = Math.abs(RECT.left - state.lastLeft);
    const _MAX_DELTA = Math.max(DELTA_TOP, DELTA_LEFT);
    const STABLE_FRAMES = 0;
    return {
        lastLeft: RECT.left,
        lastTop: RECT.top,
        stableFrames: STABLE_FRAMES,
        startedAtMs: state.startedAtMs,
    };
}

/**
 * Waits until scroll motion settles, then invokes callback.
 * @param card Card being tracked.
 * @param isCurrent Callback that reports whether settle loop is still valid.
 * @param onSettled Callback fired once scroll is settled or timed out.
 * @param state Mutable settle-state across animation frames.
 */
function waitForScrollSettle(
    card: HTMLElement,
    isCurrent: () => boolean,
    onSettled: () => void,
    state: ScrollSettleState,
): void {
    if (!isCurrent()) {
        return;
    }
    const NEXT_STATE = nextSettleState(card, state);
    if (NEXT_STATE.stableFrames >= SCROLL_SETTLE_REQUIRED_FRAMES) {
        onSettled();
        return;
    }
    const ELAPSED_MS = nowMs() - NEXT_STATE.startedAtMs;
    if (ELAPSED_MS >= SCROLL_SETTLE_MAX_WAIT_MS) {
        onSettled();
        return;
    }
    requestFrame(() => {
        waitForScrollSettle(card, isCurrent, onSettled, NEXT_STATE);
    });
}

/**
 * Checks whether card bounds extend beyond the current viewport.
 * @param card Card element that may require scrolling.
 * @returns `true` when card should be scrolled into view first.
 */
export function shouldScrollCardIntoView(card: HTMLElement): boolean {
    const RECT = card.getBoundingClientRect();
    const VIEWPORT_HEIGHT = Number(globalThis.innerHeight || 0);
    const VIEWPORT_WIDTH = Number(globalThis.innerWidth || 0);
    if (VIEWPORT_HEIGHT <= 0 || VIEWPORT_WIDTH <= 0) {
        return true;
    }
    if (RECT.top < 0) {
        return true;
    }
    if (RECT.left < 0) {
        return true;
    }
    if (RECT.bottom > VIEWPORT_HEIGHT) {
        return true;
    }
    if (RECT.right > VIEWPORT_WIDTH) {
        return true;
    }
    return false;
}

/**
 * Begins asynchronous settle tracking after scroll starts.
 * @param card Card being tracked.
 * @param isCurrent Callback that reports whether settle loop is still valid.
 * @param onSettled Callback fired once scroll settles or times out.
 */
export function waitForCardScrollSettle(
    card: HTMLElement,
    isCurrent: () => boolean,
    onSettled: () => void,
): void {
    const SETTLE_STATE = initialSettleState(card);
    requestFrame(() => {
        waitForScrollSettle(card, isCurrent, onSettled, SETTLE_STATE);
    });
}
