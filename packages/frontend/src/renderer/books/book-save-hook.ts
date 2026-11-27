/** Lets other features react after the book dialog commits a save. */
import type {
    BookDialogSubmitPayload,
    BookSaveHook,
} from "../../types/types.ts";

let saveHook: BookSaveHook | null = null;

/** Registers the single post-save hook (for example workspace transfers). */
export function setBookSaveHook(hook: BookSaveHook | null): void {
    saveHook = hook;
}

/** Runs the post-save hook after the library already holds the saved books. */
export function notifyBookSaved(payload: BookDialogSubmitPayload): void {
    saveHook?.(payload);
}
