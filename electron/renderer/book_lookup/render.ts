import type { BookLookupItem } from "../../types/types.ts";

interface RenderLookupResultsArgs {
    activeIndex: number;
    items: readonly BookLookupItem[];
    placeholder: string;
    resultsEl: HTMLElement;
}

interface UpdateComboboxA11yArgs {
    activeIndex: number;
    hasItems: boolean;
    resultsEl: HTMLElement;
    searchInput: HTMLInputElement;
}

/**
 * Builds a stable option id for a lookup result row.
 * @param resultsEl - Lookup results container element.
 * @param index - Result index.
 * @returns DOM id for the option element.
 */
function optionId(resultsEl: HTMLElement, index: number): string {
    let rootId = resultsEl.id;
    if (rootId.length === 0) {
        rootId = "lookup-results";
    }
    return `${rootId}-option-${index}`;
}

/**
 * Builds preferred cover source URL for a lookup item.
 * @param item - Lookup result item.
 * @param placeholder - Placeholder image URL.
 * @returns Cover source URL.
 */
function coverSource(item: BookLookupItem, placeholder: string): string {
    const COVER_URL = String(item.cover_url ?? "").trim();
    if (COVER_URL.length > 0) {
        return COVER_URL;
    }
    return placeholder;
}

/**
 * Returns normalized title text from a lookup item.
 * @param item - Lookup result item.
 * @returns Trimmed title text (possibly empty).
 */
function rawTitleText(item: BookLookupItem): string {
    return String(item.title ?? "").trim();
}

/**
 * Returns display title text for a lookup item.
 * @param item - Lookup result item.
 * @returns Title label for list rendering.
 */
function titleLabel(item: BookLookupItem): string {
    const TITLE_TEXT = rawTitleText(item);
    if (TITLE_TEXT.length > 0) {
        return TITLE_TEXT;
    }
    return "Untitled";
}

/**
 * Returns image alt text for a lookup item cover thumbnail.
 * @param item - Lookup result item.
 * @returns Cover alt text.
 */
function coverAlt(item: BookLookupItem): string {
    const TITLE_TEXT = rawTitleText(item);
    if (TITLE_TEXT.length > 0) {
        return `Cover for ${TITLE_TEXT}`;
    }
    return "Book cover";
}

/**
 * Builds metadata line text for a lookup result item.
 * @param item - Lookup result item.
 * @returns Joined metadata text.
 */
function metaText(item: BookLookupItem): string {
    const PAGES_LABEL = estimatedPagesLabel(item);
    const META_PARTS = metaTextParts(item);
    if (PAGES_LABEL.length > 0) {
        META_PARTS.push(PAGES_LABEL);
    }
    return META_PARTS.join(" · ");
}

function estimatedPagesLabel(item: BookLookupItem): string {
    if (
        typeof item.pages_estimate !== "number" ||
        !Number.isFinite(item.pages_estimate) ||
        item.pages_estimate <= 0
    ) {
        return "";
    }
    return `${item.pages_estimate} pages`;
}

function metaTextParts(item: BookLookupItem): string[] {
    const META_PARTS: string[] = [];
    const AUTHOR_TEXT = String(item.author ?? "").trim();
    if (AUTHOR_TEXT.length > 0) {
        META_PARTS.push(AUTHOR_TEXT);
    }
    const YEAR_TEXT = String(item.year ?? "").trim();
    if (YEAR_TEXT.length > 0) {
        META_PARTS.push(YEAR_TEXT);
    }
    return META_PARTS;
}

function setResultActiveState(button: HTMLElement, active: boolean): void {
    button.setAttribute("aria-selected", "false");
    if (active) {
        button.setAttribute("aria-selected", "true");
    }
    button.classList.toggle("is-active", active);
}

function createCoverElement(
    item: BookLookupItem,
    placeholder: string,
): HTMLImageElement {
    const THUMB = document.createElement("img");
    THUMB.className = "book-result-cover";
    THUMB.loading = "lazy";
    THUMB.src = coverSource(item, placeholder);
    THUMB.alt = coverAlt(item);
    THUMB.onerror = () => {
        THUMB.onerror = null;
        THUMB.src = placeholder;
    };
    return THUMB;
}

function createTextWrap(item: BookLookupItem): HTMLSpanElement {
    const TEXT_WRAP = document.createElement("span");
    const TITLE = document.createElement("span");
    TITLE.className = "book-result-title";
    TITLE.textContent = titleLabel(item);

    const META = document.createElement("span");
    META.className = "book-result-meta";
    META.textContent = metaText(item);

    TEXT_WRAP.append(TITLE, META);
    return TEXT_WRAP;
}

function createLookupResultButton(options: {
    active: boolean;
    index: number;
    item: BookLookupItem;
    placeholder: string;
    resultsEl: HTMLElement;
}): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "book-result";
    BUTTON.dataset.resultIndex = String(options.index);
    BUTTON.id = optionId(options.resultsEl, options.index);
    BUTTON.setAttribute("role", "option");
    setResultActiveState(BUTTON, options.active);
    BUTTON.append(
        createCoverElement(options.item, options.placeholder),
        createTextWrap(options.item),
    );
    return BUTTON;
}

function renderedLookupButtons(
    options: RenderLookupResultsArgs,
): HTMLButtonElement[] {
    return options.items.map((item, index) =>
        createLookupResultButton({
            active: options.activeIndex === index,
            index,
            item,
            placeholder: options.placeholder,
            resultsEl: options.resultsEl,
        }),
    );
}

/**
 * Renders lookup items into interactive result buttons.
 * @param resultsEl - Lookup results container element.
 * @param items - Current lookup result items.
 * @param placeholder - Placeholder cover image URL.
 * @param activeIndex - Currently highlighted result index.
 */
export function renderLookupResults(options: RenderLookupResultsArgs): void {
    const RESULTS_EL = options.resultsEl;
    RESULTS_EL.innerHTML = "";
    const BUTTONS = renderedLookupButtons(options);
    RESULTS_EL.append(...BUTTONS);
}

/**
 * Synchronizes combobox accessibility attributes with lookup result state.
 * @param searchInput - Lookup search input.
 * @param resultsEl - Lookup results container element.
 * @param hasItems - Whether result list currently has any items.
 * @param activeIndex - Currently highlighted result index.
 */
export function updateComboboxA11y(options: UpdateComboboxA11yArgs): void {
    options.searchInput.setAttribute("aria-expanded", "false");
    if (options.hasItems) {
        options.searchInput.setAttribute("aria-expanded", "true");
    }
    if (!options.hasItems || options.activeIndex < 0) {
        options.searchInput.removeAttribute("aria-activedescendant");
        return;
    }
    options.searchInput.setAttribute(
        "aria-activedescendant",
        optionId(options.resultsEl, options.activeIndex),
    );
}

/**
 * Resolves the `.book-result` element associated with an event target.
 * @param event - Pointer/keyboard event originating from result list.
 * @returns Matched result element or null.
 */
export function lookupResultTarget(event: Event): HTMLElement | null {
    if (!(event.target instanceof HTMLElement)) {
        return null;
    }
    return event.target.closest(".book-result");
}
