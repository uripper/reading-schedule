import { qa } from "./dom.js";

function note(item) {
  const bits = [item.source || "", item.author || "", item.year || ""].filter(Boolean);
  return `Autofilled from ${bits.join(" · ")}`;
}

export function bindBookLookup(tr, seed = {}) {
  const [titleInput, wordsInput] = qa("input", tr);
  const meta = tr.querySelector(".lookup-meta");
  if (seed.lookup_note) meta.textContent = seed.lookup_note;

  let timer = null;
  titleInput.addEventListener("input", () => {
    const q = titleInput.value.trim();
    if (timer) clearTimeout(timer);
    if (q.length < 3) return;
    timer = setTimeout(async () => {
      try {
        const items = await window.plannerApi.searchBooks(q);
        const best = items?.[0];
        if (!best) return;
        if (!Number(wordsInput.value || 0) && best.words_estimate) {
          wordsInput.value = String(best.words_estimate);
        }
        meta.textContent = note(best);
      } catch {
        meta.textContent = "Lookup unavailable; enter values manually.";
      }
    }, 300);
  });
}
