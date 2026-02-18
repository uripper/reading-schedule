// @ts-nocheck
import { SHELF_SELECT_CREATE_NEW, uniqueShelves } from "./shelf.js";

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function setShelfNewInputVisibility(refs, visible) {
  refs.shelfNewWrap.hidden = !visible;
  if (!visible) {
    refs.shelfNewInput.value = "";
  }
}

function syncShelfNewInputVisibility(refs) {
  const isCreatingShelf = refs.shelfSelectInput.value === SHELF_SELECT_CREATE_NEW;
  setShelfNewInputVisibility(refs, isCreatingShelf);
}

function setSelectedShelf(refs, selectedShelf, availableShelves) {
  refs.shelfSelectInput.value = "";
  if (!selectedShelf) {
    setShelfNewInputVisibility(refs, false);
    return;
  }
  if (availableShelves.includes(selectedShelf)) {
    refs.shelfSelectInput.value = selectedShelf;
    setShelfNewInputVisibility(refs, false);
    return;
  }
  refs.shelfSelectInput.value = SHELF_SELECT_CREATE_NEW;
  refs.shelfNewInput.value = selectedShelf;
  setShelfNewInputVisibility(refs, true);
}

export function renderShelfPicker(refs, books = [], selectedShelf = "") {
  const shelves = uniqueShelves(books);
  const options = [{ value: "", label: "Unshelved" }];
  shelves.forEach((shelfName) => {
    options.push({ value: shelfName, label: shelfName });
  });
  options.push({ value: SHELF_SELECT_CREATE_NEW, label: "Create new shelf..." });

  const nodes = options.map((option) => createOption(option.value, option.label));
  refs.shelfSelectInput.replaceChildren(...nodes);
  setSelectedShelf(refs, selectedShelf, shelves);
}

export function bindShelfPicker(refs) {
  refs.shelfSelectInput.addEventListener("change", () => {
    syncShelfNewInputVisibility(refs);
    if (refs.shelfSelectInput.value === SHELF_SELECT_CREATE_NEW) {
      refs.shelfNewInput.focus();
    }
  });
}
