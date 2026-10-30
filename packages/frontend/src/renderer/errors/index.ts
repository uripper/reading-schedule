/** Persistent critical-error surfaces shared by app and dialog workflows. */
import type { CriticalErrorSource, CriticalErrors } from "../../types/types.ts";
import { el } from "../dom.ts";

/** User-approved wording for critical failure messages and recovery actions. */
export const SAVE_FAILURE_MESSAGE =
    "Your changes could not be saved. Please try again.";
export const PLAN_FAILURE_MESSAGE =
    "The plan could not be generated. Try again or open Help/Logs for details.";
export const BOOK_SAVE_FAILURE_MESSAGE =
    "The book could not be saved. Try again or open Help/Logs for details";
export const RETRY_SAVE_LABEL = "Retry save";
export const HELP_LOGS_LABEL = "Help/Logs";

/** Creates an initially empty alert without moving keyboard focus. */
export function createErrorMessage(): HTMLParagraphElement {
    const MESSAGE = document.createElement("p");
    MESSAGE.className = "critical-error-message";
    MESSAGE.setAttribute("role", "alert");
    MESSAGE.setAttribute("aria-atomic", "true");
    return MESSAGE;
}

/** Keeps independent errors visible until their own operation recovers. */
export function createCriticalErrors(container: HTMLElement): CriticalErrors {
    const MESSAGES = new Map<CriticalErrorSource, HTMLParagraphElement>();
    const SOURCES: readonly CriticalErrorSource[] = ["persistence", "planner"];
    for (const SOURCE of SOURCES) {
        const MESSAGE = createErrorMessage();
        MESSAGE.dataset.errorSource = SOURCE;
        MESSAGES.set(SOURCE, MESSAGE);
        container.append(MESSAGE);
    }
    return {
        clear(source): void {
            setErrorText(MESSAGES.get(source), "");
        },
        show(source, message): void {
            setErrorText(MESSAGES.get(source), message);
        },
    };
}

/** Avoids announcing the same unresolved error on every autosave attempt. */
function setErrorText(node: HTMLElement | undefined, message: string): void {
    const NODE = node;
    if (NODE !== undefined && NODE.textContent !== message) {
        NODE.textContent = message;
    }
}

/** Opens the existing Help dialog so its normal keyboard recovery stays intact. */
export function createErrorHelpButton(): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.className = "btn critical-error-help";
    BUTTON.type = "button";
    BUTTON.textContent = HELP_LOGS_LABEL;
    BUTTON.onclick = (): void => {
        el<HTMLButtonElement>("helpBtn").click();
    };
    return BUTTON;
}

/** Creates recovery controls outside the live regions to avoid announcing buttons. */
function recoveryControls(container: HTMLElement) {
    const ROOT = document.createElement("div");
    ROOT.className = "critical-error-actions";
    const RETRY = document.createElement("button");
    RETRY.className = "btn";
    RETRY.type = "button";
    RETRY.textContent = RETRY_SAVE_LABEL;
    RETRY.hidden = true;
    const HELP = createErrorHelpButton();
    HELP.hidden = true;
    ROOT.append(RETRY, HELP);
    container.append(ROOT);
    return { help: HELP, retry: RETRY };
}

/** Hides resolved actions, moving focus only when its current control disappears. */
function updateRecoveryControls(options: {
    active: ReadonlySet<CriticalErrorSource>;
    controls: ReturnType<typeof recoveryControls>;
    fallbackFocus: HTMLElement;
}): void {
    const { help: HELP, retry: RETRY } = options.controls;
    RETRY.hidden = !options.active.has("persistence");
    HELP.hidden = options.active.size === 0;
    const ACTIVE = document.activeElement;
    if (
        (ACTIVE === RETRY && RETRY.hidden) ||
        (ACTIVE === HELP && HELP.hidden)
    ) {
        options.fallbackFocus.focus();
    }
}

/** Runs the existing serialized save queue and keeps failures available for retry. */
async function retryFromControl(options: {
    controls: ReturnType<typeof recoveryControls>;
    errors: CriticalErrors;
    retrySave: () => Promise<boolean>;
}): Promise<void> {
    const BUTTON = options.controls.retry;
    if (BUTTON.dataset.saving === "true") {
        return;
    }
    BUTTON.dataset.saving = "true";
    BUTTON.setAttribute("aria-disabled", "true");
    try {
        if (await options.retrySave()) {
            options.errors.clear("persistence");
            return;
        }
        options.errors.show("persistence", SAVE_FAILURE_MESSAGE);
    } catch {
        options.errors.show("persistence", SAVE_FAILURE_MESSAGE);
    } finally {
        delete BUTTON.dataset.saving;
        BUTTON.setAttribute("aria-disabled", "false");
    }
}

/** Tracks unresolved operations and updates their associated recovery controls. */
function scopedErrors(options: {
    active: Set<CriticalErrorSource>;
    controls: ReturnType<typeof recoveryControls>;
    fallbackFocus: HTMLElement;
    messages: CriticalErrors;
}): CriticalErrors {
    const ACTIVE = options.active;
    return {
        clear(source): void {
            if (!ACTIVE.delete(source)) {
                return;
            }
            options.messages.clear(source);
            updateRecoveryControls(options);
        },
        show(source, message): void {
            options.messages.show(source, message);
            ACTIVE.add(source);
            updateRecoveryControls(options);
        },
    };
}

/** Adds scoped retry/help controls to the app's persistent error regions. */
export function createAppErrorSurface(
    container: HTMLElement,
    fallbackFocus: HTMLElement,
) {
    const MESSAGES = createCriticalErrors(container);
    const CONTROLS = recoveryControls(container);
    const ERRORS = scopedErrors({
        active: new Set<CriticalErrorSource>(),
        controls: CONTROLS,
        fallbackFocus,
        messages: MESSAGES,
    });
    return {
        bindRetrySave(retrySave: () => Promise<boolean>): void {
            CONTROLS.retry.onclick = async (): Promise<void> => {
                await retryFromControl({
                    controls: CONTROLS,
                    errors: ERRORS,
                    retrySave,
                });
            };
        },
        errors: ERRORS,
    };
}
