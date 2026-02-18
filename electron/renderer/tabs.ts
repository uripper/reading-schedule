// @ts-nocheck
import { qa } from "./dom.js";

let onTabActivated = () => {};

function allTabButtons() {
  return qa(".tab[data-tab]");
}

function desktopTabs() {
  return qa(".tabs .tab[data-tab]");
}

function panelByName(name) {
  return document.getElementById(`tab-${name}`);
}

function setPanelState(panel, active) {
  panel.classList.toggle("is-active", active);
  panel.hidden = !active;
  if (active) {
    panel.setAttribute("aria-hidden", "false");
  } else {
    panel.setAttribute("aria-hidden", "true");
  }
}

export function activateTab(name, options = {}) {
  const { focusPanel = false } = options;
  let activeLabel = "Bartleby";

  allTabButtons().forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle("is-active", active);
    if (btn.getAttribute("role") === "tab") {
      if (active) {
        btn.setAttribute("aria-selected", "true");
        btn.tabIndex = 0;
      } else {
        btn.setAttribute("aria-selected", "false");
        btn.tabIndex = -1;
      }
    }
    if (active) activeLabel = btn.textContent?.trim() || activeLabel;
  });

  qa(".panel").forEach((panel) => setPanelState(panel, panel.id === `tab-${name}`));
  const activePanel = panelByName(name);
  if (focusPanel && activePanel) activePanel.focus();
  document.title = `${activeLabel} - Bartleby`;
  onTabActivated(name);
}

function activateTabByIndex(tabs, index) {
  const target = tabs[index];
  if (!target) return;
  target.focus();
  activateTab(target.dataset.tab || "today");
}

function bindTabKeyboard(tabs) {
  tabs.forEach((btn, index) => {
    btn.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") return activateTabByIndex(tabs, 0);
      if (event.key === "End") return activateTabByIndex(tabs, tabs.length - 1);
      let direction = -1;
      if (event.key === "ArrowRight") {
        direction = 1;
      }
      const next = (index + direction + tabs.length) % tabs.length;
      activateTabByIndex(tabs, next);
    });
  });
}

export function bindTabs(onChange = () => {}) {
  onTabActivated = onChange;
  allTabButtons().forEach((btn) => {
    btn.onclick = () => activateTab(btn.dataset.tab || "today");
  });

  bindTabKeyboard(desktopTabs());
}
