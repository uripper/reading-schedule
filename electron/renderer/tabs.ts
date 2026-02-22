import { qa } from "./dom.js";

interface ActivateTabOptions {
  focusPanel?: boolean;
}

let onTabActivated: (name: string) => void = () => {};

/**
 * Returns all tab buttons across desktop/mobile navs.
 * @returns Tab button elements.
 */
function allTabButtons() {
  return qa<HTMLElement>(".tab[data-tab]");
}

/**
 * Returns desktop tab buttons used for keyboard roving focus.
 * @returns Desktop tab button elements.
 */
function desktopTabs() {
  return qa<HTMLElement>(".tabs .tab[data-tab]");
}

/**
 * Resolves tab panel element by tab name.
 * @param name Tab name.
 * @returns Matching panel element or null.
 */
function panelByName(name: string): HTMLElement | null {
  return document.getElementById(`tab-${name}`);
}

/**
 * Applies active/inactive classes and ARIA state for a panel.
 * @param panel Tab panel element.
 * @param active Whether panel is active.
 */
function setPanelState(panel: HTMLElement, active: boolean): void {
  panel.classList.toggle("is-active", active);
  panel.hidden = !active;
  if (active) {
    panel.setAttribute("aria-hidden", "false");
  } else {
    panel.setAttribute("aria-hidden", "true");
  }
}

/**
 * Activates a tab, updates panel visibility, and optionally focuses active panel.
 * @param name Tab name to activate.
 * @param options Optional activation behaviors.
 */
export function activateTab(name: string, options: ActivateTabOptions = {}) {
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

  qa<HTMLElement>(".panel").forEach((panel) => {
    setPanelState(panel, panel.id === `tab-${name}`);
  });
  const activePanel = panelByName(name);
  if (focusPanel && activePanel) {
    activePanel.focus();
  }
  document.title = `${activeLabel} - Bartleby`;
  onTabActivated(name);
}

/**
 * Focuses and activates tab at a given index.
 * @param tabs Ordered tab list.
 * @param index Target index.
 */
function activateTabByIndex(tabs: HTMLElement[], index: number): void {
  const target = tabs[index];
  if (!target) {
    return;
  }
  target.focus();
  activateTab(target.dataset.tab ?? "today");
}

/**
 * Binds keyboard navigation for a tablist.
 * @param tabs Ordered tab list.
 */
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

/**
 * Binds click/keyboard tab interactions and activation callback.
 * @param onChange Callback invoked after tab activation.
 */
export function bindTabs(onChange: (name: string) => void = () => {}) {
  onTabActivated = onChange;
  allTabButtons().forEach((btn) => {
    btn.onclick = () => {
      activateTab(btn.dataset.tab ?? "today");
    };
  });

  bindTabKeyboard(desktopTabs());
}
