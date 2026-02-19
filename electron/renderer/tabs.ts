
import { qa } from "./dom.js";

type TabName = string;

type ActivateTabOptions = {
  focusPanel?: boolean;
};

let onTabActivated: (name: TabName) => void = () => {};

function allTabButtons() {
  return qa<HTMLElement>(".tab[data-tab]");
}

function desktopTabs() {
  return qa<HTMLElement>(".tabs .tab[data-tab]");
}

function panelByName(name: TabName): HTMLElement | null {
  return document.getElementById(`tab-${name}`);
}

function setPanelState(panel: HTMLElement, active: boolean): void {
  panel.classList.toggle("is-active", active);
  panel.hidden = !active;
  if (active) {
    panel.setAttribute("aria-hidden", "false");
  } else {
    panel.setAttribute("aria-hidden", "true");
  }
}

export function activateTab(name: TabName, options: ActivateTabOptions = {}) {
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
    if (active) {
      activeLabel = btn.textContent?.trim() || activeLabel;
    }
  });

  qa<HTMLElement>(".panel").forEach((panel) => setPanelState(panel, panel.id === `tab-${name}`));
  const activePanel = panelByName(name);
  if (focusPanel && activePanel) {
    activePanel.focus();
  }
  document.title = `${activeLabel} - Bartleby`;
  onTabActivated(name);
}

function activateTabByIndex(tabs: HTMLElement[], index: number): void {
  const target = tabs[index];
  if (!target) {
    return;
  }
  target.focus();
  activateTab(target.dataset.tab || "today");
}

function bindTabKeyboard(tabs: HTMLElement[]): void {
  tabs.forEach((btn, index) => {
    btn.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      if (event.key === "Home") {
        activateTabByIndex(tabs, 0);
        return;
      }
      if (event.key === "End") {
        activateTabByIndex(tabs, tabs.length - 1);
        return;
      }
      let direction = -1;
      if (event.key === "ArrowRight") {
        direction = 1;
      }
      const next = (index + direction + tabs.length) % tabs.length;
      activateTabByIndex(tabs, next);
    });
  });
}

export function bindTabs(onChange: (name: TabName) => void = () => {}) {
  onTabActivated = onChange;
  allTabButtons().forEach((btn) => {
    btn.onclick = () => activateTab(btn.dataset.tab || "today");
  });

  bindTabKeyboard(desktopTabs());
}
