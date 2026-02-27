import {
  shouldScrollCardIntoView,
  waitForCardScrollSettle,
} from "./card_scroll_settle.js";

const AFTER_TARGET_CLASS = "is-after-target";
const AFTER_TARGET_DURATION_MS = 1800;
const BOOK_CARD_SELECTOR = ".book-card";

let nextScrollToken = 0;

const scrollTokenByCard = new WeakMap<HTMLElement, number>();
const resetTimerByCard = new WeakMap<
  HTMLElement,
  ReturnType<typeof globalThis.setTimeout>
>();

/**
 * Starts/updates a scroll token used to cancel stale settle checks.
 * @param card Card element receiving the scroll token.
 * @returns Fresh scroll token id for this navigation request.
 */
function startScrollToken(card: HTMLElement): number {
  nextScrollToken += 1;
  const token = nextScrollToken;
  scrollTokenByCard.set(card, token);
  return token;
}

/**
 * Checks whether a settle callback still belongs to the latest request.
 * @param card Card element currently being tracked.
 * @param token Token captured when settle tracking started.
 * @returns `true` when token is still current for this card.
 */
function isCurrentScrollToken(card: HTMLElement, token: number): boolean {
  const currentToken = scrollTokenByCard.get(card);
  if (currentToken === undefined) {
    return false;
  }
  return currentToken === token;
}

/**
 * Removes a pending highlight reset timer for the target card.
 * @param card Card element whose timer should be cancelled.
 */
function clearResetTimer(card: HTMLElement): void {
  const timerId = resetTimerByCard.get(card);
  if (timerId === undefined) {
    return;
  }
  globalThis.clearTimeout(timerId);
  resetTimerByCard.delete(card);
}

/**
 * Schedules highlight class removal after the configured duration.
 * @param card Card element currently marked as target.
 */
function scheduleTargetClassReset(card: HTMLElement): void {
  const timerId = globalThis.setTimeout(() => {
    card.classList.remove(AFTER_TARGET_CLASS);
    resetTimerByCard.delete(card);
  }, AFTER_TARGET_DURATION_MS);
  resetTimerByCard.set(card, timerId);
}

/**
 * Applies a temporary highlight class and restarts the animation immediately.
 * @param card Card element that should be emphasized.
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
 * @param bookId Stable book id to locate.
 * @returns Matched card element when present; otherwise `null`.
 */
function bookCardById(bookId: string): HTMLElement | null {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(BOOK_CARD_SELECTOR));
  for (const card of cards) {
    if (card.dataset.bookId !== bookId) {
      continue;
    }
    return card;
  }
  return null;
}

/**
 * Scrolls to a rendered book card and applies temporary target emphasis.
 * @param bookId Stable book id to find and reveal.
 */
export function scrollToBookCard(bookId: string): void {
  const card = bookCardById(bookId);
  if (card === null) {
    return;
  }
  const token = startScrollToken(card);
  if (!shouldScrollCardIntoView(card)) {
    highlightTargetCard(card);
    return;
  }
  card.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
  waitForCardScrollSettle(card, () => {
    return isCurrentScrollToken(card, token);
  }, () => {
    highlightTargetCard(card);
  });
}
