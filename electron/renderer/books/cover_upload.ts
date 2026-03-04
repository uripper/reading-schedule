import type { BookFormRefs } from "../../types/types.js";
import { getPlannerApi } from "../app/planner_api.js";
import { applyUploadedCover } from "./form_state.js";

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
 * @param fileName File name from upload input.
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
 * @param file Selected file from upload input.
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
 * @param refs Book form references containing the upload input.
 * @returns First selected file or `null` when none is selected.
 */
function selectedCoverFile(refs: BookFormRefs): File | null {
    const { files } = refs.coverUploadInput;
    if (!files || files.length <= 0) {
        return null;
    }
    return files[0];
}

/**
 * Reads a file as a data URL for planner cover upload transport.
 * @param file Cover image file to read.
 * @returns Data URL string produced by `FileReader`.
 */
async function readFileAsDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const READER = new FileReader();

        const ON_LOAD = (): void => {
            const { result } = READER;
            if (typeof result !== "string" || !result) {
                reject(new Error(ERROR_UPLOAD_FAILED));
                return;
            }

            const DATA_URL = result;
            resolve(DATA_URL);
        };

        const ON_ERROR = (): void => {
            reject(new Error(ERROR_UPLOAD_FAILED));
        };

        READER.addEventListener("load", ON_LOAD, { once: true });
        READER.addEventListener("error", ON_ERROR, { once: true });
        READER.readAsDataURL(file);
    });
}

/**
 * Opens the native file picker for the cover upload input.
 * @param refs Book form references containing the upload input.
 */
function triggerCoverPicker(refs: BookFormRefs): void {
    refs.coverUploadInput.click();
}

/**
 * Handles keyboard activation for the cover panel trigger.
 * @param event Keyboard event from the cover panel.
 * @param refs Book form references containing upload controls.
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
 * @param error Unknown error value from upload flow.
 * @returns Safe error message for the form metadata area.
 */
function uploadErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return ERROR_UPLOAD_FAILED;
}

/**
 * Clears file input value so selecting the same file can retrigger change.
 * @param refs Book form references containing upload controls.
 */
function clearCoverUploadInput(refs: BookFormRefs): void {
    const { coverUploadInput } = refs;
    coverUploadInput.value = "";
}

/**
 * Validates, uploads, and applies currently selected custom cover file.
 * @param refs Book form references containing upload and metadata controls.
 */
async function saveSelectedCover(refs: BookFormRefs): Promise<void> {
    const FILE = selectedCoverFile(refs);
    if (!FILE) {
        throw new Error(ERROR_MISSING_FILE);
    }
    if (!fileIsSupported(FILE)) {
        throw new Error(ERROR_UNSUPPORTED_FILE);
    }

    const DATA_URL = await readFileAsDataUrl(FILE);
    const LOCAL_COVER = await getPlannerApi().saveUploadedCover(
        DATA_URL,
        refs.bookId.value,
    );
    applyUploadedCover(refs, LOCAL_COVER, FILE.name);
}

/**
 * Runs cover upload flow and reports any user-facing error message.
 * @param refs Book form references containing upload and metadata controls.
 */
async function handleCoverUploadChange(refs: BookFormRefs): Promise<void> {
    const { lookupMeta } = refs;
    try {
        await saveSelectedCover(refs);
    } catch (error: unknown) {
        lookupMeta.textContent = uploadErrorMessage(error);
    } finally {
        clearCoverUploadInput(refs);
    }
}

/**
 * Binds click, keyboard, and file-change handlers for cover upload UX.
 * @param refs Book form references containing upload and panel controls.
 */
export function bindCoverUpload(refs: BookFormRefs): void {
    const { lookupMeta } = refs;
    const RUN_UPLOAD_CHANGE = (): void => {
        handleCoverUploadChange(refs).catch((error: unknown) => {
            lookupMeta.textContent = uploadErrorMessage(error);
            clearCoverUploadInput(refs);
        });
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
