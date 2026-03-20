// Keep this long enough to let the splash animations settle before removal.
const SPLASH_MIN_DURATION_MS = 2500;
// Keep in sync with .splash-screen transition duration in electron/styles/base.css.
const SPLASH_CSS_FADE_DURATION_MS = 560;
// Buffer for cases where transitionend is delayed or not dispatched.
const SPLASH_TRANSITION_FALLBACK_BUFFER_MS = 120;
const SPLASH_TRANSITION_FALLBACK_MS =
    SPLASH_CSS_FADE_DURATION_MS + SPLASH_TRANSITION_FALLBACK_BUFFER_MS;

function removeSplashScreen(splashScreen: HTMLElement): void {
    splashScreen.remove();
    document.body.classList.remove("splash-exit");
}

function finishSplashScreen(splashScreen: HTMLElement): void {
    document.body.classList.add("splash-exit");
    splashScreen.addEventListener(
        "transitionend",
        () => {
            removeSplashScreen(splashScreen);
        },
        {
            once: true,
        },
    );
    globalThis.setTimeout(() => {
        removeSplashScreen(splashScreen);
    }, SPLASH_TRANSITION_FALLBACK_MS);
}

/**
 * Creates a splash controller that removes the splash screen after minimum display time.
 * @returns Controller with a completion callback for bootstrapping flow.
 */
export function createSplashController(): { completeWhenReady(): void } {
    const SPLASH_SCREEN = document.getElementById("splashScreen");
    const STARTED_AT = performance.now();

    const COMPLETE_WHEN_READY = (): void => {
        const ELAPSED = performance.now() - STARTED_AT;
        const REMAINING = Math.max(0, SPLASH_MIN_DURATION_MS - ELAPSED);
        globalThis.setTimeout(() => {
            if (!(SPLASH_SCREEN instanceof HTMLElement)) {
                return;
            }
            finishSplashScreen(SPLASH_SCREEN);
        }, REMAINING);
    };

    return { completeWhenReady: COMPLETE_WHEN_READY };
}
