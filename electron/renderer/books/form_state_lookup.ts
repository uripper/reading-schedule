import type {
    BookFormRefs,
    BookLookupItem,
    ProgressSyncInputs,
} from "../../types/types.ts";
import { noteFromLookup, syncProgressAndPages } from "../book_lookup.ts";
import { CUSTOM_COVER_NOTE, setCoverPreview } from "./form_state_helpers.ts";
import { toOptionalInt } from "./utils.ts";

/**
 * Applies a positive lookup estimate to an input only when current value is missing.
 * @param input - Target numeric input to update.
 * @param estimate - Lookup-provided numeric estimate.
 */
function applyEstimateWhenMissing(
    input: HTMLInputElement,
    estimate: number | undefined,
): void {
    const TARGET_INPUT = input;
    const CURRENT_VALUE = toOptionalInt(TARGET_INPUT.value);
    if (typeof CURRENT_VALUE === "number" && CURRENT_VALUE > 0) {
        return;
    }
    if (typeof estimate !== "number" || estimate <= 0) {
        return;
    }
    TARGET_INPUT.value = String(estimate);
}

/**
 * Applies a selected lookup result into editable form fields.
 * @param refs - Book form references to update.
 * @param item - Lookup result chosen by the user.
 */
export function applyLookupItem(
    refs: BookFormRefs,
    item: BookLookupItem,
): void {
    const FORM_REFS = refs;
    FORM_REFS.titleInput.value = item.title ?? FORM_REFS.titleInput.value;
    FORM_REFS.searchInput.value = item.title ?? FORM_REFS.searchInput.value;
    FORM_REFS.author.value = item.author ?? FORM_REFS.author.value;
    FORM_REFS.coverUrl.value = item.cover_url ?? "";
    FORM_REFS.coverLocal.value = "";

    applyEstimateWhenMissing(FORM_REFS.wordsInput, item.words_estimate);
    applyEstimateWhenMissing(FORM_REFS.pagesTotalInput, item.pages_estimate);

    const LOOKUP_NOTE = noteFromLookup(item);
    FORM_REFS.lookupMeta.dataset.lookupNote = LOOKUP_NOTE;
    FORM_REFS.lookupMeta.textContent = LOOKUP_NOTE;
    setCoverPreview(FORM_REFS, item.cover_url ?? "");

    const PROGRESS_SYNC_REFS: ProgressSyncInputs = {
        pagesReadInput: FORM_REFS.pagesReadInput,
        pagesTotalInput: FORM_REFS.pagesTotalInput,
        progressInput: FORM_REFS.progressInput,
    };
    syncProgressAndPages(PROGRESS_SYNC_REFS, "pages");
}

/**
 * Applies uploaded local cover metadata and updates preview/note fields.
 * @param refs - Book form references to update.
 * @param localCoverPath - Planner-saved local cover path.
 * @param fileName - Optional original file name for display note.
 */
export function applyUploadedCover(
    refs: BookFormRefs,
    localCoverPath: string,
    fileName = "",
): void {
    const FORM_REFS = refs;
    const NORMALIZED_PATH = String(localCoverPath).trim();
    if (!NORMALIZED_PATH) {
        throw new Error("Could not save the uploaded cover.");
    }
    FORM_REFS.coverLocal.value = NORMALIZED_PATH;
    FORM_REFS.coverUrl.value = "";

    let note = CUSTOM_COVER_NOTE;
    const NORMALIZED_FILE_NAME = String(fileName).trim();
    if (NORMALIZED_FILE_NAME) {
        note = `${CUSTOM_COVER_NOTE} ${NORMALIZED_FILE_NAME}`;
    }

    FORM_REFS.lookupMeta.dataset.lookupNote = note;
    FORM_REFS.lookupMeta.textContent = note;
    setCoverPreview(FORM_REFS, NORMALIZED_PATH);
}
