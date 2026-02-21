import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import { statusOptions } from "./status.js";

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

function createStatusSelectLabel() {
  const label = document.createElement("label");
  label.textContent = "Status";

  const select = document.createElement("select");
  select.id = "bookStatusSelectInput";
  statusOptions().forEach((optionDef) => {
    const option = document.createElement("option");
    option.value = optionDef.value;
    option.textContent = optionDef.label;
    select.append(option);
  });

  label.append(select);
  return label;
}

function createFinishedAtLabel() {
  const label = document.createElement("label");
  label.id = "bookFinishedAtField";
  label.hidden = true;
  label.textContent = "Finish Date";

  const input = document.createElement("input");
  input.id = "bookFinishedAtInput";
  input.type = "date";

  label.append(input);
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

  grid.append(
    createStatusSelectLabel(),
    createFinishedAtLabel(),
    createShelfSelectLabel(),
  );
}
