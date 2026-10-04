/** Adapts the shared UI for features supported by the first browser demo. */

/** Hides native-only actions before initializing the shared frontend. */
export function configureDemoFeatures(): void {
    hideElement("helpDialogDataActions");
    hideElement("bookSearchInput", "label[for='bookSearchInput']");
    disableInput("bookCoverUploadInput");
    disableInput("reminderEnabledToggle");
    const COVER = globalThis.document.getElementById("bookCoverPanel");
    if (COVER instanceof HTMLButtonElement) {
        COVER.disabled = true;
    }
    const HINT = globalThis.document.querySelector(".book-cover-upload-hint");
    if (HINT) {
        HINT.textContent = "Cover uploads are available in the desktop app.";
    }
}

/** Removes unavailable controls without maintaining a second shared UI. */
function hideElement(id: string, relatedSelector?: string): void {
    const ELEMENT = globalThis.document.getElementById(id);
    if (ELEMENT) {
        ELEMENT.hidden = true;
    }
    const RELATED = globalThis.document.querySelector(
        relatedSelector ?? `#${id}`,
    );
    if (RELATED instanceof HTMLElement) {
        RELATED.hidden = true;
    }
}

/** Prevents native-only settings from offering an unusable interaction. */
function disableInput(id: string): void {
    const ELEMENT = globalThis.document.getElementById(id);
    if (ELEMENT instanceof HTMLInputElement) {
        ELEMENT.disabled = true;
        ELEMENT.title = "Available in the desktop app.";
    }
}
