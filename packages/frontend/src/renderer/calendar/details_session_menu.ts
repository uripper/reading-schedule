/** Builds the Schedule card’s Library disclosure. */
import { revealBookInLibrary } from "../books/controller.ts";

/** Closes the disclosure when focus leaves its trigger and action. */
function closeOnBlur(menu: HTMLDetailsElement, event: FocusEvent): void {
    if (
        !(event.relatedTarget instanceof Node) ||
        menu.contains(event.relatedTarget)
    ) {
        return;
    }
    const MENU = menu;
    MENU.open = false;
}

/** Builds the keyboard-accessible trigger for the disclosure. */
function menuTrigger(): HTMLElement {
    const TRIGGER = document.createElement("summary");
    TRIGGER.className = "btn day-session-menu-trigger";
    TRIGGER.setAttribute("aria-label", "Session actions");
    TRIGGER.textContent = "⋯";
    return TRIGGER;
}

/** Links to the book that owns the session. */
function libraryAction(
    bookId: string,
    menu: HTMLDetailsElement,
): HTMLButtonElement {
    const LIBRARY = document.createElement("button");
    LIBRARY.type = "button";
    LIBRARY.className = "btn day-session-library";
    LIBRARY.textContent = "See book in library";
    const MENU = menu;
    LIBRARY.onclick = () => {
        MENU.open = false;
        revealBookInLibrary(bookId);
    };
    return LIBRARY;
}

/** Builds the single-action overflow menu for a session with a Library book. */
export function sessionMenu(bookId: string): HTMLDetailsElement {
    const MENU = document.createElement("details");
    MENU.className = "day-session-menu";
    const TRIGGER = menuTrigger();
    MENU.addEventListener("focusout", (event) => {
        closeOnBlur(MENU, event);
    });
    MENU.onkeydown = (event) => {
        if (event.key === "Escape" && MENU.open) {
            MENU.open = false;
            TRIGGER.focus();
        }
    };
    MENU.append(TRIGGER, libraryAction(bookId, MENU));
    return MENU;
}
