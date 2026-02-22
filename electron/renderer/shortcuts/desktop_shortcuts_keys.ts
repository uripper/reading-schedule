/**
 *
 * @param event
 */
export function isCommandPressed(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey;
}

/**
 *
 * @param event
 */
export function isZoomInShortcut(event: KeyboardEvent): boolean {
  return event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
}

/**
 *
 * @param event
 */
export function isZoomOutShortcut(event: KeyboardEvent): boolean {
  return (
    event.key === "-" || event.key === "_" || event.code === "NumpadSubtract"
  );
}

/**
 *
 * @param event
 */
export function isZoomResetShortcut(event: KeyboardEvent): boolean {
  return event.key === "0";
}
