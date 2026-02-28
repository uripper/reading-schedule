import { type ActivateTabOptions } from "../types/types.js";
import { qa } from "./dom.js";

const DEFAULT_TAB_NAME = "today";
const DEFAULT_TITLE = "Bartleby";
const TAB_PANEL_SELECTOR = ".panel";
const TAB_BUTTON_SELECTOR = ".tab[data-tab]";
const TAB_DESKTOP_SELECTOR = ".tabs .tab[data-tab]";

let onTabActivated: ((name: string) => void) | null = null;

/**
 * Returns all tab buttons across desktop/mobile navs.
 * @returns Tab button elements.
 */
function allTabButtons(): HTMLElement[] {
    return qa<HTMLElement>(TAB_BUTTON_SELECTOR);
}

/**
 * Returns desktop tab buttons used for keyboard roving focus.
 * @returns Desktop tab button elements.
 */
function desktopTabs(): HTMLElement[] {
    return qa<HTMLElement>(TAB_DESKTOP_SELECTOR);
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
    const nextPanel = panel;
    nextPanel.classList.toggle("is-active", active);
    nextPanel.hidden = !active;
    if (active) {
        nextPanel.setAttribute("aria-hidden", "false");
    } else {
        nextPanel.setAttribute("aria-hidden", "true");
    }
}

/**
 * Applies tab-role accessibility attributes for selected/unselected state.
 * @param button Tab button element.
 * @param active Whether button matches the active tab.
 */
function setTabAriaState(button: HTMLElement, active: boolean): void {
    const nextButton = button;
    if (button.getAttribute("role") !== "tab") {
        return;
    }
    if (active) {
        nextButton.setAttribute("aria-selected", "true");
        nextButton.tabIndex = 0;
        return;
    }
    nextButton.setAttribute("aria-selected", "false");
    nextButton.tabIndex = -1;
}

/**
 * Resolves best label for the active tab button.
 * @param currentLabel Current fallback label.
 * @param button Candidate active tab button.
 * @returns Next document-title label.
 */
function resolveActiveLabel(currentLabel: string, button: HTMLElement): string {
    const text = button.textContent;
    if (typeof text !== "string") {
        return currentLabel;
    }
    const trimmedLabel = text.trim();
    if (trimmedLabel.length === 0) {
        return currentLabel;
    }
    return trimmedLabel;
}

/**
 * Activates a tab, updates panel visibility, and optionally focuses active panel.
 * @param name Tab name to activate.
 * @param options Optional activation behaviors.
 */
export function activateTab(
    name: string,
    options: ActivateTabOptions = {},
): void {
    const { focusPanel = false } = options;
    let activeLabel = DEFAULT_TITLE;

    for (const button of allTabButtons()) {
        const btn = button;
        const active = btn.dataset.tab === name;
        btn.classList.toggle("is-active", active);
        setTabAriaState(btn, active);
        if (active) {
            activeLabel = resolveActiveLabel(activeLabel, btn);
        }
    }

    for (const panel of qa<HTMLElement>(TAB_PANEL_SELECTOR)) {
        setPanelState(panel, panel.id === `tab-${name}`);
    }
    const activePanel = panelByName(name);
    if (focusPanel && activePanel) {
        activePanel.focus();
    }
    document.title = `${activeLabel} - Bartleby`;
    if (onTabActivated !== null) {
        onTabActivated(name);
    }
}

/**
 * Focuses and activates tab at a given index.
 * @param tabs Ordered tab list.
 * @param index Target index.
 */
function activateTabByIndex(tabs: HTMLElement[], index: number): void {
    const target = tabs[index];
    target.focus();
    activateTab(target.dataset.tab ?? DEFAULT_TAB_NAME);
}

/**
 * Binds keyboard navigation for a tablist.
 * @param tabs Ordered tab list.
 */
function bindTabKeyboard(tabs: HTMLElement[]): void {
    tabs.forEach((btn, index) => {
        btn.addEventListener("keydown", (event) => {
            if (
                !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
            ) {
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
export function bindTabs(
    onChange: ((name: string) => void) | null = null,
): void {
    onTabActivated = onChange;
    for (const button of allTabButtons()) {
        const btn = button;
        btn.addEventListener("click", () => {
            activateTab(btn.dataset.tab ?? DEFAULT_TAB_NAME);
        });
    }

    bindTabKeyboard(desktopTabs());
}
