const SPLASH_MIN_DURATION_MS = 2200;
const SPLASH_FADE_DURATION_MS = 600;
const SPLASH_ADJUSTMENT= 120;

export function createSplashController() {
  const splashScreen = document.getElementById('splashScreen');
  const startedAt = performance.now();

  const finish = () => {
    if (!(splashScreen instanceof HTMLElement)) {
      return;
    }

    document.body.classList.add('splash-exit');
    const removeSplash = () => {
      splashScreen.remove();
      document.body.classList.remove('splash-exit');
    };

    splashScreen.addEventListener('transitionend', removeSplash, { once: true });
    globalThis.setTimeout(removeSplash, SPLASH_FADE_DURATION_MS + SPLASH_ADJUSTMENT);
  };

  const completeWhenReady = () => {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);
    globalThis.setTimeout(finish, remaining);
  };

  return { completeWhenReady };
}
