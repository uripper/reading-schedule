
import { uid } from "../dom.js";
import { MS_PER_MINUTE } from "./constants.js";
import { toInt } from "./utils.js";

export function createManualSessionSaver(refs: { input: any; results?: HTMLElement | null; meta?: HTMLElement | null; timerDisplay?: HTMLElement | null; startBtn?: HTMLElement | null; pauseBtn?: HTMLElement | null; stopBtn?: HTMLElement | null; history?: HTMLElement | null; manualMinutes: any; manualPages: any; manualNotes: any; manualSaveBtn?: HTMLElement | null; }, selectedBook: { (): any; (): any; }, commitSession: { (sessionInput: any): void; (arg0: { minutes: number; id: string; book_id: any; title: any; started_at: string; ended_at: string; pages_read: number | null; notes: any; source: string; created_at: string; }): void; }, announce: (arg0: string, arg1: string | undefined) => void, setStatus: (arg0: string, arg1: boolean | undefined) => void) {
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
    let pagesRead = null;
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
