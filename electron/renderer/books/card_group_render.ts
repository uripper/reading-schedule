import type { BookGroup } from "./grouping.js";
import type { Book } from "./types.js";
import { createCardNode, type CardRenderContext } from "./card_nodes.js";

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

export function renderFlatBooks(
  grid: HTMLElement,
  books: Book[],
  context: CardRenderContext,
): void {
  grid.classList.remove("is-grouped");
  grid.replaceChildren(...books.map((book) => createCardNode(book, context)));
}

export function renderGroupedBooks(
  grid: HTMLElement,
  groups: BookGroup[],
  context: CardRenderContext,
): void {
  grid.classList.add("is-grouped");
  grid.replaceChildren(...groups.map((group) => createGroupSection(group, context)));
}
