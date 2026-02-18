import { describeLookup, placeholderCoverSvg } from "./helpers.js";

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 8;

function renderResults(resultsEl, items, placeholder) {
  resultsEl.innerHTML = "";
  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-result";
    btn.dataset.resultIndex = String(index);

    const thumb = document.createElement("img");
    thumb.className = "book-result-cover";
    thumb.loading = "lazy";
    thumb.src = item.cover_url || placeholder;
    thumb.alt = item.title ? `Cover for ${item.title}` : "Book cover";
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
    meta.textContent = [item.author || "", item.year || "", item.pages_estimate ? `${item.pages_estimate} pages` : ""].filter(Boolean).join(" · ");

    textWrap.append(title, meta);
    btn.append(thumb, textWrap);
    resultsEl.append(btn);
  });
}

export function bindBookLookup({ searchInput, resultsEl, metaEl, onPick }) {
  const placeholder = placeholderCoverSvg();
  let timer = null;
  let token = 0;
  let currentItems = [];

  const clearResults = () => {
    currentItems = [];
    resultsEl.classList.remove("has-items");
    resultsEl.innerHTML = "";
  };

  resultsEl.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest(".book-result") : null;
    if (!target) return;
    const item = currentItems[Number(target.dataset.resultIndex)];
    if (!item) return;
    searchInput.value = item.title || "";
    metaEl.textContent = describeLookup(item);
    clearResults();
    onPick(item);
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (timer) clearTimeout(timer);
    if (q.length < 2) return clearResults(), void (metaEl.textContent = "");
    timer = setTimeout(async () => {
      token += 1;
      const current = token;
      try {
        const items = (await window.plannerApi.searchBooks(q)).slice(0, RESULT_LIMIT);
        if (current !== token) return;
        currentItems = items;
        if (!items.length) return clearResults(), void (metaEl.textContent = "No matches found.");
        renderResults(resultsEl, items, placeholder);
        resultsEl.classList.add("has-items");
        metaEl.textContent = "Select a result to fill details.";
      } catch {
        if (current !== token) return;
        clearResults();
        metaEl.textContent = "Lookup unavailable; enter values manually.";
      }
    }, LOOKUP_DELAY_MS);
  });

  searchInput.addEventListener("keydown", (event) => event.key === "Escape" && (clearResults(), searchInput.blur()));
  const onDocClick = (event) => {
    if (!(event.target instanceof Node)) return;
    if (event.target === searchInput || resultsEl.contains(event.target)) return;
    clearResults();
  };
  document.addEventListener("click", onDocClick);
  return { clearResults, destroy: () => document.removeEventListener("click", onDocClick) };
}
