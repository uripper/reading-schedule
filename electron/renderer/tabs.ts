import type { ActivateTabOptions } from "../types/types.js";
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
 * @param name - Tab name.
 * @returns Matching panel element or null.
 */
function panelByName(name: string): HTMLElement | null {
    return document.getElementById(`tab-${name}`);
}

/**
 * Applies active/inactive classes and ARIA state for a panel.
 * @param panel - Tab panel element.
 * @param active - Whether panel is active.
 */
function setPanelState(panel: HTMLElement, active: boolean): void {
    const NEXT_PANEL = panel;
    NEXT_PANEL.classList.toggle("is-active", active);
    NEXT_PANEL.hidden = !active;
    if (active) {
        NEXT_PANEL.setAttribute("aria-hidden", "false");
    } else {
        NEXT_PANEL.setAttribute("aria-hidden", "true");
    }
}

/**
 * Applies tab-role accessibility attributes for selected/unselected state.
 * @param button - Tab button element.
 * @param active - Whether button matches the active tab.
 */
function setTabAriaState(button: HTMLElement, active: boolean): void {
    const NEXT_BUTTON = button;
    if (button.getAttribute("role") !== "tab") {
        return;
    }
    if (active) {
        NEXT_BUTTON.setAttribute("aria-selected", "true");
        NEXT_BUTTON.tabIndex = 0;
        return;
    }
    NEXT_BUTTON.setAttribute("aria-selected", "false");
    NEXT_BUTTON.tabIndex = -1;
}

/**
 * Resolves best label for the active tab button.
 * @param currentLabel - Current fallback label.
 * @param button - Candidate active tab button.
 * @returns Next document-title label.
 */
function resolveActiveLabel(currentLabel: string, button: HTMLElement): string {
    const TEXT = button.textContent;
    if (typeof TEXT !== "string") {
        return currentLabel;
    }
    const TRIMMED_LABEL = TEXT.trim();
    if (TRIMMED_LABEL.length === 0) {
        return currentLabel;
    }
    return TRIMMED_LABEL;
}

/**
 * Activates a tab, updates panel visibility, and optionally focuses active panel.
 * @param name - Tab name to activate.
 * @param options - Optional activation behaviors.
 */
export function activateTab(
    name: string,
    options: ActivateTabOptions = {},
): void {
    const { focusPanel = false } = options;
    let activeLabel = DEFAULT_TITLE;

    for (const BUTTON of allTabButtons()) {
        const BTN = BUTTON;
        const ACTIVE = BTN.dataset.tab === name;
        BTN.classList.toggle("is-active", ACTIVE);
        setTabAriaState(BTN, ACTIVE);
        if (ACTIVE) {
            activeLabel = resolveActiveLabel(activeLabel, BTN);
        }
    }

    for (const PANEL of qa<HTMLElement>(TAB_PANEL_SELECTOR)) {
        setPanelState(PANEL, PANEL.id === `tab-${name}`);
    }
    const ACTIVE_PANEL = panelByName(name);
    if (focusPanel && ACTIVE_PANEL) {
        ACTIVE_PANEL.focus();
    }
    document.title = `${activeLabel} - Bartleby`;
    if (onTabActivated !== null) {
        onTabActivated(name);
    }
}

/**
 * Focuses and activates tab at a given index.
 * @param tabs - Ordered tab list.
 * @param index - Target index.
 */
function activateTabByIndex(tabs: HTMLElement[], index: number): void {
    const TARGET = tabs[index];
    TARGET.focus();
    activateTab(TARGET.dataset.tab ?? DEFAULT_TAB_NAME);
}

/**
 * Binds keyboard navigation for a tablist.
 * @param tabs - Ordered tab list.
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
            const NEXT = (index + direction + tabs.length) % tabs.length;
            activateTabByIndex(tabs, NEXT);
        });
    });
}

/**
 * Binds click/keyboard tab interactions and activation callback.
 * @param onChange - Callback invoked after tab activation.
 */
export function bindTabs(
    onChange: ((name: string) => void) | null = null,
): void {
    onTabActivated = onChange;
    for (const BUTTON of allTabButtons()) {
        const BTN = BUTTON;
        BTN.addEventListener("click", () => {
            activateTab(BTN.dataset.tab ?? DEFAULT_TAB_NAME);
        });
    }

    bindTabKeyboard(desktopTabs());
}
