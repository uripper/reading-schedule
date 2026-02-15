import { el } from "./dom.js";
import { bindBooksUI, collectBooks, fillBooks } from "./books.js";
import { renderCalendar } from "./calendar.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { renderSummary } from "./summary.js";
import { activateTab, bindTabs } from "./tabs.js";

const state = { books: [] };

function setStatus(message, isError = false) {
  const n = el("status");
  n.textContent = message;
  n.style.color = isError ? "#ff6c7a" : "#93a3bd";
}

function payload() {
  state.books = collectBooks();
  return { planner: "mip", books: state.books, settings: collectSettings() };
}

async function run() {
  try {
    setStatus("Generating plan...");
    const data = await window.plannerApi.generate(payload());
    renderSummary(data.summary, state.books);
    renderCalendar(data.schedule);
    activateTab("schedule");
    setStatus("Plan generated.");
  } catch (error) {
    setStatus(error.message || "Failed to generate plan", true);
  }
}

async function loadSample() {
  try {
    const sample = await window.plannerApi.sample();
    fillSettings(sample.settings);
    fillBooks(sample.books);
    setStatus("Loaded sample data.");
  } catch (error) {
    setStatus(error.message || "Failed to load sample", true);
  }
}

initSettingsGrid();
bindTabs();
bindBooksUI();
el("runBtn").onclick = run;
loadSample();
