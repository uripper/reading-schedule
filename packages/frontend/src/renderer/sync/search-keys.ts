/** Keyboard behavior for the library search combobox. */

// audit-allow-local-types: Private callbacks for DOM keyboard interaction.
type SearchActions = Parameters<typeof bindKoboSearchKeys>[1];

/** Handles keys only while the dropdown owns the interaction. */
function handleKey(event: KeyboardEvent, actions: SearchActions): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveOrOpen(event.key, actions);
        return;
    }
    if (!actions.isOpen()) {
        return;
    }
    handleOpenKey(event, actions);
}

/** Opens the list before moving its active result. */
function moveOrOpen(key: string, actions: SearchActions): void {
    if (!actions.isOpen()) {
        actions.open();
        return;
    }
    let step = 1;
    if (key === "ArrowUp") {
        step = -1;
    }
    actions.move(step);
}

/** Escape closes search before the parent dialog; Enter confirms the active result. */
function handleOpenKey(event: KeyboardEvent, actions: SearchActions): void {
    if (event.key === "Tab") {
        actions.close();
        return;
    }
    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        actions.close();
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        actions.pick();
    }
}

/** Wires an accessible input to its dropdown actions. */
export function bindKoboSearchKeys(
    input: HTMLInputElement,
    actions: {
        close(): void;
        isOpen(): boolean;
        move(step: number): void;
        open(): void;
        pick(): void;
    },
): void {
    input.addEventListener("keydown", (event) => {
        handleKey(event, actions);
    });
}
