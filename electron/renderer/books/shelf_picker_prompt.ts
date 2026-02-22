import type { BookFormRefs } from "./form_refs.js";

const DIALOG_CONFIRM_VALUE = "confirm";
const CREATE_SHELF_PROMPT = "Enter a name for the new shelf:";

/**
 * Shows the shelf-name dialog and resolves with a trimmed name on confirm.
 * @param refs Form references containing shelf prompt dialog elements.
 * @returns Trimmed shelf name, or null when the prompt is canceled.
 */
async function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
  return await new Promise((resolve) => {
    refs.shelfPromptInput.value = "";
    refs.shelfPromptDialog.returnValue = "";
    const onClose = () => {
      refs.shelfPromptDialog.removeEventListener("close", onClose);
      if (refs.shelfPromptDialog.returnValue !== DIALOG_CONFIRM_VALUE) {
        resolve(null);
        return;
      }
      resolve(refs.shelfPromptInput.value.trim());
    };
    refs.shelfPromptDialog.addEventListener("close", onClose);
    try {
      refs.shelfPromptDialog.showModal();
    } catch {
      refs.shelfPromptDialog.show();
    }
    refs.shelfPromptInput.focus();
  });
}

/**
 * Fallback shelf prompt using the browser's native prompt dialog.
 * @returns Trimmed shelf name, or null when canceled.
 */
function promptViaBrowser(): string | null {
  const response = globalThis.prompt(CREATE_SHELF_PROMPT, "");
  if (response === null) {
    return null;
  }
  return String(response).trim();
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
