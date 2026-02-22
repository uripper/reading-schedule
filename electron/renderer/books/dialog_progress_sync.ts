import { syncProgressAndPages } from "../book_lookup.js";
import { syncFinishedAtField } from "./form_state.js";
import type { BookFormRefs } from "./form_refs.js";

type ProgressSyncRefs = {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
};

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
