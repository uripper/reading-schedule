/** Publishes the Library mass-edit selection to features outside the books controller. */

const LISTENERS = new Set<(bookIds: readonly string[]) => void>();

/**
 * Notifies listeners of the selected visible books; empty when mass edit is off.
 * @param active - Whether mass edit mode is on.
 * @param bookIds - Selected books that are visible in the Library.
 */
export function publishMassEditSelection(
    active: boolean,
    bookIds: readonly string[],
): void {
    let selected: readonly string[] = [];
    if (active) {
        selected = bookIds;
    }
    for (const LISTENER of LISTENERS) {
        LISTENER(selected);
    }
}

/** Subscribes to mass-edit selection changes. */
export function onMassEditSelectionChanged(
    listener: (bookIds: readonly string[]) => void,
): void {
    LISTENERS.add(listener);
}
