// Keep this long enough to let the splash animations settle before removal.
const SPLASH_MIN_DURATION_MS = 3000;
// Keep in sync with .splash-screen transition duration in electron/styles/base.css.
const SPLASH_CSS_FADE_DURATION_MS = 560;
// Buffer for cases where transitionend is delayed or not dispatched.
const SPLASH_TRANSITION_FALLBACK_BUFFER_MS = 120;
const SPLASH_TRANSITION_FALLBACK_MS =
  SPLASH_CSS_FADE_DURATION_MS + SPLASH_TRANSITION_FALLBACK_BUFFER_MS;

/**
 * Creates a splash controller that removes the splash screen after minimum display time.
 * @returns Controller with a completion callback for bootstrapping flow.
 */
export function createSplashController() {
  const splashScreen = document.getElementById("splashScreen");
  const startedAt = performance.now();

  const finish = () => {
    if (!(splashScreen instanceof HTMLElement)) {
      return;
    }

    document.body.classList.add("splash-exit");
    const removeSplash = () => {
      splashScreen.remove();
      document.body.classList.remove("splash-exit");
    };

    splashScreen.addEventListener("transitionend", removeSplash, {
      once: true,
    });
    globalThis.setTimeout(removeSplash, SPLASH_TRANSITION_FALLBACK_MS);
  };

  const completeWhenReady = () => {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);
    globalThis.setTimeout(finish, remaining);
  };

  return { completeWhenReady };
}
