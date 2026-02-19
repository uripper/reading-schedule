

import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";

function createShelfSelectLabel() {
  const label = document.createElement("label");
  label.textContent = "Bookshelf";

  const select = document.createElement("select");
  select.id = "bookShelfSelectInput";
  const unshelvedOption = document.createElement("option");
  unshelvedOption.value = "";
  unshelvedOption.textContent = "Unshelved";
  const createNewOption = document.createElement("option");
  createNewOption.value = SHELF_SELECT_CREATE_NEW;
  createNewOption.textContent = "Create new shelf...";
  select.append(unshelvedOption, createNewOption);
  label.append(select);
  return label;
}

export function ensureBookFormLayoutFields() {
  const existing = document.getElementById("bookShelfSelectInput");
  if (existing) {
    return;
  }

  const grid = document.querySelector("#bookForm .book-fields .settings-grid");
  if (!(grid instanceof HTMLElement)) {
    return;
  }

  grid.append(createShelfSelectLabel());
}
