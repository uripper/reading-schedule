/**
 * Blocking loading overlay for app start and workspace changes.
 *
 * The overlay is in the page markup and visible from the first paint, so opening
 * the app shows progress before any script runs; `finishAppStartLoading` hides it
 * once the first workspace is on screen. Later operations show it only when they
 * take longer than a short delay, so quick switches do not flash. Nested calls
 * keep it up until the outermost operation finishes.
 */
const OVERLAY_ID = "appLoadingOverlay";
const TEXT_ID = "appLoadingText";
const MAIN_ID = "mainContent";
const SHOW_DELAY_MS = 150;

let activeCount = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Shows or hides the overlay. While it is up the main region is busy for assistive
 * tech and inert, so neither clicks nor typing can change data that is being replaced.
 */
function setOverlayVisible(visible: boolean): void {
    const OVERLAY = globalThis.document.getElementById(OVERLAY_ID);
    if (OVERLAY !== null) {
        OVERLAY.hidden = !visible;
    }
    const MAIN = globalThis.document.getElementById(MAIN_ID);
    if (MAIN === null) {
        return;
    }
    MAIN.setAttribute("aria-busy", String(visible));
    MAIN.inert = visible;
}

/** Hides the overlay shown since the page loaded. */
export function finishAppStartLoading(): void {
    if (activeCount === 0) {
        setOverlayVisible(false);
    }
}

/** Starts a loading operation; the overlay appears after `delayMs`. */
function beginLoading(message: string, delayMs: number): void {
    activeCount += 1;
    const TEXT = globalThis.document.getElementById(TEXT_ID);
    if (TEXT !== null) {
        TEXT.textContent = message;
    }
    if (showTimer !== null || activeCount > 1) {
        return;
    }
    showTimer = setTimeout((): void => {
        showTimer = null;
        setOverlayVisible(true);
    }, delayMs);
}

/** Ends a loading operation; the overlay hides after the last one ends. */
function endLoading(): void {
    activeCount = Math.max(0, activeCount - 1);
    if (activeCount > 0) {
        return;
    }
    if (showTimer !== null) {
        clearTimeout(showTimer);
        showTimer = null;
    }
    setOverlayVisible(false);
}

/**
 * Runs a task while the loading overlay explains what is happening.
 * @param message - Short status, e.g. "Opening French…".
 * @param task - Work to wait for.
 * @param delayMs - Wait before showing; 0 blocks input at once, for work the user
 *   did not start and could otherwise type over.
 * @returns The task's result.
 */
export async function withAppLoading<T>(
    message: string,
    task: () => Promise<T>,
    delayMs: number = SHOW_DELAY_MS,
): Promise<T> {
    beginLoading(message, delayMs);
    try {
        return await task();
    } finally {
        endLoading();
    }
}
