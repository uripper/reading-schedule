import type { ActivateTabOptions } from "../types/types.ts";
import { qa } from "./dom.ts";

const DEFAULT_TAB_NAME = "today";
const DEFAULT_TITLE = "Bartleby";
const TAB_PANEL_SELECTOR = ".panel";
const TAB_BUTTON_SELECTOR = ".tab[data-tab]";
const TAB_DESKTOP_SELECTOR = ".tabs .tab[data-tab]";
const TAB_TITLE_SUFFIX = " - Bartleby";
const HOME_KEY = "Home";
const END_KEY = "End";
const LEFT_KEY = "ArrowLeft";
const RIGHT_KEY = "ArrowRight";
const TAB_NAVIGATION_KEYS = [RIGHT_KEY, LEFT_KEY, HOME_KEY, END_KEY];

let onTabActivated: ((name: string) => void) | null = null;
let desktopTabButtonsState: HTMLElement[] = [];

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
    const FOCUS_PANEL = options.focusPanel ?? false;
    const ACTIVE_LABEL = syncTabButtons(name);
    syncTabPanels(name, FOCUS_PANEL);
    document.title = `${ACTIVE_LABEL}${TAB_TITLE_SUFFIX}`;
    notifyTabActivated(name);
}

/**
 * Focuses and activates tab at a given index.
 * @param tabs - Ordered tab list.
 * @param index - Target index.
 */
function activateTabByIndex(tabs: HTMLElement[], index: number): void {
    const TARGET = tabs[index];
    TARGET.focus();
    activateTab(tabNameFromButton(TARGET));
}

function tabNameFromButton(button: HTMLElement): string {
    return button.dataset.tab ?? DEFAULT_TAB_NAME;
}

function syncTabButtons(name: string): string {
    let activeLabel = DEFAULT_TITLE;
    for (const BUTTON of allTabButtons()) {
        const ACTIVE = BUTTON.dataset.tab === name;
        BUTTON.classList.toggle("is-active", ACTIVE);
        setTabAriaState(BUTTON, ACTIVE);
        if (ACTIVE) {
            activeLabel = resolveActiveLabel(activeLabel, BUTTON);
        }
    }
    return activeLabel;
}

function syncTabPanels(name: string, focusPanel: boolean): void {
    for (const PANEL of qa<HTMLElement>(TAB_PANEL_SELECTOR)) {
        setPanelState(PANEL, PANEL.id === `tab-${name}`);
    }
    const ACTIVE_PANEL = panelByName(name);
    if (focusPanel && ACTIVE_PANEL !== null) {
        ACTIVE_PANEL.focus();
    }
}

function notifyTabActivated(name: string): void {
    if (onTabActivated === null) {
        return;
    }
    onTabActivated(name);
}

function isTabNavigationKey(key: string): boolean {
    return TAB_NAVIGATION_KEYS.includes(key);
}

function tabIndexDelta(key: string): number {
    if (key === RIGHT_KEY) {
        return 1;
    }
    return -1;
}

function nextTabIndex(
    currentIndex: number,
    key: string,
    tabs: HTMLElement[],
): number {
    if (key === HOME_KEY) {
        return 0;
    }
    if (key === END_KEY) {
        return tabs.length - 1;
    }
    return (currentIndex + tabIndexDelta(key) + tabs.length) % tabs.length;
}

function desktopTabIndex(button: HTMLElement): number {
    return desktopTabButtonsState.indexOf(button);
}

function onTabClick(event: Event): void {
    if (!(event.currentTarget instanceof HTMLElement)) {
        return;
    }
    activateTab(tabNameFromButton(event.currentTarget));
}

function onDesktopTabKeydown(event: KeyboardEvent): void {
    if (!(event.currentTarget instanceof HTMLElement)) {
        return;
    }
    if (!isTabNavigationKey(event.key)) {
        return;
    }
    const CURRENT_INDEX = desktopTabIndex(event.currentTarget);
    if (CURRENT_INDEX < 0) {
        return;
    }
    event.preventDefault();
    activateTabByIndex(
        desktopTabButtonsState,
        nextTabIndex(CURRENT_INDEX, event.key, desktopTabButtonsState),
    );
}

/**
 * Binds keyboard navigation for a tablist.
 * @param tabs - Ordered tab list.
 */
function bindTabKeyboard(tabs: HTMLElement[]): void {
    desktopTabButtonsState = tabs;
    for (const BUTTON of tabs) {
        BUTTON.addEventListener("keydown", onDesktopTabKeydown);
    }
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
        BUTTON.addEventListener("click", onTabClick);
    }

    bindTabKeyboard(desktopTabs());
}
