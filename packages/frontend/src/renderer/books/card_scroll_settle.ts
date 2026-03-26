import type { ScrollSettleState } from "../../types/types.ts";

const RAF_FALLBACK_DELAY_MS = 16;
const SCROLL_SETTLE_DELTA_PX = 0.5;
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
 * @param task - Callback to execute on the next frame.
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
 * @param card - Card being tracked for motion settling.
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
 * @param card - Card being tracked for motion settling.
 * @param state - Previous settle-state values.
 * @returns Updated settle-state.
 */
function nextSettleState(
    card: HTMLElement,
    state: ScrollSettleState,
): ScrollSettleState {
    const RECT = card.getBoundingClientRect();
    const DELTA_TOP = Math.abs(RECT.top - state.lastTop);
    const DELTA_LEFT = Math.abs(RECT.left - state.lastLeft);
    const MAX_DELTA = Math.max(DELTA_TOP, DELTA_LEFT);
    let stableFrames = 0;
    if (MAX_DELTA <= SCROLL_SETTLE_DELTA_PX) {
        stableFrames = state.stableFrames + 1;
    }
    return {
        lastLeft: RECT.left,
        lastTop: RECT.top,
        stableFrames,
        startedAtMs: state.startedAtMs,
    };
}

function hasTimedOut(state: ScrollSettleState): boolean {
    const ELAPSED_MS = nowMs() - state.startedAtMs;
    return ELAPSED_MS >= SCROLL_SETTLE_MAX_WAIT_MS;
}

function shouldFinishSettling(state: ScrollSettleState): boolean {
    if (state.stableFrames >= SCROLL_SETTLE_REQUIRED_FRAMES) {
        return true;
    }
    return hasTimedOut(state);
}

function viewportSize(): { height: number; width: number } {
    return {
        height: Number(globalThis.innerHeight || 0),
        width: Number(globalThis.innerWidth || 0),
    };
}

function invalidViewportSize(height: number, width: number): boolean {
    return height <= 0 || width <= 0;
}

function rectOutsideViewport(
    rect: Pick<DOMRect, "bottom" | "left" | "right" | "top">,
    viewport: { height: number; width: number },
): boolean {
    if (rect.top < 0 || rect.left < 0) {
        return true;
    }
    if (rect.bottom > viewport.height) {
        return true;
    }
    return rect.right > viewport.width;
}

/**
 * Waits until scroll motion settles, then invokes callback.
 * @param card - Card being tracked.
 * @param isCurrent - Callback that reports whether settle loop is still valid.
 * @param onSettled - Callback fired once scroll is settled or timed out.
 * @param state - Mutable settle-state across animation frames.
 */
function waitForScrollSettle(args: {
    card: HTMLElement;
    isCurrent: () => boolean;
    onSettled: () => void;
    state: ScrollSettleState;
}): void {
    if (!args.isCurrent()) {
        return;
    }
    const NEXT_STATE = nextSettleState(args.card, args.state);
    if (shouldFinishSettling(NEXT_STATE)) {
        args.onSettled();
        return;
    }
    requestFrame(() => {
        waitForScrollSettle({ ...args, state: NEXT_STATE });
    });
}

/**
 * Checks whether card bounds extend beyond the current viewport.
 * @param card - Card element that may require scrolling.
 * @returns `true` when card should be scrolled into view first.
 */
export function shouldScrollCardIntoView(card: HTMLElement): boolean {
    const RECT = card.getBoundingClientRect();
    const VIEWPORT = viewportSize();
    if (invalidViewportSize(VIEWPORT.height, VIEWPORT.width)) {
        return true;
    }
    return rectOutsideViewport(RECT, VIEWPORT);
}

/**
 * Begins asynchronous settle tracking after scroll starts.
 * @param card - Card being tracked.
 * @param isCurrent - Callback that reports whether settle loop is still valid.
 * @param onSettled - Callback fired once scroll settles or times out.
 */
export function waitForCardScrollSettle(
    card: HTMLElement,
    isCurrent: () => boolean,
    onSettled: () => void,
): void {
    const SETTLE_STATE = initialSettleState(card);
    requestFrame(() => {
        waitForScrollSettle({
            card,
            isCurrent,
            onSettled,
            state: SETTLE_STATE,
        });
    });
}
