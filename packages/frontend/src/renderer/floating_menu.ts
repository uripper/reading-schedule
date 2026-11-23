/**
 * Top-layer combobox menus. An open menu becomes a manual popover so dialogs
 * and scroll containers never clip it, and `@floating-ui/dom` keeps it beside
 * its anchor: it flips above near the bottom edge, shifts away from the side
 * edges, and shrinks to the room left in the window. Menus take the anchor's
 * width unless `data-floating-width="content"` is set. Browsers without the
 * Popover API fall back to the in-flow `has-items` menu.
 *
 * Each open period gets a generation number so a placement started before a
 * close never lands after a reopen, and tracking stops by itself when a
 * rerender removes the menu or its anchor without closing it.
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
/** `data-floating-width` value that sizes a menu to its content. */
export const CONTENT_WIDTH = "content";
const STOP_TRACKING = new WeakMap<HTMLElement, () => void>();
const GENERATION = new WeakMap<HTMLElement, number>();

// audit-allow-local-types: Private arguments for one placement pass.
type Placement = {
    anchor: HTMLElement;
    isCurrent: () => boolean;
    matchAnchorWidth: boolean;
    menu: HTMLElement;
};

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
 * Starts a new open period so pending placements from older ones are ignored.
 * @param menu - Menu element.
 * @returns Check that is `true` while this period is still the current one.
 */
function nextGeneration(menu: HTMLElement): () => boolean {
    const CURRENT = (GENERATION.get(menu) ?? 0) + 1;
    GENERATION.set(menu, CURRENT);
    return () => GENERATION.get(menu) === CURRENT;
}

/**
 * Caps the menu to the room left in the window, never past it.
 * @param placement - Anchor, menu, width mode, and generation check.
 * @param metrics - Height cap and viewport padding.
 * @returns `size` middleware for this placement pass.
 */
function fitToViewport(placement: Placement, metrics: MenuMetrics) {
    const { isCurrent, matchAnchorWidth, menu } = placement;
    return size({
        apply({ availableHeight, availableWidth, rects }) {
            if (!isCurrent()) {
                return;
            }
            const HEIGHT = Math.min(
                metrics.maxHeightPx,
                Math.max(0, availableHeight),
            );
            menu.style.maxHeight = `${HEIGHT}px`;
            menu.style.maxWidth = `${availableWidth}px`;
            if (matchAnchorWidth) {
                menu.style.width = `${Math.min(rects.reference.width, availableWidth)}px`;
            }
        },
        padding: metrics.paddingPx,
    });
}

/**
 * Places the menu under its anchor, or above it when there is more room.
 * Results from a closed or replaced open period are dropped.
 * @param placement - Anchor, menu, width mode, and generation check.
 */
async function placeMenu(placement: Placement): Promise<void> {
    const { anchor, isCurrent, menu } = placement;
    const METRICS = menuMetrics(menu);
    const PADDING = METRICS.paddingPx;
    const POSITION = await computePosition(anchor, menu, {
        middleware: [
            offset(METRICS.offsetPx),
            flip({ padding: PADDING }),
            shift({ padding: PADDING }),
            fitToViewport(placement, METRICS),
        ],
        placement: "bottom-start",
        strategy: "fixed",
    });
    if (!isCurrent()) {
        return;
    }
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
    const IS_CURRENT = nextGeneration(menu);
    const UPDATE = (): void => {
        if (!menu.isConnected || !anchor.isConnected) {
            hideMenu(menu);
            return;
        }
        placeMenu({
            anchor,
            isCurrent: IS_CURRENT,
            matchAnchorWidth,
            menu,
        }).catch((error: unknown) => {
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
    nextGeneration(menu);
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
