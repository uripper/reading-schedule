/** Applies lookup metadata and staged upload previews to the book form. */
import type {
    BookFormRefs,
    BookLookupItem,
    ProgressSyncInputs,
} from "../../types/types.ts";
import {
    noteFromLookup,
    syncProgressAndPages,
} from "../book_lookup/helpers.ts";
import { releaseCoverUpload } from "./cover-upload-staging.ts";
import { setCoverPreview } from "./form-state-helpers.ts";
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
    releaseCoverUpload(FORM_REFS.coverLocal.value);
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
    if (FORM_REFS.pagesReadInput.value === "") {
        syncProgressAndPages(PROGRESS_SYNC_REFS, "progress");
        return;
    }
    syncProgressAndPages(PROGRESS_SYNC_REFS, "pages");
}

/**
 * Shows a staged cover and clears any transient upload error.
 * @param refs - Book form references to update.
 * @param localCoverPath - Planner-saved local cover path.
 */
export function applyUploadedCover(
    refs: BookFormRefs,
    localCoverPath: string,
): void {
    const FORM_REFS = refs;
    const NORMALIZED_PATH = String(localCoverPath).trim();
    if (!NORMALIZED_PATH) {
        throw new Error("Could not save the uploaded cover.");
    }
    releaseCoverUpload(FORM_REFS.coverLocal.value);
    FORM_REFS.coverLocal.value = NORMALIZED_PATH;
    FORM_REFS.coverUrl.value = "";

    FORM_REFS.lookupMeta.textContent =
        FORM_REFS.lookupMeta.dataset.lookupNote ?? "";
    setCoverPreview(FORM_REFS, NORMALIZED_PATH);
}
