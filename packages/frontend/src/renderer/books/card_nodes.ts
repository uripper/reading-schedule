import type { Book, CardRenderContext } from "../../types/types.ts";
import { afterBookLinkButton } from "./card_navigation_buttons.ts";
import { scrollToBookCard } from "./card_scroll_target.ts";
import {
    cardActionsNode,
    cardHeadingNode,
    cardRootNode,
    cardStatusNode,
    cardSubtitleNode,
    coverButtonForBook,
} from "./card-node-shell.ts";
import {
    blockerMeta,
    metaLabel,
    progressLabel,
    wordsLabel,
} from "./presenters.ts";

const PRE_LINE_WHITESPACE = "pre-line";
const MASS_EDITABLE_CLASS = "is-mass-editable";
const MASS_SELECTED_CLASS = "is-mass-selected";

type CardMetaNodeArgs = {
    book: Book;
    title: string;
    bookId: string;
    context: CardRenderContext;
};

type CardStatLine = {
    text: string;
    preserveLineBreaks: boolean;
};

/**
 * Builds meta label text for the stats section.
 * @param book - Book model used for metadata lookup.
 * @param context - Shared render context for metadata options and lookups.
 * @returns Meta label text or an empty string.
 */
function baseMetaText(book: Book, context: CardRenderContext): string {
    return metaLabel(book, {
        finishDateByBookId: context.finishDateByBookId,
        showBlockerMeta: false,
        showShelfMeta: context.showShelfMeta,
        titleById: context.titleById,
    });
}

/**
 * Builds the list of stat lines shown inside a card.
 * @param book - Book model used for progress and word labels.
 * @param metaText - Meta label text already resolved for the card.
 * @param showWordCount - Whether the word-count line should be shown.
 * @returns Ordered stat-line descriptors for rendering.
 */
function cardStatLines(
    book: Book,
    metaText: string,
    showWordCount: boolean,
): CardStatLine[] {
    const LINES: CardStatLine[] = [
        { preserveLineBreaks: false, text: progressLabel(book) },
    ];
    if (showWordCount) {
        LINES.push({ preserveLineBreaks: false, text: wordsLabel(book) });
    }
    if (metaText !== "") {
        LINES.push({ preserveLineBreaks: true, text: metaText });
    }
    return LINES;
}

/**
 * Creates one rendered stat line.
 * @param line - Stat line descriptor to render.
 * @returns Configured stat span element.
 */
function cardStatLineNode(line: CardStatLine): HTMLSpanElement {
    const SPAN = document.createElement("span");
    SPAN.textContent = line.text;
    if (line.preserveLineBreaks) {
        SPAN.style.whiteSpace = PRE_LINE_WHITESPACE;
    }
    return SPAN;
}

/**
 * Appends stat line nodes into the stats container.
 * @param stats - Stats wrapper element.
 * @param lines - Lines to render inside the wrapper.
 */
function appendCardStatLines(
    stats: HTMLDivElement,
    lines: CardStatLine[],
): void {
    for (const LINE of lines) {
        stats.append(cardStatLineNode(LINE));
    }
}

/**
 * Appends blocker navigation metadata when available.
 * @param stats - Stats wrapper element.
 * @param book - Book model whose blocker metadata is rendered.
 * @param context - Shared render context for cross-book lookups.
 */
function appendBlockerButton(
    stats: HTMLDivElement,
    book: Book,
    context: CardRenderContext,
): void {
    if (!context.showBlockerMeta) {
        return;
    }
    const BLOCKER = blockerMeta(book, context.titleById);
    if (BLOCKER === null) {
        return;
    }
    stats.append(
        afterBookLinkButton(
            BLOCKER.label,
            BLOCKER.blockerBookId,
            scrollToBookCard,
        ),
    );
}
/**
 * Builds the stats section for one book card.
 * @param book - Book model used for progress/meta labels.
 * @param context - Shared render context for metadata options and lookups.
 * @returns Configured stats wrapper element.
 */
function cardStatsNode(book: Book, context: CardRenderContext): HTMLDivElement {
    const STATS = document.createElement("div");
    STATS.className = "book-stats";
    const META_TEXT = baseMetaText(book, context);
    const STAT_LINES = cardStatLines(book, META_TEXT, context.showWordCount);
    appendCardStatLines(STATS, STAT_LINES);
    appendBlockerButton(STATS, book, context);
    return STATS;
}

/**
 * Creates the metadata column for a book card.
 * @param args - Metadata render inputs for the current book card.
 * @returns Configured metadata container.
 */
function cardMetaNode({
    book,
    bookId,
    context,
    title,
}: CardMetaNodeArgs): HTMLDivElement {
    const META = document.createElement("div");
    META.className = "book-meta";
    META.append(
        cardHeadingNode(title),
        cardSubtitleNode(book),
        cardStatusNode(book.status),
        cardStatsNode(book, context),
        cardActionsNode(book, bookId, context),
    );
    return META;
}

function massEditSelectNode(
    bookId: string,
    context: CardRenderContext,
): HTMLLabelElement | null {
    if (context.massEdit?.active !== true) {
        return null;
    }
    const LABEL = document.createElement("label");
    LABEL.className = "book-mass-select-control";
    const INPUT = document.createElement("input");
    INPUT.type = "checkbox";
    INPUT.className = "book-mass-select";
    INPUT.dataset.bookId = bookId;
    INPUT.checked = context.massEdit.selectedBookIds.has(bookId);
    INPUT.setAttribute("aria-label", "Select book for mass edit");
    const INDICATOR = document.createElement("span");
    INDICATOR.className = "book-mass-select-indicator";
    LABEL.append(INPUT, INDICATOR);
    return LABEL;
}

function applyMassEditState(
    card: HTMLElement,
    bookId: string,
    context: CardRenderContext,
): void {
    const ACTIVE = context.massEdit?.active === true;
    card.classList.toggle(MASS_EDITABLE_CLASS, ACTIVE);
    card.classList.toggle(
        MASS_SELECTED_CLASS,
        context.massEdit?.selectedBookIds.has(bookId) === true,
    );
}

/**
 * Creates a full book card node including cover, metadata, and actions.
 * @param book - Book model to render.
 * @param context - Shared render context for cross-book metadata.
 * @returns Rendered book card element.
 */
export function createCardNode(
    book: Book,
    context: CardRenderContext,
): HTMLElement {
    const BOOK_ID = String(book.book_id || "");
    const TITLE = String(book.title || "Untitled");
    const CARD = cardRootNode(book, BOOK_ID);
    const COVER_BUTTON = coverButtonForBook(book, TITLE);
    const META = cardMetaNode({ book, bookId: BOOK_ID, context, title: TITLE });
    const MASS_SELECT = massEditSelectNode(BOOK_ID, context);
    applyMassEditState(CARD, BOOK_ID, context);
    if (MASS_SELECT !== null) {
        CARD.append(MASS_SELECT);
    }
    CARD.append(COVER_BUTTON, META);
    return CARD;
}
