import type { BookFormRefs, ProgressSyncRefs } from "../../types/types.ts";
import { syncProgressAndPages } from "../book_lookup/helpers.ts";
import { syncFinishedAtField } from "./form-state.ts";

/**
 * Binds cross-field progress synchronization handlers for dialog inputs.
 * @param syncRefs - Input refs used by progress/pages sync helper.
 */
function bindProgressSyncHandlers(syncRefs: ProgressSyncRefs): void {
    syncRefs.pagesTotalInput.addEventListener("input", () => {
        syncProgressAndPages(syncRefs, "pages");
    });
    syncRefs.pagesReadInput.addEventListener("input", () => {
        syncProgressAndPages(syncRefs, "pages");
    });
    syncRefs.progressInput.addEventListener("input", () => {
        syncProgressAndPages(syncRefs, "progress");
    });
}

/**
 * Wires progress and status-dependent field synchronization for book dialog.
 * @param refs - Book form references for the active dialog.
 */
export function bindBookDialogProgressSync(refs: BookFormRefs): void {
    bindProgressSyncHandlers({
        pagesReadInput: refs.pagesReadInput,
        pagesTotalInput: refs.pagesTotalInput,
        progressInput: refs.progressInput,
    });
    refs.statusSelectInput.addEventListener("change", () => {
        syncFinishedAtField(refs);
    });
}
