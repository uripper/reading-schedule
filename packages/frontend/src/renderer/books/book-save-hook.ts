/** Lets other features check and react to book dialog saves. */
import type {
    BookDialogSubmitPayload,
    BookSaveHook,
} from "../../types/types.ts";

let saveHook: BookSaveHook | null = null;
let savePreparer: BookSaveHook | null = null;

/** Registers the single post-save hook (for example workspace transfers). */
export function setBookSaveHook(hook: BookSaveHook | null): void {
    saveHook = hook;
}

/** Registers a check that runs before a save; throwing keeps the dialog open. */
export function setBookSavePreparer(preparer: BookSaveHook | null): void {
    savePreparer = preparer;
}

/** Runs the pre-save check and returns the payload to save. */
export function prepareBookSave(
    payload: BookDialogSubmitPayload,
): BookDialogSubmitPayload {
    savePreparer?.(payload);
    return payload;
}

/** Runs the post-save hook after the library already holds the saved books. */
export function notifyBookSaved(payload: BookDialogSubmitPayload): void {
    saveHook?.(payload);
}
