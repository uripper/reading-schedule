import type { BookLookupItem } from "../../types/types.js";

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
  const coverUrl = String(item.cover_url ?? "").trim();
  if (coverUrl.length > 0) {
    return coverUrl;
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
  const titleText = rawTitleText(item);
  if (titleText.length > 0) {
    return titleText;
  }
  return "Untitled";
}

/**
 * Returns image alt text for a lookup item cover thumbnail.
 * @param item Lookup result item.
 * @returns Cover alt text.
 */
function coverAlt(item: BookLookupItem): string {
  const titleText = rawTitleText(item);
  if (titleText.length > 0) {
    return `Cover for ${titleText}`;
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
  const metaParts: string[] = [];
  const authorText = String(item.author ?? "").trim();
  if (authorText.length > 0) {
    metaParts.push(authorText);
  }
  const yearText = String(item.year ?? "").trim();
  if (yearText.length > 0) {
    metaParts.push(yearText);
  }
  if (pagesLabel.length > 0) {
    metaParts.push(pagesLabel);
  }
  return metaParts.join(" · ");
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
  const listElement = resultsEl;
  listElement.innerHTML = "";
  items.forEach((item: BookLookupItem, index: number) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-result";
    btn.dataset.resultIndex = String(index);
    btn.id = optionId(listElement, index);
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", "false");
    if (activeIndex === index) {
      btn.setAttribute("aria-selected", "true");
    }
    btn.classList.toggle("is-active", activeIndex === index);

    const thumb = document.createElement("img");
    thumb.className = "book-result-cover";
    thumb.loading = "lazy";
    thumb.src = coverSource(item, placeholder);
    thumb.alt = coverAlt(item);
    thumb.onerror = () => {
      thumb.onerror = null;
      thumb.src = placeholder;
    };

    const textWrap = document.createElement("span");
    const title = document.createElement("span");
    title.className = "book-result-title";
    title.textContent = titleLabel(item);

    const meta = document.createElement("span");
    meta.className = "book-result-meta";
    meta.textContent = metaText(item);

    textWrap.append(title, meta);
    btn.append(thumb, textWrap);
    listElement.append(btn);
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
