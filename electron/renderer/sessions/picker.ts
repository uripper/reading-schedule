
import { DEFAULT_PICKER_LIMIT } from "./constants.js";
import { clampIndex } from "./utils.js";

function optionId(index: any) {
  return `session-book-option-${index}`;
}

function matchesQuery(book: { title: any; author: any; }, query: string) {
  if (!query) {
    return true;
  }
  const search = query.toLowerCase();
  return [book.title, book.author].join(" ").toLowerCase().includes(search);
}

function renderPickerResults(refs: { results: { innerHTML: string; classList: { remove: (arg0: string) => void; add: (arg0: string) => void; }; replaceChildren: (arg0: any) => void; }; input: { setAttribute: (arg0: string, arg1: string) => void; removeAttribute: (arg0: string) => void; }; }, filteredBooks: any[], pickerIndex: number, selectBook: { (book: any): void; (arg0: any): any; }, setPickerIndex: { (index: any): void; (arg0: any): void; }) {
  refs.results.innerHTML = "";
  if (!filteredBooks.length) {
    refs.results.classList.remove("has-items");
    refs.input.setAttribute("aria-expanded", "false");
    refs.input.removeAttribute("aria-activedescendant");
    return;
  }

  const items = filteredBooks.slice(0, DEFAULT_PICKER_LIMIT).map((book: { book_id: string | undefined; title: string; deadline: any; author: any; }, index: any) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-result book-result-inline";
    btn.dataset.bookId = book.book_id;
    btn.id = optionId(index);
    btn.setAttribute("role", "option");

    const active = pickerIndex === index;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", "false");
    if (active) {
      btn.setAttribute("aria-selected", "true");
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
    btn.append(textWrap);
    btn.onclick = () => selectBook(book);
    btn.onmousemove = () => {
      setPickerIndex(index);
    };
    return btn;
  });

  refs.results.replaceChildren(...items);
  refs.results.classList.add("has-items");
  refs.input.setAttribute("aria-expanded", "true");
  if (pickerIndex >= 0) {
    refs.input.setAttribute("aria-activedescendant", optionId(pickerIndex));
  }
}

export function createPickerController(refs: { input: any; results: any; meta: any; timerDisplay?: HTMLElement | null; startBtn?: HTMLElement | null; pauseBtn?: HTMLElement | null; stopBtn?: HTMLElement | null; history?: HTMLElement | null; manualMinutes?: HTMLElement | null; manualPages?: HTMLElement | null; manualNotes?: HTMLElement | null; manualSaveBtn?: HTMLElement | null; }, getBooks: () => any[]) {
  let filteredBooks: string | any[] = [];
  let pickerIndex = -1;
  let selectedBookId = "";

  const selectedBook = () => {
    return getBooks().find((book: { book_id: string; }) => book.book_id === selectedBookId) || null;
  };

  const renderPicker = () => {
    renderPickerResults(refs, filteredBooks, pickerIndex, selectBook, (index: number) => {
      pickerIndex = index;
      renderPicker();
    });
  };

  const hidePicker = () => {
    filteredBooks = [];
    pickerIndex = -1;
    renderPicker();
  };

  const selectBook = (book: { book_id: string; title: any; author: any; }) => {
    if (!book) {
      selectedBookId = "";
      refs.input.value = "";
      refs.meta.textContent = "";
      return;
    }
    selectedBookId = book.book_id;
    refs.input.value = book.title;
    refs.meta.textContent = "Selected book";
    if (book.author) {
      refs.meta.textContent = `Selected: ${book.author}`;
    }
    hidePicker();
  };

  const refreshPicker = () => {
    const query = refs.input.value.trim().toLowerCase();
    filteredBooks = getBooks().filter((book: any) => matchesQuery(book, query));
    pickerIndex = -1;
    if (filteredBooks.length) {
      pickerIndex = 0;
    }
    renderPicker();
  };

  const onKeydown = (event: { key: string; preventDefault: () => void; }) => {
    if (event.key === "ArrowDown") {
      if (!filteredBooks.length) {
        refreshPicker();
      }
      if (!filteredBooks.length) {
        return;
      }
      event.preventDefault();
      pickerIndex = clampIndex(pickerIndex + 1, filteredBooks.length);
      renderPicker();
      return;
    }
    if (event.key === "ArrowUp") {
      if (!filteredBooks.length) {
        return;
      }
      event.preventDefault();
      pickerIndex = clampIndex(pickerIndex - 1, filteredBooks.length);
      renderPicker();
      return;
    }
    if (event.key === "Enter") {
      if (pickerIndex < 0 || !filteredBooks.length) {
        return;
      }
      event.preventDefault();
      selectBook(filteredBooks[pickerIndex]);
      return;
    }
    if (event.key === "Escape") {
      hidePicker();
      refs.input.blur();
    }
  };

  const onDocumentClick = (event: { target: any; }) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (event.target === refs.input || refs.results.contains(event.target)) {
      return;
    }
    hidePicker();
  };

  const bind = () => {
    refs.input.addEventListener("input", refreshPicker);
    refs.input.addEventListener("focus", refreshPicker);
    refs.input.addEventListener("keydown", onKeydown);
    document.addEventListener("click", onDocumentClick);
  };

  const selectBookById = (bookId: any) => {
    const book = getBooks().find((row: { book_id: any; }) => row.book_id === bookId) || null;
    if (!book) {
      return;
    }
    selectBook(book);
  };

  return {
    selectedBook,
    refreshPicker,
    selectBookById,
    bind,
  };
}
