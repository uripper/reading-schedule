// @ts-nocheck
import { q } from "../dom.js";
import { SHELF_FILTER_ALL, SHELF_FILTER_UNSHELVED, uniqueShelves } from "./shelf.js";
import { SORT_BY_AUTHOR, SORT_BY_DEADLINE, SORT_BY_DIFFICULTY, SORT_BY_PAGES_READ, SORT_BY_PAGES_TOTAL, SORT_BY_PRIORITY, SORT_BY_PROGRESS, SORT_BY_SHELF, SORT_BY_TITLE, SORT_BY_WORDS_TOTAL, SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "./sort.js";
const SORT_OPTIONS = [
  { value: SORT_BY_TITLE, label: "Title" },
  { value: SORT_BY_AUTHOR, label: "Author" },
  { value: SORT_BY_PAGES_TOTAL, label: "Pages" },
  { value: SORT_BY_PAGES_READ, label: "Pages Read" },
  { value: SORT_BY_WORDS_TOTAL, label: "Words" },
  { value: SORT_BY_PROGRESS, label: "Progress" },
  { value: SORT_BY_PRIORITY, label: "Priority" },
  { value: SORT_BY_DIFFICULTY, label: "Difficulty" },
  { value: SORT_BY_DEADLINE, label: "Deadline" },
  { value: SORT_BY_SHELF, label: "Shelf" },
];

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function createLabeledSelect(labelText, selectId, options) {
  const label = document.createElement("label");
  label.className = "books-control";
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = selectId;
  select.className = "books-control-select";
  options.forEach((option) => {
    select.append(createOption(option.value, option.label));
  });
  label.append(select);
  return { label, select };
}

function findOrCreateControlWrap(toolbar) {
  let wrap = q(".books-controls", toolbar);
  if (wrap instanceof HTMLElement) {
    return wrap;
  }
  wrap = document.createElement("div");
  wrap.className = "row wrap-row books-controls";
  toolbar.append(wrap);
  return wrap;
}

export function ensureBooksToolbarControls(toolbar) {
  const wrap = findOrCreateControlWrap(toolbar);
  const shelf = createLabeledSelect("Shelf", "booksShelfFilterSelect", []);
  const sortBy = createLabeledSelect("Sort", "booksSortBySelect", SORT_OPTIONS);
  const sortDirectionBtn = document.createElement("button");
  sortDirectionBtn.type = "button";
  sortDirectionBtn.className = "btn";
  sortDirectionBtn.id = "booksSortDirectionBtn";

  wrap.replaceChildren(shelf.label, sortBy.label, sortDirectionBtn);
  return {
    shelfFilterSelect: shelf.select,
    sortBySelect: sortBy.select,
    sortDirectionBtn,
  };
}

export function updateSortDirectionButton(sortDirectionBtn, sortDirection) {
  sortDirectionBtn.textContent = "Ascending";
  if (sortDirection === SORT_DIRECTION_DESC) {
    sortDirectionBtn.textContent = "Descending";
  }
}

export function updateShelfFilterOptions(shelfFilterSelect, books, selectedValue) {
  const shelfOptions = [{ value: SHELF_FILTER_ALL, label: "All Shelves" }];
  shelfOptions.push({ value: SHELF_FILTER_UNSHELVED, label: "Unshelved" });
  uniqueShelves(books).forEach((shelfName) => {
    shelfOptions.push({ value: shelfName, label: shelfName });
  });
  shelfFilterSelect.replaceChildren(...shelfOptions.map((option) => createOption(option.value, option.label)));
  const hasSelectedValue = shelfOptions.some((option) => option.value === selectedValue);
  shelfFilterSelect.value = SHELF_FILTER_ALL;
  if (hasSelectedValue) {
    shelfFilterSelect.value = selectedValue;
  }
}

export { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC, SORT_BY_TITLE };
