import type { BookFormRefs } from "../../types/types_books.js";

const DIALOG_CONFIRM_VALUE = "confirm";

/**
 * Shows the shelf-name dialog and resolves with a trimmed name on confirm.
 * @param refs Form references containing shelf prompt dialog elements.
 * @returns Trimmed shelf name, or null when the prompt is canceled.
 */
async function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
  const dialogRefs = refs;
  return await new Promise((resolve) => {
    dialogRefs.shelfPromptInput.value = "";
    dialogRefs.shelfPromptDialog.returnValue = "";
    const onClose = (): void => {
      dialogRefs.shelfPromptDialog.removeEventListener("close", onClose);
      if (dialogRefs.shelfPromptDialog.returnValue !== DIALOG_CONFIRM_VALUE) {
        resolve(null);
        return;
      }
      resolve(dialogRefs.shelfPromptInput.value.trim());
    };
    dialogRefs.shelfPromptDialog.addEventListener("close", onClose);
    try {
      dialogRefs.shelfPromptDialog.showModal();
    } catch {
      dialogRefs.shelfPromptDialog.show();
    }
    dialogRefs.shelfPromptInput.focus();
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
 * @param refs Form references containing shelf prompt dialog elements.
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
 * @param refs Form references containing shelf prompt dialog elements.
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
