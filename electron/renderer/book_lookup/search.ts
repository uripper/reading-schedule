// @ts-nocheck
import { describeLookup, placeholderCoverSvg } from "./helpers.js";

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 8;

function optionId(resultsEl, index) {
  return `${resultsEl.id || "lookup-results"}-option-${index}`;
}

function renderResults(resultsEl, items, placeholder, activeIndex) {
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

function updateComboboxA11y(searchInput, resultsEl, hasItems, activeIndex) {
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

export function bindBookLookup({ searchInput, resultsEl, metaEl, onPick }) {
  const placeholder = placeholderCoverSvg();
  let timer = null;
  let token = 0;
  let currentItems = [];
  let activeIndex = -1;

  const selectItem = (index) => {
    const item = currentItems[index];
    if (!item) return;
    searchInput.value = item.title || "";
    metaEl.textContent = describeLookup(item);
    clearResults();
    onPick(item);
  };

  const refreshResults = () => {
    const hasItems = currentItems.length > 0;
    if (!hasItems) {
      resultsEl.classList.remove("has-items");
      resultsEl.innerHTML = "";
      updateComboboxA11y(searchInput, resultsEl, false, -1);
      return;
    }
    renderResults(resultsEl, currentItems, placeholder, activeIndex);
    resultsEl.classList.add("has-items");
    updateComboboxA11y(searchInput, resultsEl, true, activeIndex);
  };

  const clearResults = () => {
    currentItems = [];
    activeIndex = -1;
    refreshResults();
  };

  const setActiveIndex = (index) => {
    if (!currentItems.length) {
      activeIndex = -1;
      refreshResults();
      return;
    }
    const bounded = ((index % currentItems.length) + currentItems.length) % currentItems.length;
    activeIndex = bounded;
    refreshResults();
  };

  resultsEl.addEventListener("mousemove", (event) => {
    let target = null;
    if (event.target instanceof HTMLElement) {
      target = event.target.closest(".book-result");
    }
    if (!target) return;
    setActiveIndex(Number(target.dataset.resultIndex));
  });

  resultsEl.addEventListener("click", (event) => {
    let target = null;
    if (event.target instanceof HTMLElement) {
      target = event.target.closest(".book-result");
    }
    if (!target) return;
    selectItem(Number(target.dataset.resultIndex));
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (timer) clearTimeout(timer);
    if (q.length < 2) {
      clearResults();
      metaEl.textContent = "";
      return;
    }
    timer = setTimeout(async () => {
      token += 1;
      const current = token;
      try {
        const items = (await window.plannerApi.searchBooks(q)).slice(0, RESULT_LIMIT);
        if (current !== token) return;
        currentItems = items;
        activeIndex = -1;
        if (items.length) {
          activeIndex = 0;
        }
        if (!items.length) {
          clearResults();
          metaEl.textContent = "No matches found.";
          return;
        }
        refreshResults();
        metaEl.textContent = "Select a result to fill details.";
      } catch {
        if (current !== token) return;
        clearResults();
        metaEl.textContent = "Lookup unavailable; enter values manually.";
      }
    }, LOOKUP_DELAY_MS);
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!currentItems.length) return;
      if (activeIndex < 0) {
        setActiveIndex(0);
      } else {
        setActiveIndex(activeIndex + 1);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!currentItems.length) return;
      if (activeIndex < 0) {
        setActiveIndex(currentItems.length - 1);
      } else {
        setActiveIndex(activeIndex - 1);
      }
      return;
    }
    if (event.key === "Enter") {
      if (activeIndex < 0 || !currentItems.length) return;
      event.preventDefault();
      selectItem(activeIndex);
      return;
    }
    if (event.key === "Escape") {
      clearResults();
      searchInput.blur();
    }
  });

  const onDocClick = (event) => {
    if (!(event.target instanceof Node)) return;
    if (event.target === searchInput || resultsEl.contains(event.target)) return;
    clearResults();
  };

  document.addEventListener("click", onDocClick);
  return { clearResults, destroy: () => document.removeEventListener("click", onDocClick) };
}
