/** Keeps an already-open edit form in sync with its completed background cover. */
import type { Book, BookFormRefs } from "../../types/types.ts";
import { setCoverPreview } from "./form-state-helpers.ts";

let activeForm: BookFormRefs | null = null;

/** Registers the existing library dialog without adding another UI surface. */
export function registerCoverForm(refs: BookFormRefs): void {
    activeForm = refs;
}

/** Preserves a completed cover when an unchanged pending-cover form is saved later. */
export function applyCompletedCoverToForm(
    expected: Book,
    completed: Book,
): void {
    const REFS = activeForm;
    if (REFS === null || !REFS.dialog.open) {
        return;
    }
    if (REFS.bookId.value !== expected.book_id) {
        return;
    }
    if (
        REFS.coverUrl.value !== expected.cover_url ||
        REFS.coverLocal.value !== expected.cover_local_path
    ) {
        return;
    }
    REFS.coverLocal.value = completed.cover_local_path;
    setCoverPreview(REFS, completed.cover_local_path);
}
