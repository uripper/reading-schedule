import { GROUP_OPTIONS_BASE, SORT_OPTIONS, type OptionDefinition } from "./toolbar_options.js";

/**
 * Creates a labeled toolbar `<select>` control from option definitions.
 *
 * @param labelText Visible label text.
 * @param selectId DOM id assigned to select element.
 * @param options Options used to populate the select.
 * @returns Label/select pair ready for toolbar insertion.
 */
function createLabeledSelect(
  labelText: string,
  selectId: string,
  options: OptionDefinition[],
): { label: HTMLLabelElement; select: HTMLSelectElement } {
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

/**
 * Resolves or creates the toolbar controls wrapper element.
 *
 * @param toolbar Toolbar root element.
 * @returns Existing or newly created controls wrapper.
 */
function createControlsWrap(toolbar: HTMLElement): HTMLElement {
  const existing = toolbar.querySelector<HTMLElement>(".books-controls");
  if (existing instanceof HTMLElement) {
    return existing;
  }
  const wrap = document.createElement("div");
  wrap.className = "row wrap-row books-controls";
  toolbar.append(wrap);
  return wrap;
}

/**
 * Creates a standard `<option>` element.
 *
 * @param value Option value attribute.
 * @param label Visible option label text.
 * @returns Configured option node.
 */
export function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

/**
 * Builds and inserts books toolbar controls, returning resolved control refs.
 *
 * @param toolbar Toolbar root element.
 * @returns Toolbar control references used by controller wiring.
 */
export function ensureBooksToolbarControls(toolbar: HTMLElement): {
  groupBySelect: HTMLSelectElement;
  shelfFilterSelect: HTMLSelectElement;
  sortBySelect: HTMLSelectElement;
  sortDirectionBtn: HTMLButtonElement;
  statusFilterSelect: HTMLSelectElement;
} {
  const wrap = createControlsWrap(toolbar);
  const shelf = createLabeledSelect("Shelf", "booksShelfFilterSelect", []);
  const status = createLabeledSelect("Status", "booksStatusFilterSelect", []);
  const sortBy = createLabeledSelect("Sort", "booksSortBySelect", SORT_OPTIONS);
  const groupBy = createLabeledSelect(
    "Group By",
    "booksGroupBySelect",
    GROUP_OPTIONS_BASE,
  );
  const sortDirectionBtn = document.createElement("button");
  sortDirectionBtn.type = "button";
  sortDirectionBtn.className = "btn";
  sortDirectionBtn.id = "booksSortDirectionBtn";
  wrap.replaceChildren(
    shelf.label,
    status.label,
    sortBy.label,
    groupBy.label,
    sortDirectionBtn,
  );
  return {
    shelfFilterSelect: shelf.select,
    statusFilterSelect: status.select,
    sortBySelect: sortBy.select,
    groupBySelect: groupBy.select,
    sortDirectionBtn,
  };
}
