/** Builds the Schedule card header and common session actions. */
import { logError } from "../../types/logger.ts";
import type {
    Book,
    CalendarRowWithFinish,
    CalendarStateSubset,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import type { EndingMetricValues } from "./details_session_ending.ts";
import { sessionMenu } from "./details_session_menu.ts";
import { sessionProgressEstimate } from "./estimates.ts";
import { confirmRemoveSession } from "./remove-session-confirm.ts";
import { sessionKeyFor } from "./utils.ts";

const FINISH_BADGE_TEXT = "Expected finish";
const REMOVE_SESSION_LABEL = "Remove session";

/** Rendering dependencies common to all session cards. */
export interface SessionCardArgs {
    row: CalendarRowWithFinish;
    interactionHandlers: DetailInteractionHandlers;
    rerenderDetails: () => void;
}

/** Rendering dependencies for cards that show a progress projection. */
export interface SessionCardWithEstimateArgs extends SessionCardArgs {
    state: CalendarStateSubset;
}

/** Computes the current projection using the same schedule and completion state as the card. */
export function sessionEstimate({
    row,
    state,
    interactionHandlers,
}: SessionCardWithEstimateArgs): EndingMetricValues {
    const ESTIMATE = sessionProgressEstimate({
        row,
        state,
        getBookById: (bookId) => interactionHandlers.getBookById(bookId),
        isSessionCompleted: (key) =>
            interactionHandlers.isSessionCompleted(key),
    });
    return {
        pages: ESTIMATE?.endPages ?? null,
        percent: ESTIMATE?.endPercent ?? null,
    };
}

/** Builds a session card with book metadata and its header actions. */
export function baseSessionItem(
    { row, interactionHandlers, rerenderDetails }: SessionCardArgs,
    book: Book | null,
): HTMLElement {
    const ITEM = document.createElement("article");
    ITEM.className = "day-details-item";
    const HEADER = document.createElement("header");
    HEADER.className = "day-session-header";
    HEADER.append(
        removeSessionButton(row, interactionHandlers, rerenderDetails),
        sessionHeading(row, book?.author ?? ""),
    );
    if (book !== null) {
        HEADER.append(sessionMenu(row.book_id));
    }
    ITEM.append(HEADER);
    ITEM.classList.toggle("is-finish", row.finish === true);
    return ITEM;
}

/** Keeps the title, author, and finish badge together as the title wraps. */
function sessionHeading(
    row: CalendarRowWithFinish,
    author: string,
): HTMLElement {
    const HEADING = document.createElement("div");
    HEADING.className = "day-session-heading";
    const TITLE = document.createElement("strong");
    TITLE.className = "day-session-title";
    TITLE.textContent = row.title;
    HEADING.append(TITLE);
    if (author.trim() !== "") {
        const AUTHOR = document.createElement("span");
        AUTHOR.className = "day-session-author";
        AUTHOR.textContent = author;
        HEADING.append(AUTHOR);
    }
    if (row.finish) {
        const BADGE = document.createElement("span");
        BADGE.className = "day-finish-badge";
        BADGE.textContent = FINISH_BADGE_TEXT;
        HEADING.append(BADGE);
    }
    return HEADING;
}

/** Builds the reversible completion action for a current or past session. */
export function sessionCompletionButton(
    { row, interactionHandlers, rerenderDetails }: SessionCardArgs,
    completed: boolean,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn btn-session-completion";
    BUTTON.textContent = "Mark session complete";
    if (completed) {
        BUTTON.textContent = "Mark session incomplete";
    }
    BUTTON.onclick = () => {
        interactionHandlers.onSessionCompletionChanged({
            row,
            completed: !completed,
            sessionKey: sessionKeyFor(row),
        });
        rerenderDetails();
    };
    return BUTTON;
}

/**
 * Builds remove-session button with confirmation and callback wiring.
 * @param row - Calendar row.
 * @param interactionHandlers - Detail interaction handlers.
 * @param rerenderDetails - Details rerender callback.
 * @returns Remove button element.
 */
function removeSessionButton(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLButtonElement {
    const REMOVE_BUTTON = document.createElement("button");
    REMOVE_BUTTON.type = "button";
    REMOVE_BUTTON.className = "btn-session-remove";
    REMOVE_BUTTON.textContent = "×";
    REMOVE_BUTTON.setAttribute("aria-label", REMOVE_SESSION_LABEL);
    REMOVE_BUTTON.title = REMOVE_SESSION_LABEL;
    REMOVE_BUTTON.onclick = () => {
        confirmRemoveSession(row)
            .then((confirmed) => {
                if (!confirmed) {
                    return;
                }
                removeSession(row, interactionHandlers, rerenderDetails);
            })
            .catch(reportRemoveSessionConfirmError);
    };
    return REMOVE_BUTTON;
}

function removeSession(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): void {
    const REMOVED = interactionHandlers.onSessionRemoved({ row });
    if (!REMOVED) {
        return;
    }
    rerenderDetails();
}

function reportRemoveSessionConfirmError(error: unknown): void {
    logError("Could not confirm schedule removal.", error);
}
