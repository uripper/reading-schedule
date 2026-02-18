// @ts-nocheck

function createShelfLabel() {
  const label = document.createElement("label");
  label.textContent = "Bookshelf";

  const input = document.createElement("input");
  input.id = "bookShelfInput";
  input.placeholder = "e.g. History";

  label.append(input);
  return label;
}

export function ensureBookFormLayoutFields() {
  const existing = document.getElementById("bookShelfInput");
  if (existing) {
    return;
  }

  const grid = document.querySelector("#bookForm .book-fields .settings-grid");
  if (!(grid instanceof HTMLElement)) {
    return;
  }

  grid.append(createShelfLabel());
}
