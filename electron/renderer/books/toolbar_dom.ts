import type { OptionDefinition } from "../../types/types.js";
import { GROUP_OPTIONS_BASE, SORT_OPTIONS } from "./toolbar_options.js";

/**
 * Creates a standard `<option>` element.
 * @param value Option value attribute.
 * @param label Visible option label text.
 * @returns Configured option node.
 */
function createOptionNode(value: string, label: string): HTMLOptionElement {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

/**
 * Creates a labeled toolbar `<select>` control from option definitions.
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
        select.append(createOptionNode(option.value, option.label));
    });
    label.append(select);
    return { label, select };
}

/**
 * Creates a labeled toolbar title-filter `<input>` control.
 * @param labelText Visible label text.
 * @param inputId DOM id assigned to input element.
 * @returns Label/input pair ready for toolbar insertion.
 */
function createLabeledSearchInput(
    labelText: string,
    inputId: string,
): { label: HTMLLabelElement; input: HTMLInputElement } {
    const label = document.createElement("label");
    label.className = "books-control books-control-search";
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = "search";
    input.id = inputId;
    input.autocomplete = "off";
    input.className = "books-control-input";
    input.placeholder = "Type a title";
    label.append(input);
    return { label, input };
}

/**
 * Resolves or creates the toolbar controls wrapper element.
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
 * @param value Option value attribute.
 * @param label Visible option label text.
 * @returns Configured option node.
 */
export function createOption(value: string, label: string): HTMLOptionElement {
    return createOptionNode(value, label);
}

/**
 * Builds and inserts books toolbar controls, returning resolved control refs.
 * @param toolbar Toolbar root element.
 * @returns Toolbar control references used by controller wiring.
 */
export function ensureBooksToolbarControls(toolbar: HTMLElement): {
    groupBySelect: HTMLSelectElement;
    shelfFilterSelect: HTMLSelectElement;
    sortBySelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
    statusFilterSelect: HTMLSelectElement;
    titleFilterInput: HTMLInputElement;
} {
    const wrap = createControlsWrap(toolbar);
    const titleFilter = createLabeledSearchInput(
        "Title",
        "booksTitleFilterInput",
    );
    const shelf = createLabeledSelect("Shelf", "booksShelfFilterSelect", []);
    const status = createLabeledSelect("Status", "booksStatusFilterSelect", []);
    const sortBy = createLabeledSelect(
        "Sort",
        "booksSortBySelect",
        SORT_OPTIONS,
    );
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
        titleFilter.label,
        shelf.label,
        status.label,
        sortBy.label,
        groupBy.label,
        sortDirectionBtn,
    );
    return {
        titleFilterInput: titleFilter.input,
        shelfFilterSelect: shelf.select,
        statusFilterSelect: status.select,
        sortBySelect: sortBy.select,
        groupBySelect: groupBy.select,
        sortDirectionBtn,
    };
}
