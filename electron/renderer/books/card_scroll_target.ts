import {
    shouldScrollCardIntoView,
    waitForCardScrollSettle,
} from "./card_scroll_settle.js";

const AFTER_TARGET_CLASS = "is-after-target";
const AFTER_TARGET_DURATION_MS = 1800;
const BOOK_CARD_SELECTOR = ".book-card";

let nextScrollToken = 0;

const SCROLL_TOKEN_BY_CARD = new WeakMap<HTMLElement, number>();
const RESET_TIMER_BY_CARD = new WeakMap<
    HTMLElement,
    ReturnType<typeof globalThis.setTimeout>
>();

/**
 * Starts/updates a scroll token used to cancel stale settle checks.
 * @param card - Card element receiving the scroll token.
 * @returns Fresh scroll token id for this navigation request.
 */
function startScrollToken(card: HTMLElement): number {
    nextScrollToken += 1;
    const TOKEN = nextScrollToken;
    SCROLL_TOKEN_BY_CARD.set(card, TOKEN);
    return TOKEN;
}

/**
 * Checks whether a settle callback still belongs to the latest request.
 * @param card - Card element currently being tracked.
 * @param token - Token captured when settle tracking started.
 * @returns `true` when token is still current for this card.
 */
function isCurrentScrollToken(card: HTMLElement, token: number): boolean {
    const CURRENT_TOKEN = SCROLL_TOKEN_BY_CARD.get(card);
    if (CURRENT_TOKEN === undefined) {
        return false;
    }
    return CURRENT_TOKEN === token;
}

/**
 * Removes a pending highlight reset timer for the target card.
 * @param card - Card element whose timer should be cancelled.
 */
function clearResetTimer(card: HTMLElement): void {
    const TIMER_ID = RESET_TIMER_BY_CARD.get(card);
    if (TIMER_ID === undefined) {
        return;
    }
    globalThis.clearTimeout(TIMER_ID);
    RESET_TIMER_BY_CARD.delete(card);
}

/**
 * Schedules highlight class removal after the configured duration.
 * @param card - Card element currently marked as target.
 */
function scheduleTargetClassReset(card: HTMLElement): void {
    const TIMER_ID = globalThis.setTimeout(() => {
        card.classList.remove(AFTER_TARGET_CLASS);
        RESET_TIMER_BY_CARD.delete(card);
    }, AFTER_TARGET_DURATION_MS);
    RESET_TIMER_BY_CARD.set(card, TIMER_ID);
}

/**
 * Applies a temporary highlight class and restarts the animation immediately.
 * @param card - Card element that should be emphasized.
 */
function highlightTargetCard(card: HTMLElement): void {
    clearResetTimer(card);
    card.classList.remove(AFTER_TARGET_CLASS);
    card.getBoundingClientRect();
    card.classList.add(AFTER_TARGET_CLASS);
    scheduleTargetClassReset(card);
}

/**
 * Finds a rendered book card matching the provided id.
 * @param bookId - Stable book id to locate.
 * @returns Matched card element when present; otherwise `null`.
 */
function bookCardById(bookId: string): HTMLElement | null {
    const CARDS = Array.from(
        document.querySelectorAll<HTMLElement>(BOOK_CARD_SELECTOR),
    );
    for (const CARD of CARDS) {
        if (CARD.dataset.bookId !== bookId) {
            continue;
        }
        return CARD;
    }
    return null;
}

/**
 * Scrolls to a rendered book card and applies temporary target emphasis.
 * @param bookId - Stable book id to find and reveal.
 */
export function scrollToBookCard(bookId: string): void {
    const CARD = bookCardById(bookId);
    if (CARD === null) {
        return;
    }
    const TOKEN = startScrollToken(CARD);
    if (!shouldScrollCardIntoView(CARD)) {
        highlightTargetCard(CARD);
        return;
    }
    CARD.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
    });
    waitForCardScrollSettle(
        CARD,
        () => {
            return isCurrentScrollToken(CARD, TOKEN);
        },
        () => {
            highlightTargetCard(CARD);
        },
    );
}
