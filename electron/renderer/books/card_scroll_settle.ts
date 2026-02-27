const RAF_FALLBACK_DELAY_MS = 16;
const SCROLL_SETTLE_DELTA_PX = 0.5;
const SCROLL_SETTLE_MAX_WAIT_MS = 1800;
const SCROLL_SETTLE_REQUIRED_FRAMES = 3;

interface ScrollSettleState {
  lastLeft: number;
  lastTop: number;
  stableFrames: number;
  startedAtMs: number;
}

/**
 * Returns a monotonic timestamp in milliseconds.
 * @returns Current timestamp in milliseconds.
 */
function nowMs(): number {
  if (
    typeof globalThis.performance.now === "function"
  ) {
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
  const rect = card.getBoundingClientRect();
  return {
    lastLeft: rect.left,
    lastTop: rect.top,
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
function nextSettleState(card: HTMLElement, state: ScrollSettleState): ScrollSettleState {
  const rect = card.getBoundingClientRect();
  const deltaTop = Math.abs(rect.top - state.lastTop);
  const deltaLeft = Math.abs(rect.left - state.lastLeft);
  const maxDelta = Math.max(deltaTop, deltaLeft);
  let stableFrames = 0;
  if (maxDelta <= SCROLL_SETTLE_DELTA_PX) {
    stableFrames = state.stableFrames + 1;
  }
  return {
    lastTop: rect.top,
    lastLeft: rect.left,
    startedAtMs: state.startedAtMs,
    stableFrames,
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
  const nextState = nextSettleState(card, state);
  if (nextState.stableFrames >= SCROLL_SETTLE_REQUIRED_FRAMES) {
    onSettled();
    return;
  }
  const elapsedMs = nowMs() - nextState.startedAtMs;
  if (elapsedMs >= SCROLL_SETTLE_MAX_WAIT_MS) {
    onSettled();
    return;
  }
  requestFrame(() => {
    waitForScrollSettle(card, isCurrent, onSettled, nextState);
  });
}

/**
 * Checks whether card bounds extend beyond the current viewport.
 * @param card Card element that may require scrolling.
 * @returns `true` when card should be scrolled into view first.
 */
export function shouldScrollCardIntoView(card: HTMLElement): boolean {
  const rect = card.getBoundingClientRect();
  const viewportHeight = Number(globalThis.innerHeight || 0);
  const viewportWidth = Number(globalThis.innerWidth || 0);
  if (viewportHeight <= 0 || viewportWidth <= 0) {
    return true;
  }
  if (rect.top < 0) {
    return true;
  }
  if (rect.left < 0) {
    return true;
  }
  if (rect.bottom > viewportHeight) {
    return true;
  }
  if (rect.right > viewportWidth) {
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
  const settleState = initialSettleState(card);
  requestFrame(() => {
    waitForScrollSettle(card, isCurrent, onSettled, settleState);
  });
}
