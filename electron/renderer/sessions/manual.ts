import { uid } from "../dom.js";
import { MS_PER_MINUTE } from "./constants.js";
import type { Session } from "./normalize.js";
import type { SessionRefs } from "./refs.js";
import { toInt } from "./utils.js";

type SessionBook = {
  book_id: string;
  title: string;
};

type CommitSession = (
  sessionInput: Omit<Partial<Session>, "source" | "pages_read"> & {
    endedAt?: string;
    startedAt?: string;
    pages_read?: number | string | null;
    source?: string;
  },
) => void;

type Announce = (message: string, politeness?: string) => void;
type SetStatus = (message: string, isError?: boolean) => void;

export function createManualSessionSaver(
  refs: SessionRefs,
  selectedBook: () => SessionBook | null,
  commitSession: CommitSession,
  announce: Announce,
  setStatus: SetStatus,
): () => void {
  return () => {
    const minutes = Math.max(0, toInt(refs.manualMinutes.value, 0));
    if (minutes <= 0) {
      refs.manualMinutes.focus();
      setStatus("Manual session requires minutes.", true);
      announce("Minutes is required for manual session.", "assertive");
      return;
    }

    const book = selectedBook();
    if (!book) {
      refs.input.focus();
      setStatus("Pick a book before saving a session.", true);
      announce("Pick a book before saving a session.", "assertive");
      return;
    }

    const now = Date.now();
    const endedAt = new Date(now).toISOString();
    const startedAt = new Date(now - minutes * MS_PER_MINUTE).toISOString();

    const pages = refs.manualPages.value.trim();
    let pagesRead: number | null = null;
    if (pages) {
      pagesRead = Math.max(0, toInt(pages, 0));
    }

    commitSession({
      minutes,
      id: uid(),
      book_id: book.book_id,
      title: book.title,
      started_at: startedAt,
      ended_at: endedAt,
      pages_read: pagesRead,
      notes: refs.manualNotes.value.trim(),
      source: "manual",
      created_at: endedAt,
    });

    refs.manualMinutes.value = "";
    refs.manualPages.value = "";
    refs.manualNotes.value = "";
    announce(`Saved manual ${minutes} minute session.`);
    setStatus("Manual session saved.");
  };
}
