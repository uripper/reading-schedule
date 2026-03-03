import type {
    TodayBookSummary,
    TodayScheduleSnapshot,
} from "../../../types/types.js";
import { COVER_PLACEHOLDER } from "../../books/constants.js";
import { el } from "../../dom.js";
import { navigateToTodayBook } from "./today_books_navigation.js";
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
    const COVER = document.createElement("div");
    COVER.className = "today-scheduled-cover";
    if (summary.coverSrc) {
        const IMG = document.createElement("img");
        IMG.src = summary.coverSrc;
        IMG.alt = `Cover of ${summary.title}`;
        IMG.loading = "lazy";
        IMG.dataset.fallbackCover = "1";
        COVER.append(IMG);
        return COVER;
    }

    const FALLBACK = document.createElement("span");
    FALLBACK.textContent = coverFallbackText(summary.title);
    COVER.append(FALLBACK);
    return COVER;
}

/**
 * Creates one rendered book item for the today's schedule list.
 * @param summary Per-book summary used to populate title, counts, and cover.
 * @returns Button element representing one book row.
 */
function createBookItem(summary: TodayBookSummary): HTMLElement {
    const ITEM = document.createElement("button");
    ITEM.type = "button";
    ITEM.className = "today-scheduled-book";
    ITEM.setAttribute("aria-label", `Open ${summary.title} in Books`);
    ITEM.onclick = () => {
        navigateToTodayBook(summary.bookId);
    };
    if (
        summary.completedSessions >= summary.scheduledSessions &&
        summary.scheduledSessions > 0
    ) {
        ITEM.classList.add("is-complete");
    }

    const META = document.createElement("div");
    META.className = "today-scheduled-meta";

    const TITLE = document.createElement("strong");
    TITLE.textContent = summary.title;

    const SESSIONS_TEXT = document.createElement("p");
    SESSIONS_TEXT.className = "today-scheduled-note";
    SESSIONS_TEXT.textContent = perBookSessionText(summary);

    const MINUTES_TEXT = document.createElement("p");
    MINUTES_TEXT.className = "today-scheduled-note";
    MINUTES_TEXT.textContent = plannedMinutesText(summary);

    META.append(TITLE, SESSIONS_TEXT, MINUTES_TEXT);
    ITEM.append(createCover(summary), META);
    return ITEM;
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
                const NEXT_IMAGE = img;
                NEXT_IMAGE.src = COVER_PLACEHOLDER;
                NEXT_IMAGE.classList.add("is-empty");
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
    const COUNTS_NODE = el("todaySessionCounts");
    const LIST_NODE = el("todayScheduledBooks");
    const EMPTY_NODE = el("todayScheduledEmpty");

    COUNTS_NODE.textContent = todaySessionCountsText(snapshot);
    if (!snapshot.books.length) {
        LIST_NODE.replaceChildren();
        EMPTY_NODE.hidden = false;
        return;
    }

    const ITEMS = snapshot.books.map((summary) => {
        return createBookItem(summary);
    });
    LIST_NODE.replaceChildren(...ITEMS);
    EMPTY_NODE.hidden = true;
    applyCoverFallbacks(LIST_NODE);
}
