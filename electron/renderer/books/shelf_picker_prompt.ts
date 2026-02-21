import type { BookFormRefs } from "./form_refs.js";

const DIALOG_CONFIRM_VALUE = "confirm";
const CREATE_SHELF_PROMPT = "Enter a name for the new shelf:";

function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
  return new Promise((resolve) => {
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

function promptViaBrowser(): string | null {
  const response = globalThis.prompt(CREATE_SHELF_PROMPT, "");
  if (response === null) {
    return null;
  }
  return String(response).trim();
}

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

export async function promptForShelfName(
  refs: BookFormRefs,
): Promise<string | null> {
  try {
    return await promptViaDialog(refs);
  } catch {
    return promptViaBrowser();
  }
}
