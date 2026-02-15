import { el, qa, uid } from "./dom.js";

const columns = ["title", "words_total", "priority", "difficulty", "min_blocks_per_session", "deadline"];

function rowTemplate(book) {
  return `<td><input value="${book.title || ""}" placeholder="Book title"></td>
<td><input type="number" min="1" value="${book.words_total || 0}"></td>
<td><input type="number" min="1" max="5" value="${book.priority || 3}"></td>
<td><input type="number" min="1" max="10" value="${book.difficulty || 3}"></td>
<td><input type="number" min="1" value="${book.min_blocks_per_session || 1}"></td>
<td><input value="${book.deadline || ""}" placeholder="YYYY-MM-DD"></td>
<td><button class="btn rm-btn" aria-label="Remove book">Remove</button></td>`;
}

export function addBookRow(book = {}) {
  const tr = document.createElement("tr");
  tr.dataset.bookId = book.book_id || uid();
  tr.innerHTML = rowTemplate(book);
  tr.querySelector("button").onclick = () => tr.remove();
  el("booksBody").appendChild(tr);
}

export function fillBooks(books) {
  el("booksBody").innerHTML = "";
  (books || []).forEach((book) => addBookRow(book));
}

export function collectBooks() {
  return qa("#booksBody tr")
    .map((tr) => {
      const [title, words, priority, difficulty, minBlocks, deadline] = qa("input", tr).map((n) => n.value.trim());
      return {
        book_id: tr.dataset.bookId || uid(),
        title,
        words_total: Number(words || 0),
        priority: Number(priority || 0),
        difficulty: Number(difficulty || 0),
        min_blocks_per_session: Number(minBlocks || 1),
        deadline: deadline || null,
      };
    })
    .filter((b) => b.title && b.words_total > 0);
}

export function bindBooksUI() {
  el("addBookBtn").onclick = () => addBookRow();
}
