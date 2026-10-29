/** Connects the ranked match selector to a real full-library search dropdown. */
import type { Book, KoboReviewEntry } from "@reading-schedule/contracts";
import { koboElement } from "./dom.ts";
import { createKoboLibrarySearch } from "./library-search.ts";

/** Gives each option enough detail to distinguish duplicate editions. */
function bookOption(book: Book): HTMLOptionElement {
    return new Option(
        `${book.title} — ${book.author || "Unknown author"} · ${book.shelf || "No shelf"} · ${book.progress_percent}% read`,
        book.book_id,
    );
}

/** Selects a searched or newly added book without dumping search results into the selector. */
function selectBook(
    select: HTMLSelectElement,
    library: Book[],
    book: Book,
): void {
    const SELECT = select;
    if (!library.some((candidate) => candidate.book_id === book.book_id)) {
        library.push(book);
    }
    if (
        ![...SELECT.querySelectorAll<HTMLOptionElement>("option")].some(
            (option) => option.value === book.book_id,
        )
    ) {
        SELECT.append(bookOption(book));
    }
    SELECT.value = book.book_id;
    SELECT.dispatchEvent(new Event("change"));
}

/** Starts with the highest ranked option, retaining all candidate choices. */
function matchSelect(entry: KoboReviewEntry): HTMLSelectElement {
    const SELECT = koboElement("select");
    SELECT.setAttribute(
        "aria-label",
        `Library match for ${entry.record.title}`,
    );
    SELECT.append(new Option("Choose a library book…", ""));
    SELECT.append(...entry.matches.map(bookOption));
    SELECT.value = entry.suggestedBookId ?? entry.matches[0]?.book_id ?? "";
    return SELECT;
}

/** Keeps a live row-local library so the add-book flow can immediately select its result. */
export function createKoboMatchPicker(
    entry: KoboReviewEntry,
    books: readonly Book[],
) {
    const LIBRARY = [...books];
    const SELECT = matchSelect(entry);
    const SEARCH = createKoboLibrarySearch({
        getBooks: () => LIBRARY,
        onPick: (book) => {
            selectBook(SELECT, LIBRARY, book);
        },
        title: entry.record.title,
    });
    SEARCH.input.addEventListener("input", () => {
        SELECT.dispatchEvent(new Event("change"));
    });
    return {
        addBook: (book: Book): void => {
            selectBook(SELECT, LIBRARY, book);
        },
        search: SEARCH.element,
        searchInput: SEARCH.input,
        searchResults: SEARCH.results,
        select: SELECT,
        selectedBook: (): Book | undefined =>
            LIBRARY.find((book) => book.book_id === SELECT.value),
    };
}
