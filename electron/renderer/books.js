import { el, qa, uid } from "./dom.js";
import { bindBookLookup } from "./book_lookup.js";

function rowTemplate(book) {
  return `<td><input value="${book.title || ""}" placeholder="Book title"><div class="lookup-meta">${book.lookup_note || ""}</div></td>
<td><input type="number" min="1" value="${book.words_total || 0}"></td>
<td><input type="number" min="0" max="100" step="1" value="${book.progress_percent ?? 0}"></td>
<td><input type="number" min="1" max="5" value="${book.priority || 3}"></td>
<td><input type="number" min="1" max="10" value="${book.difficulty || 3}"></td>
<td><input type="number" min="1" value="${book.min_blocks_per_session || 1}"></td>
<td><input type="number" min="1" value="${book.max_minutes_per_day || ""}"></td>
<td><input type="date" value="${book.deadline || ""}"></td>
<td><button class="btn rm-btn" aria-label="Remove book">Remove</button></td>`;
}

export function addBookRow(book = {}) {
  const tr = document.createElement("tr");
  tr.dataset.bookId = book.book_id || uid();
  tr.innerHTML = rowTemplate(book);
  tr.querySelector("button").onclick = () => tr.remove();
  bindBookLookup(tr, book);
  el("booksBody").appendChild(tr);
}

export function fillBooks(books) {
  el("booksBody").innerHTML = "";
  (books || []).forEach((book) => addBookRow(book));
}

export function collectBooks() {
  return qa("#booksBody tr")
    .map((tr) => {
      const [title, words, progress, priority, difficulty, minBlocks, maxMinutes, deadline] = qa("input", tr).map((n) => n.value.trim());
      return {
        book_id: tr.dataset.bookId || uid(),
        title,
        words_total: Number(words || 0),
        progress_percent: Number(progress || 0),
        priority: Number(priority || 0),
        difficulty: Number(difficulty || 0),
        min_blocks_per_session: Number(minBlocks || 1),
        max_minutes_per_day: maxMinutes ? Number(maxMinutes) : null,
        deadline: deadline || null,
      };
    })
    .filter((b) => b.title && b.words_total > 0);
}

export function bindBooksUI() {
  el("addBookBtn").onclick = () => addBookRow();
}
