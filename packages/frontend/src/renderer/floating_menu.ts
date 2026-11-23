/**
 * Top-layer combobox menus. An open menu becomes a manual popover so dialogs
 * and scroll containers never clip it, and `@floating-ui/dom` keeps it beside
 * its anchor: it flips above near the bottom edge, shifts away from the side
 * edges, and shrinks to the room left in the window. Menus take the anchor's
 * width unless `data-floating-width="content"` is set. Browsers without the
 * Popover API fall back to the in-flow `has-items` menu.
 */
import {
    autoUpdate,
    computePosition,
    flip,
    offset,
    shift,
    size,
} from "@floating-ui/dom";
import { logError } from "../types/logger.ts";

const OPEN_CLASS = "has-items";
const POPOVER_ATTR = "popover";
const POPOVER_MODE = "manual";
const POPOVER_OPEN_SELECTOR = ":popover-open";
const OFFSET_TOKEN = "--token-control-menuOffset";
const PADDING_TOKEN = "--token-control-menuViewportPadding";
const MAX_HEIGHT_TOKEN = "--token-control-menuMaxHeight";
const FALLBACK_OFFSET_PX = 4;
const FALLBACK_PADDING_PX = 8;
const FALLBACK_MAX_HEIGHT_PX = 320;
const MIN_MENU_HEIGHT_PX = 96;
/** `data-floating-width` value that sizes a menu to its content. */
export const CONTENT_WIDTH = "content";
const STOP_TRACKING = new WeakMap<HTMLElement, () => void>();

// audit-allow-local-types: Private placement inputs read once per update.
type MenuMetrics = {
    maxHeightPx: number;
    offsetPx: number;
    paddingPx: number;
};

/**
 * Reads a pixel-valued design token from the menu's computed style.
 * @param menu - Menu element inheriting the tokens.
 * @param name - Custom property name.
 * @param fallbackPx - Value used when the token is missing.
 * @returns Token value in pixels.
 */
function tokenPixels(
    menu: HTMLElement,
    name: string,
    fallbackPx: number,
): number {
    const VALUE = Number.parseFloat(
        getComputedStyle(menu).getPropertyValue(name),
    );
    if (Number.isFinite(VALUE)) {
        return VALUE;
    }
    return fallbackPx;
}

/**
 * Collects the spacing tokens used to place a menu.
 * @param menu - Menu element inheriting the tokens.
 * @returns Offset, viewport padding, and height cap in pixels.
 */
function menuMetrics(menu: HTMLElement): MenuMetrics {
    return {
        maxHeightPx: tokenPixels(
            menu,
            MAX_HEIGHT_TOKEN,
            FALLBACK_MAX_HEIGHT_PX,
        ),
        offsetPx: tokenPixels(menu, OFFSET_TOKEN, FALLBACK_OFFSET_PX),
        paddingPx: tokenPixels(menu, PADDING_TOKEN, FALLBACK_PADDING_PX),
    };
}

/**
 * Places the menu under its anchor, or above it when there is more room.
 * @param anchor - Field the menu belongs to.
 * @param menu - Open menu element.
 * @param matchAnchorWidth - Whether the menu takes the anchor's width.
 */
async function placeMenu(
    anchor: HTMLElement,
    menu: HTMLElement,
    matchAnchorWidth: boolean,
): Promise<void> {
    const METRICS = menuMetrics(menu);
    const PADDING = METRICS.paddingPx;
    const POSITION = await computePosition(anchor, menu, {
        middleware: [
            offset(METRICS.offsetPx),
            flip({ padding: PADDING }),
            shift({ padding: PADDING }),
            size({
                apply({ availableHeight, availableWidth, rects }) {
                    const HEIGHT = Math.min(
                        METRICS.maxHeightPx,
                        availableHeight,
                    );
                    menu.style.maxHeight = `${Math.max(MIN_MENU_HEIGHT_PX, HEIGHT)}px`;
                    menu.style.maxWidth = `${availableWidth}px`;
                    if (matchAnchorWidth) {
                        menu.style.width = `${Math.min(rects.reference.width, availableWidth)}px`;
                    }
                },
                padding: PADDING,
            }),
        ],
        placement: "bottom-start",
        strategy: "fixed",
    });
    menu.style.left = `${POSITION.x}px`;
    menu.style.top = `${POSITION.y}px`;
}

/**
 * Checks whether the browser can promote the menu to the top layer.
 * @param menu - Menu element.
 * @returns `true` when the Popover API is available and the menu is attached.
 */
function canUsePopover(menu: HTMLElement): boolean {
    return typeof menu.showPopover === "function" && menu.isConnected;
}

/**
 * Shows the menu in the top layer and keeps it placed while it is open.
 * @param menu - Menu element.
 * @param anchor - Field the menu belongs to.
 * @param matchAnchorWidth - Whether the menu takes the anchor's width.
 */
function showMenu(
    menu: HTMLElement,
    anchor: HTMLElement,
    matchAnchorWidth: boolean,
): void {
    if (!menu.hasAttribute(POPOVER_ATTR)) {
        menu.setAttribute(POPOVER_ATTR, POPOVER_MODE);
    }
    if (!menu.matches(POPOVER_OPEN_SELECTOR)) {
        menu.showPopover();
    }
    if (STOP_TRACKING.has(menu)) {
        return;
    }
    const UPDATE = (): void => {
        placeMenu(anchor, menu, matchAnchorWidth).catch((error: unknown) => {
            logError("Could not position the menu.", error);
        });
    };
    STOP_TRACKING.set(menu, autoUpdate(anchor, menu, UPDATE));
}

/**
 * Hides the menu and stops following its anchor.
 * @param menu - Menu element.
 */
function hideMenu(menu: HTMLElement): void {
    STOP_TRACKING.get(menu)?.();
    STOP_TRACKING.delete(menu);
    if (menu.matches(POPOVER_OPEN_SELECTOR)) {
        menu.hidePopover();
    }
}

/**
 * Opens or closes a combobox menu next to its anchor field.
 * @param menu - Menu (listbox) element.
 * @param anchor - Field the menu belongs to.
 * @param open - Whether the menu should show.
 */
export function syncFloatingMenu(
    menu: HTMLElement,
    anchor: HTMLElement,
    open: boolean,
): void {
    menu.classList.toggle(OPEN_CLASS, open);
    if (!canUsePopover(menu)) {
        return;
    }
    if (open) {
        showMenu(menu, anchor, menu.dataset.floatingWidth !== CONTENT_WIDTH);
        return;
    }
    hideMenu(menu);
}
