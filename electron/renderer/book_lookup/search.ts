// @ts-nocheck
import { describeLookup, placeholderCoverSvg } from "./helpers.js";

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;

function handleLookupKeydown(event, currentItems, activeIndex, setActiveIndex, selectItem, clearResults, searchInput) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!currentItems.length) {
      return;
    }
    if (activeIndex < 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(activeIndex + 1);
    }
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!currentItems.length) {
      return;
    }
    if (activeIndex < 0) {
      setActiveIndex(currentItems.length - 1);
    } else {
      setActiveIndex(activeIndex - 1);
    }
    return;
  }
  if (event.key === "Enter") {
    if (activeIndex < 0 || !currentItems.length) {
      return;
    }
    event.preventDefault();
    selectItem(activeIndex);
    return;
  }
  if (event.key === "Escape") {
    clearResults();
    searchInput.blur();
  }
}

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

function lookupResultTarget(event) {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }
  return event.target.closest(".book-result");
}

function createLookupInputHandler({
  searchInput,
  metaEl,
  state,
  clearResults,
  refreshResults,
}) {
  return () => {
    const query = searchInput.value.trim();
    if (state.timer) {
      clearTimeout(state.timer);
    }
    if (query.length < MIN_QUERY_LENGTH) {
      clearResults();
      metaEl.textContent = "";
      return;
    }
    state.timer = setTimeout(async () => {
      state.token += 1;
      const currentToken = state.token;
      try {
        const items = (await globalThis.plannerApi.searchBooks(query)).slice(0, RESULT_LIMIT);
        if (currentToken !== state.token) {
          return;
        }
        state.currentItems = items;
        state.activeIndex = -1;
        if (items.length) {
          state.activeIndex = 0;
        }
        if (!items.length) {
          clearResults();
          metaEl.textContent = "No matches found.";
          return;
        }
        refreshResults();
        metaEl.textContent = "Select a result to fill details.";
      } catch {
        if (currentToken !== state.token) {
          return;
        }
        clearResults();
        metaEl.textContent = "Lookup unavailable; enter values manually.";
      }
    }, LOOKUP_DELAY_MS);
  };
}

export function bindBookLookup({ searchInput, resultsEl, metaEl, onPick }) {
  const placeholder = placeholderCoverSvg();
  const state = {
    timer: null,
    token: 0,
    currentItems: [],
    activeIndex: -1,
  };

  const selectItem = (index) => {
    const item = state.currentItems[index];
    if (!item) {
      return;
    }
    searchInput.value = item.title || "";
    metaEl.textContent = describeLookup(item);
    clearResults();
    onPick(item);
  };

  const refreshResults = () => {
    const hasItems = state.currentItems.length > 0;
    if (!hasItems) {
      resultsEl.classList.remove("has-items");
      resultsEl.innerHTML = "";
      updateComboboxA11y(searchInput, resultsEl, false, -1);
      return;
    }
    renderResults(resultsEl, state.currentItems, placeholder, state.activeIndex);
    resultsEl.classList.add("has-items");
    updateComboboxA11y(searchInput, resultsEl, true, state.activeIndex);
  };

  const clearResults = () => {
    state.currentItems = [];
    state.activeIndex = -1;
    refreshResults();
  };

  const setActiveIndex = (index) => {
    if (!state.currentItems.length) {
      state.activeIndex = -1;
      refreshResults();
      return;
    }
    const bounded = ((index % state.currentItems.length) + state.currentItems.length) % state.currentItems.length;
    state.activeIndex = bounded;
    refreshResults();
  };

  resultsEl.addEventListener("mousemove", (event) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    setActiveIndex(Number(target.dataset.resultIndex));
  });

  resultsEl.addEventListener("click", (event) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    selectItem(Number(target.dataset.resultIndex));
  });

  const onInput = createLookupInputHandler({
    searchInput,
    metaEl,
    state,
    clearResults,
    refreshResults,
  });
  searchInput.addEventListener("input", onInput);

  searchInput.addEventListener("keydown", (event) => {
    handleLookupKeydown(
      event,
      state.currentItems,
      state.activeIndex,
      setActiveIndex,
      selectItem,
      clearResults,
      searchInput,
    );
  });

  const onDocClick = (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (event.target === searchInput || resultsEl.contains(event.target)) {
      return;
    }
    clearResults();
  };

  document.addEventListener("click", onDocClick);
  return { clearResults, destroy: () => document.removeEventListener("click", onDocClick) };
}
