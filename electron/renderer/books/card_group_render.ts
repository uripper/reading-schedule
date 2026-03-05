import type { Book, BookGroup, CardRenderContext } from "../../types/types.js";
import { createCardNode } from "./card_nodes.js";

/**
 * Creates a grouped section of book cards with heading and row container.
 * @param group - Group metadata and grouped books.
 * @param context - Shared card render context.
 * @returns Group section element.
 */
function createGroupSection(
    group: BookGroup,
    context: CardRenderContext,
): HTMLElement {
    const SECTION = document.createElement("section");
    SECTION.className = "books-group";
    SECTION.dataset.groupKey = String(group.key || "");
    const HEADING = document.createElement("h3");
    HEADING.className = "books-group-heading";
    HEADING.textContent = `${group.label} (${group.books.length})`;
    const ROW = document.createElement("div");
    ROW.className = "books-group-row";
    ROW.append(...group.books.map((book) => createCardNode(book, context)));
    SECTION.append(HEADING, ROW);
    return SECTION;
}

/**
 * Renders books in a flat (non-grouped) card grid.
 * @param grid - Grid container element.
 * @param books - Books to render.
 * @param context - Shared card render context.
 */
export function renderFlatBooks(
    grid: HTMLElement,
    books: Book[],
    context: CardRenderContext,
): void {
    grid.classList.remove("is-grouped");
    grid.replaceChildren(...books.map((book) => createCardNode(book, context)));
}

/**
 * Renders books grouped by section into the card grid.
 * @param grid - Grid container element.
 * @param groups - Prepared book groups.
 * @param context - Shared card render context.
 */
export function renderGroupedBooks(
    grid: HTMLElement,
    groups: BookGroup[],
    context: CardRenderContext,
): void {
    grid.classList.add("is-grouped");
    grid.replaceChildren(
        ...groups.map((group) => createGroupSection(group, context)),
    );
}
