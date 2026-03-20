import type { OptionDefinition } from "../../types/types.ts";
import { GROUP_OPTIONS_BASE, SORT_OPTIONS } from "./toolbar_options.ts";

/**
 * Creates a standard `<option>` element.
 * @param value - Option value attribute.
 * @param label - Visible option label text.
 * @returns Configured option node.
 */
function createOptionNode(value: string, label: string): HTMLOptionElement {
    const OPTION = document.createElement("option");
    OPTION.value = value;
    OPTION.textContent = label;
    return OPTION;
}

/**
 * Creates a labeled toolbar `<select>` control from option definitions.
 * @param labelText - Visible label text.
 * @param selectId - DOM id assigned to select element.
 * @param options - Options used to populate the select.
 * @returns Label/select pair ready for toolbar insertion.
 */
function createLabeledSelect(
    labelText: string,
    selectId: string,
    options: OptionDefinition[],
): { label: HTMLLabelElement; select: HTMLSelectElement } {
    const LABEL = document.createElement("label");
    LABEL.className = "books-control";
    LABEL.textContent = labelText;
    const SELECT = document.createElement("select");
    SELECT.id = selectId;
    SELECT.className = "books-control-select";

    for (const OPTION of options) {
        SELECT.append(createOptionNode(OPTION.value, OPTION.label));
    }
    LABEL.append(SELECT);
    return { label: LABEL, select: SELECT };
}

/**
 * Creates a labeled toolbar title-filter `<input>` control.
 * @param labelText - Visible label text.
 * @param inputId - DOM id assigned to input element.
 * @returns Label/input pair ready for toolbar insertion.
 */
function createLabeledSearchInput(
    labelText: string,
    inputId: string,
): { label: HTMLLabelElement; input: HTMLInputElement } {
    const LABEL = document.createElement("label");
    LABEL.className = "books-control books-control-search";
    LABEL.textContent = labelText;
    const INPUT = document.createElement("input");
    INPUT.type = "search";
    INPUT.id = inputId;
    INPUT.autocomplete = "off";
    INPUT.className = "books-control-input";
    INPUT.placeholder = "Type a title";
    LABEL.append(INPUT);
    return { input: INPUT, label: LABEL };
}

/**
 * Resolves or creates the toolbar controls wrapper element.
 * @param toolbar - Toolbar root element.
 * @returns Existing or newly created controls wrapper.
 */
function createControlsWrap(toolbar: HTMLElement): HTMLElement {
    const EXISTING = toolbar.querySelector<HTMLElement>(".books-controls");
    if (EXISTING instanceof HTMLElement) {
        return EXISTING;
    }
    const WRAP = document.createElement("div");
    WRAP.className = "row wrap-row books-controls";
    toolbar.append(WRAP);
    return WRAP;
}

function sortDirectionButton(): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn";
    BUTTON.id = "booksSortDirectionBtn";
    return BUTTON;
}

function filterControls() {
    const TITLE_FILTER = createLabeledSearchInput(
        "Title",
        "booksTitleFilterInput",
    );
    const SHELF = createLabeledSelect("Shelf", "booksShelfFilterSelect", []);
    const STATUS = createLabeledSelect("Status", "booksStatusFilterSelect", []);
    return {
        shelf: SHELF,
        status: STATUS,
        titleFilter: TITLE_FILTER,
    };
}

function sortingControls() {
    const SORT_BY = createLabeledSelect(
        "Sort",
        "booksSortBySelect",
        SORT_OPTIONS,
    );
    const GROUP_BY = createLabeledSelect(
        "Group By",
        "booksGroupBySelect",
        GROUP_OPTIONS_BASE,
    );
    return {
        groupBy: GROUP_BY,
        sortBy: SORT_BY,
        sortDirectionBtn: sortDirectionButton(),
    };
}

function toolbarControls() {
    return {
        ...filterControls(),
        ...sortingControls(),
    };
}

function replaceToolbarChildren(
    wrap: HTMLElement,
    controls: ReturnType<typeof toolbarControls>,
): void {
    wrap.replaceChildren(
        controls.titleFilter.label,
        controls.shelf.label,
        controls.status.label,
        controls.sortBy.label,
        controls.groupBy.label,
        controls.sortDirectionBtn,
    );
}

function toolbarControlRefs(controls: ReturnType<typeof toolbarControls>): {
    groupBySelect: HTMLSelectElement;
    shelfFilterSelect: HTMLSelectElement;
    sortBySelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
    statusFilterSelect: HTMLSelectElement;
    titleFilterInput: HTMLInputElement;
} {
    return {
        groupBySelect: controls.groupBy.select,
        shelfFilterSelect: controls.shelf.select,
        sortBySelect: controls.sortBy.select,
        sortDirectionBtn: controls.sortDirectionBtn,
        statusFilterSelect: controls.status.select,
        titleFilterInput: controls.titleFilter.input,
    };
}

/**
 * Creates a standard `<option>` element.
 * @param value - Option value attribute.
 * @param label - Visible option label text.
 * @returns Configured option node.
 */
export function createOption(value: string, label: string): HTMLOptionElement {
    return createOptionNode(value, label);
}

/**
 * Builds and inserts books toolbar controls, returning resolved control refs.
 * @param toolbar - Toolbar root element.
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
    const WRAP = createControlsWrap(toolbar);
    const CONTROLS = toolbarControls();
    replaceToolbarChildren(WRAP, CONTROLS);
    return toolbarControlRefs(CONTROLS);
}
