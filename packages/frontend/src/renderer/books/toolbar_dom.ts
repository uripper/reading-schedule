/** Builds the Library toolbar controls: keyword search, filters, and sorting. */
import type { OptionDefinition } from "../../types/types.ts";
import { hintDot } from "../hint-dot.ts";
import { KEYWORD_SEARCH_HINT } from "./keyword-search.ts";
import { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "./sort.ts";
import { GROUP_OPTIONS_BASE, SORT_OPTIONS } from "./toolbar_options.ts";

const SEARCH_PLACEHOLDER = "Search title, author, etc...";

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
 * Wraps a toolbar input or select so CSS can draw its leading/trailing icon.
 * @param control - Input or select element to wrap.
 * @param modifier - Field variant (`search` or `select`).
 * @returns Wrapper element containing the control.
 */
function createControlField(
    control: HTMLElement,
    modifier: string,
): HTMLSpanElement {
    const FIELD = document.createElement("span");
    FIELD.className = `books-control-field books-control-field-${modifier}`;
    FIELD.append(control);
    return FIELD;
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
    LABEL.append(createControlField(SELECT, "select"));
    return { label: LABEL, select: SELECT };
}

/**
 * Creates label text with an optional `?` hint kept on the same line.
 * @param labelText - Visible label text.
 * @param hint - Help text revealed by the hint marker.
 * @returns Label text element.
 */
function labelTextWithHint(labelText: string, hint: string): HTMLSpanElement {
    const TEXT = document.createElement("span");
    TEXT.className = "books-control-label";
    TEXT.textContent = labelText;
    const DOT = hintDot(hint);
    if (DOT !== null) {
        TEXT.append(DOT);
    }
    return TEXT;
}

/**
 * Creates a labeled toolbar keyword-filter `<input>` control.
 * @param labelText - Visible label text.
 * @param inputId - DOM id assigned to input element.
 * @param hint - Help text listing what the search matches.
 * @returns Label/input pair ready for toolbar insertion.
 */
function createLabeledSearchInput(
    labelText: string,
    inputId: string,
    hint: string,
): { label: HTMLLabelElement; input: HTMLInputElement } {
    const LABEL = document.createElement("label");
    LABEL.className = "books-control books-control-search";
    const INPUT = document.createElement("input");
    INPUT.type = "search";
    INPUT.id = inputId;
    INPUT.autocomplete = "off";
    INPUT.className = "books-control-input";
    INPUT.placeholder = SEARCH_PLACEHOLDER;
    LABEL.append(
        labelTextWithHint(labelText, hint),
        createControlField(INPUT, "search"),
    );
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

/**
 * Creates one half of the sort direction toggle.
 * @param direction - Direction this half represents.
 * @param arrow - Arrow icon name (`up` or `down`).
 * @returns Segment element holding the direction arrow.
 */
function sortDirectionSegment(
    direction: string,
    arrow: string,
): HTMLSpanElement {
    const SEGMENT = document.createElement("span");
    SEGMENT.className = `books-sort-direction-segment is-${direction}`;
    const ICON = document.createElement("span");
    ICON.className = `icon icon-arrow-${arrow}`;
    ICON.setAttribute("aria-hidden", "true");
    SEGMENT.append(ICON);
    return SEGMENT;
}

/**
 * Creates the sort direction toggle button.
 * @returns Configured button element.
 */
function sortDirectionButton(): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn books-sort-direction-btn";
    BUTTON.id = "booksSortDirectionBtn";
    BUTTON.append(
        sortDirectionSegment(SORT_DIRECTION_ASC, "up"),
        sortDirectionSegment(SORT_DIRECTION_DESC, "down"),
    );
    return BUTTON;
}

/**
 * Creates the keyword, status, and shelf filter controls.
 * @returns Labeled filter controls.
 */
function filterControls() {
    const TITLE_FILTER = createLabeledSearchInput(
        "Search",
        "booksTitleFilterInput",
        KEYWORD_SEARCH_HINT,
    );
    const SHELF = createLabeledSelect("Shelf", "booksShelfFilterSelect", []);
    const STATUS = createLabeledSelect("Status", "booksStatusFilterSelect", []);
    return {
        shelf: SHELF,
        status: STATUS,
        titleFilter: TITLE_FILTER,
    };
}

/**
 * Creates the sort and grouping controls.
 * @returns Labeled sorting controls.
 */
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

/**
 * Creates every Library toolbar control.
 * @returns Filter and sorting controls.
 */
function toolbarControls() {
    return {
        ...filterControls(),
        ...sortingControls(),
    };
}

/**
 * Replaces the toolbar wrapper contents with the given controls.
 * @param wrap - Toolbar controls wrapper.
 * @param controls - Controls to render.
 */
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

/**
 * Extracts the interactive elements the controller reads from the toolbar.
 * @param controls - Rendered toolbar controls.
 * @returns Toolbar element references.
 */
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
