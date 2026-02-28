import type { BookFormRefs, ProgressSyncRefs } from "../../types/types.js";
import { syncProgressAndPages } from "../book_lookup.js";
import { syncFinishedAtField } from "./form_state.js";

/**
 * Binds cross-field progress synchronization handlers for dialog inputs.
 * @param syncRefs Input refs used by progress/pages sync helper.
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
 * @param refs Book form references for the active dialog.
 */
export function bindBookDialogProgressSync(refs: BookFormRefs): void {
	bindProgressSyncHandlers({
		pagesTotalInput: refs.pagesTotalInput,
		pagesReadInput: refs.pagesReadInput,
		progressInput: refs.progressInput,
	});
	refs.statusSelectInput.addEventListener("change", () => {
		syncFinishedAtField(refs);
	});
}
