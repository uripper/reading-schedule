/** Lets users paste a clipboard image into the book dialog as a custom cover. */
import type { BookFormRefs } from "../../types/types.ts";
import { stageCoverFile, uploadErrorMessage } from "./cover-upload.ts";

const PASTED_COVER_NAME = "Pasted image";
const ERROR_NO_CLIPBOARD_IMAGE = "Clipboard has no image to use as a cover.";
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable]";
const FILE_ITEM_KIND = "file";

// audit-allow-local-types: This shape is private paste-target narrowing.
type ClosestTarget = EventTarget & Pick<Element, "closest">;

/**
 * Finds the first file carried by clipboard data.
 * @param data - Clipboard payload from the paste event.
 * @returns First pasted file, or `null` when the clipboard holds no file.
 */
function clipboardFile(data: DataTransfer | null): File | null {
    if (data === null) {
        return null;
    }
    const FROM_FILES = data.files.item(0);
    if (FROM_FILES !== null) {
        return FROM_FILES;
    }
    for (const ITEM of Array.from(data.items)) {
        if (ITEM.kind === FILE_ITEM_KIND) {
            return ITEM.getAsFile();
        }
    }
    return null;
}

/**
 * Checks whether an event target supports `closest` lookups.
 * @param target - Paste event target.
 * @returns `true` when the target behaves like a DOM element.
 */
function hasClosest(target: EventTarget | null): target is ClosestTarget {
    if (target === null) {
        return false;
    }
    return typeof (target as Partial<ClosestTarget>).closest === "function";
}

/**
 * Checks whether paste landed in a text-editable control.
 * @param target - Paste event target.
 * @returns `true` when the browser should keep its normal text paste.
 */
function pasteTargetIsEditable(target: EventTarget | null): boolean {
    if (!hasClosest(target)) {
        return false;
    }
    return target.closest(EDITABLE_SELECTOR) !== null;
}

/**
 * Stages a pasted file as the custom cover and reports validation failures.
 * @param refs - Book form references containing cover and metadata controls.
 * @param file - File taken from the clipboard.
 */
function stagePastedCover(refs: BookFormRefs, file: File): void {
    const { lookupMeta } = refs;
    try {
        stageCoverFile(refs, file, file.name || PASTED_COVER_NAME);
    } catch (error: unknown) {
        lookupMeta.textContent = uploadErrorMessage(error);
    }
}

/**
 * Reports a paste without an image unless it targeted a text field.
 * @param event - Paste event raised inside the book dialog.
 * @param refs - Book form references containing the metadata area.
 */
function reportMissingClipboardImage(
    event: ClipboardEvent,
    refs: BookFormRefs,
): void {
    if (pasteTargetIsEditable(event.target)) {
        return;
    }
    const { lookupMeta } = refs;
    lookupMeta.textContent = ERROR_NO_CLIPBOARD_IMAGE;
}

/**
 * Applies a pasted image as the custom cover or reports why it cannot.
 * @param event - Paste event raised inside the book dialog.
 * @param refs - Book form references containing cover and metadata controls.
 */
function handleCoverPaste(event: ClipboardEvent, refs: BookFormRefs): void {
    if (refs.coverUploadInput.disabled) {
        return;
    }
    const FILE = clipboardFile(event.clipboardData);
    if (FILE === null) {
        reportMissingClipboardImage(event, refs);
        return;
    }
    event.preventDefault();
    stagePastedCover(refs, FILE);
}

/**
 * Binds clipboard paste handling so `Ctrl+V` in the book dialog sets the cover.
 * Text pastes into form fields keep their default behavior.
 * @param refs - Book form references containing the dialog and cover controls.
 */
export function bindCoverPaste(refs: BookFormRefs): void {
    refs.dialog.addEventListener("paste", (event) => {
        handleCoverPaste(event, refs);
    });
}
