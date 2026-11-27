/**
 * "Move to workspace" control for the Library mass-edit selection.
 *
 * It sits beside the floating Edit Books button while books are selected and more
 * than one workspace exists: select books, pick a destination, then the transfer
 * flow resolves After Book links and offers undo. Single books can also be moved
 * from the Workspace field in Edit Book.
 */
import type { WorkspaceRuntime } from "../../types/types.ts";
import { onMassEditSelectionChanged } from "../books/mass-edit-selection.ts";
import { fillWorkspaceOptions } from "./workspace-selector.ts";
import {
    bookWorkspaceId,
    moveDestinations,
    onWorkspaceCatalogChanged,
} from "./workspace-store.ts";

const WRAP_CLASS = "books-mass-edit-move";
const SELECT_ID = "booksMassEditMoveSelect";

/** Builds the hidden control once and appends it to the page. */
function createControl(): HTMLSelectElement {
    const LABEL = document.createElement("label");
    LABEL.className = WRAP_CLASS;
    LABEL.hidden = true;
    const SELECT = document.createElement("select");
    SELECT.id = SELECT_ID;
    SELECT.className = "btn";
    LABEL.append(SELECT);
    document.body.append(LABEL);
    return SELECT;
}

/** Formats the prompt option, e.g. "Move 3 Books to…". */
function promptText(count: number): string {
    if (count === 1) {
        return "Move 1 Book to…";
    }
    return `Move ${count} Books to…`;
}

/** The one workspace every selected book is in, or null for a mixed selection. */
function commonSource(bookIds: readonly string[]): string | null {
    const SOURCES = new Set(bookIds.map((bookId) => bookWorkspaceId(bookId)));
    if (SOURCES.size !== 1) {
        return null;
    }
    return [...SOURCES][0] ?? null;
}

/** Lists destinations under the prompt; hides the control when nothing applies. */
function render(select: HTMLSelectElement, bookIds: readonly string[]): void {
    const DESTINATIONS = moveDestinations(commonSource(bookIds));
    fillWorkspaceOptions(select, DESTINATIONS, null);
    const PROMPT = document.createElement("option");
    PROMPT.value = "";
    PROMPT.textContent = promptText(bookIds.length);
    select.prepend(PROMPT);
    const SELECT = select;
    SELECT.value = "";
    SELECT.setAttribute("aria-label", promptText(bookIds.length));
    const WRAP = select.parentElement;
    if (WRAP !== null) {
        WRAP.hidden = bookIds.length === 0 || DESTINATIONS.length === 0;
    }
}

/**
 * Binds the mass-edit move control.
 * @param moveBooks - Transfers books to another workspace with undo.
 */
export function bindLibraryMoveControl(
    moveBooks: WorkspaceRuntime["moveBooks"],
): void {
    const SELECT = createControl();
    let selected: readonly string[] = [];
    onMassEditSelectionChanged((bookIds): void => {
        selected = bookIds;
        render(SELECT, selected);
    });
    onWorkspaceCatalogChanged((): void => {
        render(SELECT, selected);
    });
    SELECT.addEventListener("change", (): void => {
        const TARGET_ID = SELECT.value;
        if (TARGET_ID === "") {
            return;
        }
        SELECT.disabled = true;
        moveBooks([...selected], TARGET_ID)
            .catch((): void => {
                render(SELECT, selected);
            })
            .finally((): void => {
                SELECT.disabled = false;
                render(SELECT, selected);
            });
    });
}
