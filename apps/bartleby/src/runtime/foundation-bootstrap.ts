/**
 * Applies minimal runtime state so the shared shell is visible before the
 * legacy renderer logic is migrated.
 */
const SPLASH_MIN_DURATION_MS = 2500;
const DEFAULT_STATUS_MESSAGE =
    "Tauri foundation loaded. Legacy feature wiring is next.";

function setFoundationStatus(statusMessage: string): void {
    const STATUS = document.getElementById("status");
    if (!(STATUS instanceof HTMLOutputElement)) {
        return;
    }
    STATUS.value = statusMessage;
    STATUS.textContent = statusMessage;
}

function removeSplashScreen(): void {
    const SPLASH_SCREEN = document.getElementById("splashScreen");
    if (!(SPLASH_SCREEN instanceof HTMLElement)) {
        return;
    }
    document.body.classList.add("splash-exit");
    globalThis.setTimeout(() => {
        SPLASH_SCREEN.remove();
        document.body.classList.remove("splash-exit");
    }, SPLASH_MIN_DURATION_MS);
}

export function completeFoundationBootstrap(
    statusMessage = DEFAULT_STATUS_MESSAGE,
): void {
    setFoundationStatus(statusMessage);
    removeSplashScreen();
}
