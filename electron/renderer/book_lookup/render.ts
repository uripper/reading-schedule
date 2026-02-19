

function optionId(resultsEl, index) {
  return `${resultsEl.id || "lookup-results"}-option-${index}`;
}

export function renderLookupResults(resultsEl, items, placeholder, activeIndex) {
  resultsEl.innerHTML = "";
  items.forEach((item, index) => {
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
    meta.textContent = [item.author || "", item.year || "", pagesLabel].filter(Boolean).join(" · ");

    textWrap.append(title, meta);
    btn.append(thumb, textWrap);
    resultsEl.append(btn);
  });
}

export function updateComboboxA11y(searchInput, resultsEl, hasItems, activeIndex) {
  searchInput.setAttribute("aria-expanded", "false");
  if (hasItems) {
    searchInput.setAttribute("aria-expanded", "true");
  }
  if (!hasItems || activeIndex < 0) {
    searchInput.removeAttribute("aria-activedescendant");
    return;
  }
  searchInput.setAttribute("aria-activedescendant", optionId(resultsEl, activeIndex));
}

export function lookupResultTarget(event) {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }
  return event.target.closest(".book-result");
}
