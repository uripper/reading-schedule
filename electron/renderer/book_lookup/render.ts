import { type BookLookupItem } from "../../types/types.js";

/**
 * Builds a stable option id for a lookup result row.
 * @param resultsEl Lookup results container element.
 * @param index Result index.
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
 * @param item Lookup result item.
 * @param placeholder Placeholder image URL.
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
 * @param item Lookup result item.
 * @returns Trimmed title text (possibly empty).
 */
function rawTitleText(item: BookLookupItem): string {
    return String(item.title ?? "").trim();
}

/**
 * Returns display title text for a lookup item.
 * @param item Lookup result item.
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
 * @param item Lookup result item.
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
 * @param item Lookup result item.
 * @returns Joined metadata text.
 */
function metaText(item: BookLookupItem): string {
    let pagesLabel = "";
    if (
        typeof item.pages_estimate === "number" &&
        Number.isFinite(item.pages_estimate) &&
        item.pages_estimate > 0
    ) {
        pagesLabel = `${item.pages_estimate} pages`;
    }
    const META_PARTS: string[] = [];
    const AUTHOR_TEXT = String(item.author ?? "").trim();
    if (AUTHOR_TEXT.length > 0) {
        META_PARTS.push(AUTHOR_TEXT);
    }
    const YEAR_TEXT = String(item.year ?? "").trim();
    if (YEAR_TEXT.length > 0) {
        META_PARTS.push(YEAR_TEXT);
    }
    if (pagesLabel.length > 0) {
        META_PARTS.push(pagesLabel);
    }
    return META_PARTS.join(" · ");
}

/**
 * Renders lookup items into interactive result buttons.
 * @param resultsEl Lookup results container element.
 * @param items Current lookup result items.
 * @param placeholder Placeholder cover image URL.
 * @param activeIndex Currently highlighted result index.
 */
export function renderLookupResults(
    resultsEl: HTMLElement,
    items: readonly BookLookupItem[],
    placeholder: string,
    activeIndex: number,
): void {
    const LIST_ELEMENT = resultsEl;
    LIST_ELEMENT.innerHTML = "";
    items.forEach((item: BookLookupItem, index: number) => {
        const BTN = document.createElement("button");
        BTN.type = "button";
        BTN.className = "book-result";
        BTN.dataset.resultIndex = String(index);
        BTN.id = optionId(LIST_ELEMENT, index);
        BTN.setAttribute("role", "option");
        BTN.setAttribute("aria-selected", "false");
        if (activeIndex === index) {
            BTN.setAttribute("aria-selected", "true");
        }
        BTN.classList.toggle("is-active", activeIndex === index);

        const THUMB = document.createElement("img");
        THUMB.className = "book-result-cover";
        THUMB.loading = "lazy";
        THUMB.src = coverSource(item, placeholder);
        THUMB.alt = coverAlt(item);
        THUMB.onerror = () => {
            THUMB.onerror = null;
            THUMB.src = placeholder;
        };

        const TEXT_WRAP = document.createElement("span");
        const TITLE = document.createElement("span");
        TITLE.className = "book-result-title";
        TITLE.textContent = titleLabel(item);

        const META = document.createElement("span");
        META.className = "book-result-meta";
        META.textContent = metaText(item);

        TEXT_WRAP.append(TITLE, META);
        BTN.append(THUMB, TEXT_WRAP);
        LIST_ELEMENT.append(BTN);
    });
}

/**
 * Synchronizes combobox accessibility attributes with lookup result state.
 * @param searchInput Lookup search input.
 * @param resultsEl Lookup results container element.
 * @param hasItems Whether result list currently has any items.
 * @param activeIndex Currently highlighted result index.
 */
export function updateComboboxA11y(
    searchInput: HTMLInputElement,
    resultsEl: HTMLElement,
    hasItems: boolean,
    activeIndex: number,
): void {
    searchInput.setAttribute("aria-expanded", "false");
    if (hasItems) {
        searchInput.setAttribute("aria-expanded", "true");
    }
    if (!hasItems || activeIndex < 0) {
        searchInput.removeAttribute("aria-activedescendant");
        return;
    }
    searchInput.setAttribute(
        "aria-activedescendant",
        optionId(resultsEl, activeIndex),
    );
}

/**
 * Resolves the `.book-result` element associated with an event target.
 * @param event Pointer/keyboard event originating from result list.
 * @returns Matched result element or null.
 */
export function lookupResultTarget(event: Event): HTMLElement | null {
    if (!(event.target instanceof HTMLElement)) {
        return null;
    }
    return event.target.closest(".book-result");
}
