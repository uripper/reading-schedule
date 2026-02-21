import { DEFAULT_PICKER_LIMIT } from "./constants.js";
import type { SessionRefs } from "./refs.js";
import type { Book } from "../books/types.js";

export type PickerBook = Pick<Book, "book_id" | "title" | "author" | "deadline">;

function optionId(index: number): string {
  return `session-book-option-${index}`;
}

export function matchesPickerQuery(book: PickerBook, query: string): boolean {
  if (!query) {
    return true;
  }
  const search = query.toLowerCase();
  return [book.title, book.author].join(" ").toLowerCase().includes(search);
}

export function renderPickerResults(
  refs: SessionRefs,
  filteredBooks: PickerBook[],
  pickerIndex: number,
  selectBook: (book: PickerBook) => void,
  setPickerIndex: (index: number) => void,
): void {
  refs.results.innerHTML = "";
  if (!filteredBooks.length) {
    refs.results.classList.remove("has-items");
    refs.input.setAttribute("aria-expanded", "false");
    refs.input.removeAttribute("aria-activedescendant");
    return;
  }
  const items = filteredBooks.slice(0, DEFAULT_PICKER_LIMIT).map((book, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-result book-result-inline";
    button.dataset.bookId = book.book_id;
    button.id = optionId(index);
    button.setAttribute("role", "option");
    const active = pickerIndex === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", "false");
    if (active) {
      button.setAttribute("aria-selected", "true");
    }
    const textWrap = document.createElement("span");
    const title = document.createElement("span");
    title.className = "book-result-title";
    title.textContent = book.title || "Untitled";
    const meta = document.createElement("span");
    meta.className = "book-result-meta";
    let dueLabel = "";
    if (book.deadline) {
      dueLabel = `Due ${book.deadline}`;
    }
    meta.textContent = [book.author || "", dueLabel].filter(Boolean).join(" · ");
    textWrap.append(title, meta);
    button.append(textWrap);
    button.onclick = () => selectBook(book);
    button.onmousemove = () => setPickerIndex(index);
    return button;
  });
  refs.results.replaceChildren(...items);
  refs.results.classList.add("has-items");
  refs.input.setAttribute("aria-expanded", "true");
  if (pickerIndex >= 0) {
    refs.input.setAttribute("aria-activedescendant", optionId(pickerIndex));
  }
}
