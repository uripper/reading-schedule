import { el } from "./dom.js";
import { bindBooksUI, collectBooks, fillBooks } from "./books.js";
import { renderCalendar } from "./calendar.js";
import { bindHelpDialog, addLog } from "./help.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { activateTab, bindTabs } from "./tabs.js";

const state = { books: [] };

function setStatus(message, isError = false) {
  const n = el("status");
  n.textContent = message;
  n.style.color = isError ? "#ff7f90" : "#9fb2d1";
  addLog(message);
}

function payload() {
  state.books = collectBooks();
  return { planner: "mip", books: state.books, settings: collectSettings() };
}

async function run() {
  try {
    setStatus("Generating plan...");
    const data = await window.plannerApi.generate(payload());
    renderCalendar(data.schedule);
    activateTab("schedule");
    const s = data.summary;
    if (s.feasibility_warning) addLog(s.feasibility_warning);
    addLog(`Status ${s.status}. Planned ${s.total_planned_minutes}/${s.total_available_minutes} minutes.`);
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
bindHelpDialog();
el("runBtn").onclick = run;
loadSample();
