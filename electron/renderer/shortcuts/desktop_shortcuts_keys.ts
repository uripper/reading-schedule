/**
 * Detects whether the platform command modifier is currently pressed.
 * @param event Keyboard event being evaluated.
 * @returns True when Ctrl (or Cmd on macOS) is active without Alt.
 */
export function isCommandPressed(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && !event.altKey;
}

/**
 * Detects keyboard combinations used to zoom in.
 * @param event Keyboard event being evaluated.
 * @returns True when the key combo should trigger zoom-in.
 */
export function isZoomInShortcut(event: KeyboardEvent): boolean {
    return event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
}

/**
 * Detects keyboard combinations used to zoom out.
 * @param event Keyboard event being evaluated.
 * @returns True when the key combo should trigger zoom-out.
 */
export function isZoomOutShortcut(event: KeyboardEvent): boolean {
    return (
        event.key === "-" ||
        event.key === "_" ||
        event.code === "NumpadSubtract"
    );
}

/**
 * Detects keyboard combinations used to reset zoom.
 * @param event Keyboard event being evaluated.
 * @returns True when the key combo should reset zoom.
 */
export function isZoomResetShortcut(event: KeyboardEvent): boolean {
    return event.key === "0";
}
