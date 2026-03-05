import type { BookFormRefs } from "../../types/types.js";

const DIALOG_CONFIRM_VALUE = "confirm";

/**
 * Shows the shelf-name dialog and resolves with a trimmed name on confirm.
 * @param refs - Form references containing shelf prompt dialog elements.
 * @returns Trimmed shelf name, or null when the prompt is canceled.
 */
async function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
    const DIALOG_REFS = refs;
    return await new Promise((resolve) => {
        DIALOG_REFS.shelfPromptInput.value = "";
        DIALOG_REFS.shelfPromptDialog.returnValue = "";
        const ON_CLOSE = (): void => {
            DIALOG_REFS.shelfPromptDialog.removeEventListener(
                "close",
                ON_CLOSE,
            );
            if (
                DIALOG_REFS.shelfPromptDialog.returnValue !==
                DIALOG_CONFIRM_VALUE
            ) {
                resolve(null);
                return;
            }
            resolve(DIALOG_REFS.shelfPromptInput.value.trim());
        };
        DIALOG_REFS.shelfPromptDialog.addEventListener("close", ON_CLOSE);
        try {
            DIALOG_REFS.shelfPromptDialog.showModal();
        } catch {
            DIALOG_REFS.shelfPromptDialog.show();
        }
        DIALOG_REFS.shelfPromptInput.focus();
    });
}

/**
 * Fallback shelf prompt when dialog interactions are unavailable.
 * @returns `null` because native prompt dialogs are disabled in this UI.
 */
function promptViaBrowser(): string | null {
    return null;
}

/**
 * Prevents prompt confirmation when the user submits an empty shelf name.
 * @param refs - Form references containing shelf prompt dialog elements.
 */
export function ensurePromptValidation(refs: BookFormRefs): void {
    refs.shelfPromptForm.addEventListener("submit", (event) => {
        if (!(event.submitter instanceof HTMLButtonElement)) {
            return;
        }
        if (event.submitter.value !== DIALOG_CONFIRM_VALUE) {
            return;
        }
        if (refs.shelfPromptInput.value.trim()) {
            return;
        }
        event.preventDefault();
        refs.shelfPromptInput.focus();
    });
}

/**
 * Prompts for a shelf name, preferring the custom dialog with browser fallback.
 * @param refs - Form references containing shelf prompt dialog elements.
 * @returns Trimmed shelf name, or null when the prompt is canceled.
 */
export async function promptForShelfName(
    refs: BookFormRefs,
): Promise<string | null> {
    try {
        return await promptViaDialog(refs);
    } catch {
        return promptViaBrowser();
    }
}
