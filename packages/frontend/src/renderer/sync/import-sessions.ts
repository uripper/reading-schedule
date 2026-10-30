/** Validates optional reading time and delegates atomic session staging to the host. */
import type {
    Book,
    SyncImportChoice,
    SyncImportStore,
} from "@reading-schedule/contracts";
import { SYNC_SESSION_MINUTES_SCHEMA } from "@reading-schedule/contracts";
import { isSyncRecordImported } from "./model.ts";

/** Reconfirming an existing source association must not count the same reading twice. */
function newSessionChoices(
    books: readonly Book[],
    choices: readonly SyncImportChoice[],
): SyncImportChoice[] {
    return choices.filter((choice) => {
        if (choice.sessionMinutes === undefined) {
            return false;
        }
        const BOOK = books.find((book) => book.book_id === choice.bookId);
        return BOOK !== undefined && !isSyncRecordImported(choice.record, BOOK);
    });
}

/** No session state needs restoring for an ordinary progress-only import. */
export function noSessionChanges(): void {
    // Progress-only imports have no staged sessions.
}

/** Only accepted choices may add sessions, and hosts must support recording them. */
export function stageImportSessions(
    store: SyncImportStore,
    before: readonly Book[],
    choices: readonly SyncImportChoice[],
): () => void {
    const SESSIONS = newSessionChoices(before, choices);
    if (SESSIONS.length === 0) {
        return noSessionChanges;
    }
    for (const CHOICE of SESSIONS) {
        if (
            !SYNC_SESSION_MINUTES_SCHEMA.safeParse(CHOICE.sessionMinutes)
                .success
        ) {
            throw new Error(
                `Enter valid whole minutes for “${CHOICE.record.title}” before syncing.`,
            );
        }
    }
    if (store.stageSessions === undefined) {
        throw new Error(
            "Reading sessions are unavailable on this device. Uncheck Add session to today and retry.",
        );
    }
    return store.stageSessions(SESSIONS);
}
