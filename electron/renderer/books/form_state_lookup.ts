import type {
    BookFormRefs,
    BookLookupItem,
    ProgressSyncInputs,
} from "../../types/types.js";
import { noteFromLookup, syncProgressAndPages } from "../book_lookup.js";
import { CUSTOM_COVER_NOTE, setCoverPreview } from "./form_state_helpers.js";
import { toOptionalInt } from "./utils.js";

/**
 * Applies a positive lookup estimate to an input only when current value is missing.
 * @param input Target numeric input to update.
 * @param estimate Lookup-provided numeric estimate.
 */
function applyEstimateWhenMissing(
    input: HTMLInputElement,
    estimate: number | undefined,
): void {
    const targetInput = input;
    const currentValue = toOptionalInt(targetInput.value);
    if (typeof currentValue === "number" && currentValue > 0) {
        return;
    }
    if (typeof estimate !== "number" || estimate <= 0) {
        return;
    }
    targetInput.value = String(estimate);
}

/**
 * Applies a selected lookup result into editable form fields.
 * @param refs Book form references to update.
 * @param item Lookup result chosen by the user.
 */
export function applyLookupItem(
    refs: BookFormRefs,
    item: BookLookupItem,
): void {
    const formRefs = refs;
    formRefs.titleInput.value = item.title ?? formRefs.titleInput.value;
    formRefs.searchInput.value = item.title ?? formRefs.searchInput.value;
    formRefs.author.value = item.author ?? formRefs.author.value;
    formRefs.coverUrl.value = item.cover_url ?? "";
    formRefs.coverLocal.value = "";

    applyEstimateWhenMissing(formRefs.wordsInput, item.words_estimate);
    applyEstimateWhenMissing(formRefs.pagesTotalInput, item.pages_estimate);

    const lookupNote = noteFromLookup(item);
    formRefs.lookupMeta.dataset.lookupNote = lookupNote;
    formRefs.lookupMeta.textContent = lookupNote;
    setCoverPreview(formRefs, item.cover_url ?? "");

    const progressSyncRefs: ProgressSyncInputs = {
        pagesTotalInput: formRefs.pagesTotalInput,
        pagesReadInput: formRefs.pagesReadInput,
        progressInput: formRefs.progressInput,
    };
    syncProgressAndPages(progressSyncRefs, "pages");
}

/**
 * Applies uploaded local cover metadata and updates preview/note fields.
 * @param refs Book form references to update.
 * @param localCoverPath Planner-saved local cover path.
 * @param fileName Optional original file name for display note.
 */
export function applyUploadedCover(
    refs: BookFormRefs,
    localCoverPath: string,
    fileName = "",
): void {
    const formRefs = refs;
    const normalizedPath = String(localCoverPath).trim();
    if (!normalizedPath) {
        throw new Error("Could not save the uploaded cover.");
    }
    formRefs.coverLocal.value = normalizedPath;
    formRefs.coverUrl.value = "";

    let note = CUSTOM_COVER_NOTE;
    const normalizedFileName = String(fileName).trim();
    if (normalizedFileName) {
        note = `${CUSTOM_COVER_NOTE} ${normalizedFileName}`;
    }

    formRefs.lookupMeta.dataset.lookupNote = note;
    formRefs.lookupMeta.textContent = note;
    setCoverPreview(formRefs, normalizedPath);
}
