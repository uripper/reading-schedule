/** Builds the shared `?` hint marker that reveals help text on hover or focus. */

/**
 * Creates a focusable `?` marker whose tooltip shows the given help text.
 * @param text - Help text; blank text produces no marker.
 * @returns Hint marker element, or `null` when there is no text.
 */
export function hintDot(text?: string): HTMLSpanElement | null {
    const NORMALIZED_TEXT = String(text ?? "").trim();
    if (NORMALIZED_TEXT.length === 0) {
        return null;
    }
    const DOT = document.createElement("span");
    DOT.className = "hint-dot";
    DOT.tabIndex = 0;
    DOT.setAttribute("role", "note");
    DOT.setAttribute("aria-label", NORMALIZED_TEXT);
    DOT.dataset.tip = NORMALIZED_TEXT;
    DOT.textContent = "?";
    return DOT;
}
