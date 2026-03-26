import type { BookFormRefs } from "../../types/types.ts";

const DIALOG_CONFIRM_VALUE = "confirm";

function resolvedShelfPromptValue(refs: BookFormRefs): string | null {
    if (refs.shelfPromptDialog.returnValue !== DIALOG_CONFIRM_VALUE) {
        return null;
    }
    return refs.shelfPromptInput.value.trim();
}

function resetShelfPrompt(refs: BookFormRefs): void {
    const DIALOG_REFS = refs;
    DIALOG_REFS.shelfPromptInput.value = "";
    DIALOG_REFS.shelfPromptDialog.returnValue = "";
}

function showShelfPromptDialog(refs: BookFormRefs): void {
    try {
        refs.shelfPromptDialog.showModal();
    } catch {
        refs.shelfPromptDialog.show();
    }
}

function bindShelfPromptClose(
    refs: BookFormRefs,
    resolve: (value: string | null) => void,
): void {
    refs.shelfPromptDialog.addEventListener(
        "close",
        () => {
            resolve(resolvedShelfPromptValue(refs));
        },
        { once: true },
    );
}

/**
 * Shows the shelf-name dialog and resolves with a trimmed name on confirm.
 * @param refs - Form references containing shelf prompt dialog elements.
 * @returns Trimmed shelf name, or null when the prompt is canceled.
 */
async function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
    return await new Promise((resolve) => {
        resetShelfPrompt(refs);
        bindShelfPromptClose(refs, resolve);
        showShelfPromptDialog(refs);
        refs.shelfPromptInput.focus();
    });
}

/**
 * Fallback shelf prompt when dialog interactions are unavailable.
 * @returns `null` because native prompt dialogs are disabled in this UI.
 */
function promptViaBrowser(): string | null {
    return null;
}

function isConfirmSubmitter(submitter: HTMLElement | null): boolean {
    if (!(submitter instanceof HTMLButtonElement)) {
        return false;
    }
    return submitter.value === DIALOG_CONFIRM_VALUE;
}

function hasPromptValue(refs: BookFormRefs): boolean {
    return refs.shelfPromptInput.value.trim() !== "";
}

function handlePromptValidationSubmit(
    refs: BookFormRefs,
    event: SubmitEvent,
): void {
    if (!isConfirmSubmitter(event.submitter)) {
        return;
    }
    if (hasPromptValue(refs)) {
        return;
    }
    event.preventDefault();
    refs.shelfPromptInput.focus();
}

/**
 * Prevents prompt confirmation when the user submits an empty shelf name.
 * @param refs - Form references containing shelf prompt dialog elements.
 */
export function ensurePromptValidation(refs: BookFormRefs): void {
    refs.shelfPromptForm.addEventListener("submit", (event) => {
        handlePromptValidationSubmit(refs, event);
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
