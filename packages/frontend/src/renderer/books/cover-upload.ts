/** Validates cover images and stages a transient preview for background processing. */
import type { BookFormRefs } from "../../types/types.ts";
import { registerCoverForm } from "./cover-form-sync.ts";
import {
    releaseCoverUpload,
    stageCoverUpload,
} from "./cover-upload-staging.ts";
import { applyUploadedCover } from "./form-state-lookup.ts";

const COVER_MIME_PNG = "image/png";
const COVER_MIME_JPEG = "image/jpeg";
const COVER_MIME_WEBP = "image/webp";
const COVER_EXTENSION_PNG = ".png";
const COVER_EXTENSION_JPG = ".jpg";
const COVER_EXTENSION_JPEG = ".jpeg";
const COVER_EXTENSION_WEBP = ".webp";
const KEY_ENTER = "Enter";
const KEY_SPACE = " ";
const ERROR_MISSING_FILE = "Select an image file to upload.";
const ERROR_UNSUPPORTED_FILE = "Use a PNG, JPG, or WEBP image.";
const ERROR_UPLOAD_FAILED = "Could not upload this cover image.";

/**
 * Checks whether a file name ends with a supported cover image extension.
 * @param fileName - File name from upload input.
 * @returns `true` when extension is PNG/JPG/JPEG/WEBP.
 */
function fileNameHasSupportedExtension(fileName: string): boolean {
    const LOWER_NAME = String(fileName || "")
        .trim()
        .toLowerCase();
    if (LOWER_NAME.endsWith(COVER_EXTENSION_PNG)) {
        return true;
    }
    if (LOWER_NAME.endsWith(COVER_EXTENSION_JPG)) {
        return true;
    }
    if (LOWER_NAME.endsWith(COVER_EXTENSION_JPEG)) {
        return true;
    }
    if (LOWER_NAME.endsWith(COVER_EXTENSION_WEBP)) {
        return true;
    }
    return false;
}

/**
 * Validates uploaded cover files by mime type or extension fallback.
 * @param file - Selected file from upload input.
 * @returns `true` when the file can be treated as a supported image.
 */
function fileIsSupported(file: File): boolean {
    const MIME_TYPE = String(file.type || "")
        .trim()
        .toLowerCase();
    if (
        MIME_TYPE === COVER_MIME_PNG ||
        MIME_TYPE === COVER_MIME_JPEG ||
        MIME_TYPE === COVER_MIME_WEBP
    ) {
        return true;
    }
    if (!MIME_TYPE) {
        return fileNameHasSupportedExtension(file.name);
    }
    return false;
}

/**
 * Returns the currently selected cover file from the file input.
 * @param refs - Book form references containing the upload input.
 * @returns First selected file or `null` when none is selected.
 */
function selectedCoverFile(refs: BookFormRefs): File | null {
    const { files } = refs.coverUploadInput;
    if (!files || files.length <= 0) {
        return null;
    }
    return files.item(0);
}

/**
 * Opens the native file picker for the cover upload input.
 * @param refs - Book form references containing the upload input.
 */
function triggerCoverPicker(refs: BookFormRefs): void {
    refs.coverUploadInput.click();
}

/**
 * Handles keyboard activation for the cover panel trigger.
 * @param event - Keyboard event from the cover panel.
 * @param refs - Book form references containing upload controls.
 */
function onCoverPanelKeydown(event: KeyboardEvent, refs: BookFormRefs): void {
    if (event.key !== KEY_ENTER && event.key !== KEY_SPACE) {
        return;
    }
    event.preventDefault();
    triggerCoverPicker(refs);
}

/**
 * Normalizes unknown upload failures into user-visible message text.
 * @param error - Unknown error value from upload flow.
 * @returns Safe error message for the form metadata area.
 */
export function uploadErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return ERROR_UPLOAD_FAILED;
}

/**
 * Clears file input value so selecting the same file can retrigger change.
 * @param refs - Book form references containing upload controls.
 */
function clearCoverUploadInput(refs: BookFormRefs): void {
    const { coverUploadInput } = refs;
    coverUploadInput.value = "";
}

/**
 * Validates and stages a cover image; save starts native cover processing.
 * Shared by file selection and clipboard paste.
 * @param refs - Book form references containing upload and metadata controls.
 * @param file - Candidate cover image, or `null` when none was provided.
 */
export function stageCoverFile(refs: BookFormRefs, file: File | null): void {
    if (!file) {
        throw new Error(ERROR_MISSING_FILE);
    }
    if (!fileIsSupported(file)) {
        throw new Error(ERROR_UNSUPPORTED_FILE);
    }
    applyUploadedCover(refs, stageCoverUpload(file));
}

/**
 * Runs cover upload flow and reports any user-facing error message.
 * @param refs - Book form references containing upload and metadata controls.
 */
function handleCoverUploadChange(refs: BookFormRefs): void {
    const { lookupMeta } = refs;
    try {
        stageCoverFile(refs, selectedCoverFile(refs));
    } catch (error: unknown) {
        lookupMeta.textContent = uploadErrorMessage(error);
    } finally {
        clearCoverUploadInput(refs);
    }
}

/**
 * Binds click, keyboard, and file-change handlers for cover upload UX.
 * @param refs - Book form references containing upload and panel controls.
 */
export function bindCoverUpload(refs: BookFormRefs): void {
    registerCoverForm(refs);
    refs.dialog.addEventListener("close", () => {
        releaseCoverUpload(refs.coverLocal.value);
    });
    const RUN_UPLOAD_CHANGE = (): void => {
        handleCoverUploadChange(refs);
    };

    refs.coverPanel.addEventListener("click", (event) => {
        event.preventDefault();
        triggerCoverPicker(refs);
    });
    refs.coverPanel.addEventListener("keydown", (event) => {
        onCoverPanelKeydown(event, refs);
    });
    refs.coverUploadInput.addEventListener("change", () => {
        RUN_UPLOAD_CHANGE();
    });
}
