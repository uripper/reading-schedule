import { el } from "./dom.js";
import { bindBooksUI, collectBooks, fillBooks } from "./books.js";
import { renderCalendar } from "./calendar.js";
import { bindHelpDialog, addLog } from "./help.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { activateTab, bindTabs } from "./tabs.js";

const state = { books: [], lastResult: null, ready: false };
let persistTimer = null;

function totalsFromSummary(summary) {
  return Object.fromEntries(Object.entries(summary?.per_book || {}).map(([id, info]) => [id, Number(info.words_total || 0)]));
}

function setStatus(message, isError = false) {
  const n = el("status");
  n.textContent = message;
  n.style.color = isError ? "#ff7f90" : "#9fb2d1";
  addLog(message);
}

function draftData() {
  state.books = collectBooks();
  return { books: state.books, settings: collectSettings(), last_result: state.lastResult };
}

function queuePersist() {
  if (!state.ready) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => window.plannerApi.saveState(draftData()).catch((e) => addLog(`Save failed: ${e.message}`)), 250);
}

async function run() {
  try {
    setStatus("Generating plan...");
    const payload = { planner: "mip", books: collectBooks(), settings: collectSettings() };
    const data = await window.plannerApi.generate(payload);
    state.books = payload.books;
    state.lastResult = { schedule: data.schedule, summary: data.summary, created_at: new Date().toISOString() };
    renderCalendar(data.schedule, totalsFromSummary(data.summary));
    activateTab("schedule");
    if (data.summary.feasibility_warning) addLog(data.summary.feasibility_warning);
    addLog(`Status ${data.summary.status}. Planned ${data.summary.total_planned_minutes}/${data.summary.total_available_minutes} minutes.`);
    await window.plannerApi.saveState(draftData());
    setStatus("Plan generated.");
  } catch (error) {
    setStatus(error.message || "Failed to generate plan", true);
  }
}

async function init() {
  initSettingsGrid(); bindTabs(); bindBooksUI(); bindHelpDialog();
  try {
    const saved = await window.plannerApi.loadState();
    const source = saved?.settings && saved?.books ? saved : await window.plannerApi.sample();
    fillSettings(source.settings); fillBooks(source.books); state.books = source.books;
    if (saved?.last_result?.schedule?.length) {
      state.lastResult = saved.last_result;
      renderCalendar(saved.last_result.schedule, totalsFromSummary(saved.last_result.summary));
      addLog("Loaded previous schedule.");
    }
    state.ready = true;
    document.addEventListener("input", queuePersist);
    document.addEventListener("change", queuePersist);
    setStatus(saved ? "Loaded saved data." : "Loaded sample data.");
  } catch (error) {
    setStatus(error.message || "Failed to load initial data", true);
  }
  el("runBtn").onclick = run;
}

init();
