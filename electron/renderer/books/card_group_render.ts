import type { BookGroup } from "./grouping.js";
import type { Book } from "./types.js";
import { createCardNode, type CardRenderContext } from "./card_nodes.js";

/**
 * Creates a grouped section of book cards with heading and row container.
 * @param group Group metadata and grouped books.
 * @param context Shared card render context.
 * @returns Group section element.
 */
function createGroupSection(group: BookGroup, context: CardRenderContext): HTMLElement {
  const section = document.createElement("section");
  section.className = "books-group";
  section.dataset.groupKey = String(group.key || "");
  const heading = document.createElement("h3");
  heading.className = "books-group-heading";
  heading.textContent = `${group.label} (${group.books.length})`;
  const row = document.createElement("div");
  row.className = "books-group-row";
  row.append(...group.books.map((book) => createCardNode(book, context)));
  section.append(heading, row);
  return section;
}

/**
 * Renders books in a flat (non-grouped) card grid.
 * @param grid Grid container element.
 * @param books Books to render.
 * @param context Shared card render context.
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
 * @param grid Grid container element.
 * @param groups Prepared book groups.
 * @param context Shared card render context.
 */
export function renderGroupedBooks(
  grid: HTMLElement,
  groups: BookGroup[],
  context: CardRenderContext,
): void {
  grid.classList.add("is-grouped");
  grid.replaceChildren(...groups.map((group) => createGroupSection(group, context)));
}
