import { COVER_PLACEHOLDER } from "../../books/constants.js";
import { el } from "../../dom.js";
import type {
  TodayBookSummary,
  TodayScheduleSnapshot,
} from "./today_schedule.js";
import {
  coverFallbackText,
  perBookSessionText,
  plannedMinutesText,
  todaySessionCountsText,
} from "./today_books_view_text.js";

/**
 * Creates the visual cover node for a today-list book item.
 * @param summary Per-book summary containing cover/title fields.
 * @returns Cover element with either image or text fallback.
 */
function createCover(summary: TodayBookSummary): HTMLElement {
  const cover = document.createElement("div");
  cover.className = "today-scheduled-cover";
  if (summary.coverSrc) {
    const img = document.createElement("img");
    img.src = summary.coverSrc;
    img.alt = `Cover of ${summary.title}`;
    img.loading = "lazy";
    img.dataset.fallbackCover = "1";
    cover.append(img);
    return cover;
  }

  const fallback = document.createElement("span");
  fallback.textContent = coverFallbackText(summary.title);
  cover.append(fallback);
  return cover;
}

/**
 * Creates one rendered book item for the today's schedule list.
 * @param summary Per-book summary used to populate title, counts, and cover.
 * @returns Article element representing one book row.
 */
function createBookItem(summary: TodayBookSummary): HTMLElement {
  const item = document.createElement("article");
  item.className = "today-scheduled-book";
  if (
    summary.completedSessions >= summary.scheduledSessions &&
    summary.scheduledSessions > 0
  ) {
    item.classList.add("is-complete");
  }

  const meta = document.createElement("div");
  meta.className = "today-scheduled-meta";

  const title = document.createElement("strong");
  title.textContent = summary.title;

  const sessionsText = document.createElement("p");
  sessionsText.className = "today-scheduled-note";
  sessionsText.textContent = perBookSessionText(summary);

  const minutesText = document.createElement("p");
  minutesText.className = "today-scheduled-note";
  minutesText.textContent = plannedMinutesText(summary);

  meta.append(title, sessionsText, minutesText);
  item.append(createCover(summary), meta);
  return item;
}

/**
 * Attaches image error handlers that swap broken covers to placeholders.
 * @param listNode List container that may contain cover images.
 */
function applyCoverFallbacks(listNode: HTMLElement): void {
  listNode
    .querySelectorAll<HTMLImageElement>("img[data-fallback-cover='1']")
    .forEach((img) => {
      img.addEventListener("error", () => {
        img.src = COVER_PLACEHOLDER;
        img.classList.add("is-empty");
      });
    });
}

/**
 * Renders the today's scheduled books section.
 * @param snapshot Today schedule snapshot driving list and empty states.
 */
export function renderTodayScheduledBooks(
  snapshot: TodayScheduleSnapshot,
): void {
  const countsNode = el("todaySessionCounts");
  const listNode = el("todayScheduledBooks");
  const emptyNode = el("todayScheduledEmpty");

  countsNode.textContent = todaySessionCountsText(snapshot);
  if (!snapshot.books.length) {
    listNode.replaceChildren();
    emptyNode.hidden = false;
    return;
  }

  const items = snapshot.books.map((summary) => {
    return createBookItem(summary);
  });
  listNode.replaceChildren(...items);
  emptyNode.hidden = true;
  applyCoverFallbacks(listNode);
}
