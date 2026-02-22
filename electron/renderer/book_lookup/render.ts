import type { BookLookupItem } from "../app/types.js";

/**
 * Builds a stable option id for a lookup result row.
 * @param resultsEl Lookup results container element.
 * @param index Result index.
 * @returns DOM id for the option element.
 */
function optionId(resultsEl: HTMLElement, index: number): string {
  return `${resultsEl.id || "lookup-results"}-option-${index}`;
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
  resultsEl.innerHTML = "";
  items.forEach((item: BookLookupItem, index: number) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-result";
    btn.dataset.resultIndex = String(index);
    btn.id = optionId(resultsEl, index);
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", "false");
    if (activeIndex === index) {
      btn.setAttribute("aria-selected", "true");
    }
    btn.classList.toggle("is-active", activeIndex === index);

    const thumb = document.createElement("img");
    thumb.className = "book-result-cover";
    thumb.loading = "lazy";
    thumb.src = item.cover_url || placeholder;
    thumb.alt = "Book cover";
    if (item.title) {
      thumb.alt = `Cover for ${item.title}`;
    }
    thumb.onerror = () => {
      thumb.onerror = null;
      thumb.src = placeholder;
    };

    const textWrap = document.createElement("span");
    const title = document.createElement("span");
    title.className = "book-result-title";
    title.textContent = item.title || "Untitled";

    const meta = document.createElement("span");
    meta.className = "book-result-meta";
    let pagesLabel = "";
    if (item.pages_estimate) {
      pagesLabel = `${item.pages_estimate} pages`;
    }
    meta.textContent = [item.author || "", item.year || "", pagesLabel]
      .filter(Boolean)
      .join(" · ");

    textWrap.append(title, meta);
    btn.append(thumb, textWrap);
    resultsEl.append(btn);
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
