/** Accessible ranked search dropdown for all books in the local library. */
import type {
    Book,
    KoboLibrarySearchOptions,
} from "@reading-schedule/contracts";
import { uid } from "../dom.ts";
import { koboElement } from "./dom.ts";
import { rankKoboLibrary } from "./matching.ts";
import { bindKoboSearchKeys } from "./search-keys.ts";

const MAX_SEARCH_RESULTS = 20;
const MIN_RESULT_SPACE_PX = 96;
const DROPDOWN_EDGE_GAP_PX = 8;
// audit-allow-local-types: Derived DOM references and dropdown state are renderer-private.
type SearchNodes = ReturnType<typeof searchNodes>;

/** Creates the input and its hidden listbox with unique accessible associations. */
function searchNodes(title: string) {
    const ROOT = koboElement("div");
    ROOT.className = "kobo-library-search";
    const INPUT = koboElement("input");
    INPUT.type = "search";
    INPUT.placeholder = "Search library by title or author";
    INPUT.setAttribute("aria-label", `Search library for ${title}`);
    const RESULTS = koboElement("ul");
    RESULTS.id = `kobo-library-${uid()}`;
    RESULTS.className = "kobo-library-results";
    RESULTS.hidden = true;
    RESULTS.setAttribute("role", "listbox");
    RESULTS.setAttribute("aria-label", "Matching library books");
    configureInput(INPUT, RESULTS.id);
    ROOT.append(INPUT, RESULTS);
    const STATE: { activeIndex: number; matches: Book[] } = {
        activeIndex: 0,
        matches: [],
    };
    return { input: INPUT, results: RESULTS, root: ROOT, state: STATE };
}

/** Connects the combobox input to its listbox. */
function configureInput(input: HTMLInputElement, resultsId: string): void {
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", resultsId);
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("autocomplete", "off");
}

/** Preserves input focus when picking with a mouse and selects on click. */
function resultOption(
    book: Book,
    nodes: SearchNodes,
    options: KoboLibrarySearchOptions,
): HTMLLIElement {
    const ITEM = koboElement(
        "li",
        `${book.title} — ${book.author || "Unknown author"}`,
    );
    ITEM.setAttribute("role", "option");
    ITEM.addEventListener("mousedown", (event) => {
        event.preventDefault();
    });
    ITEM.addEventListener("click", () => {
        chooseBook(nodes, options, book);
    });
    return ITEM;
}

/** Shows ranked results directly below the query instead of modifying the match selector. */
function showResults(
    nodes: SearchNodes,
    options: KoboLibrarySearchOptions,
): void {
    const NODES = nodes;
    const QUERY = NODES.input.value || options.title;
    NODES.state.matches = rankKoboLibrary(QUERY, options.getBooks())
        .slice(0, MAX_SEARCH_RESULTS)
        .map((match) => match.book);
    NODES.state.activeIndex = 0;
    NODES.results.replaceChildren(
        ...NODES.state.matches.map((book) =>
            resultOption(book, NODES, options),
        ),
    );
    if (NODES.state.matches.length === 0) {
        NODES.results.append(koboElement("li", "No matching library books"));
    }
    NODES.results.hidden = false;
    NODES.input.setAttribute("aria-expanded", "true");
    positionResults(NODES);
    highlightResult(NODES, false);
}

/** Opens upward near the bottom of the scrolling review instead of clipping results. */
function positionResults(nodes: SearchNodes): void {
    const FIELD = nodes.input.getBoundingClientRect();
    const BOUNDS = nodes.root
        .closest<HTMLElement>(".kobo-review-list")
        ?.getBoundingClientRect();
    const BELOW = (BOUNDS?.bottom ?? globalThis.innerHeight) - FIELD.bottom;
    const ABOVE = FIELD.top - (BOUNDS?.top ?? 0);
    const OPEN_UP = BELOW < MIN_RESULT_SPACE_PX && ABOVE > BELOW;
    let available = BELOW;
    if (OPEN_UP) {
        available = ABOVE;
    }
    nodes.results.classList.toggle("opens-up", OPEN_UP);
    const RESULTS = nodes.results;
    RESULTS.style.maxHeight = `min(14rem, ${Math.max(available - DROPDOWN_EDGE_GAP_PX, MIN_RESULT_SPACE_PX)}px)`;
}

/** Keeps the active result visible and reflected in screen-reader selection state. */
function highlightResult(nodes: SearchNodes, scroll: boolean): void {
    const ITEMS =
        nodes.results.querySelectorAll<HTMLLIElement>('[role="option"]');
    for (const [INDEX, ITEM] of ITEMS.entries()) {
        ITEM.id = `${nodes.results.id}-${INDEX}`;
        ITEM.setAttribute(
            "aria-selected",
            String(INDEX === nodes.state.activeIndex),
        );
    }
    const ACTIVE = ITEMS[nodes.state.activeIndex];
    nodes.input.setAttribute("aria-activedescendant", ACTIVE?.id ?? "");
    if (scroll && ACTIVE !== undefined) {
        ACTIVE.scrollIntoView({ block: "nearest" });
    }
}

/** Closes the dropdown without dismissing the surrounding sync dialog. */
function hideResults(nodes: SearchNodes): void {
    const NODES = nodes;
    NODES.results.hidden = true;
    NODES.input.setAttribute("aria-expanded", "false");
    NODES.input.setAttribute("aria-activedescendant", "");
}

/** Confirms one result and reflects its title in the search field. */
function chooseBook(
    nodes: SearchNodes,
    options: KoboLibrarySearchOptions,
    book: Book,
): void {
    const NODES = nodes;
    NODES.input.value = book.title;
    options.onPick(book);
    hideResults(NODES);
}

/** Wraps arrow navigation through the current result list. */
function moveResult(nodes: SearchNodes, step: number): void {
    const STATE = nodes.state;
    if (STATE.matches.length === 0) {
        return;
    }
    STATE.activeIndex =
        (STATE.activeIndex + step + STATE.matches.length) %
        STATE.matches.length;
    highlightResult(nodes, true);
}

/** Binds pointer, query, and keyboard interactions without global event listeners. */
function bindSearch(
    nodes: SearchNodes,
    options: KoboLibrarySearchOptions,
): void {
    nodes.input.addEventListener("input", () => {
        showResults(nodes, options);
    });
    nodes.input.addEventListener("focus", () => {
        showResults(nodes, options);
    });
    nodes.root.addEventListener("focusout", () => {
        hideResults(nodes);
    });
    bindKoboSearchKeys(nodes.input, {
        close: () => {
            hideResults(nodes);
        },
        isOpen: () => !nodes.results.hidden,
        move: (step) => {
            moveResult(nodes, step);
        },
        open: () => {
            showResults(nodes, options);
        },
        pick: () => {
            pickActiveResult(nodes, options);
        },
    });
}

/** Ignores Enter on an empty list and confirms a real result otherwise. */
function pickActiveResult(
    nodes: SearchNodes,
    options: KoboLibrarySearchOptions,
): void {
    const BOOK = nodes.state.matches[nodes.state.activeIndex];
    if (BOOK !== undefined) {
        chooseBook(nodes, options, BOOK);
    }
}

/** Returns a self-contained combobox for the current library. */
export function createKoboLibrarySearch(options: KoboLibrarySearchOptions) {
    const NODES = searchNodes(options.title);
    bindSearch(NODES, options);
    return { element: NODES.root, input: NODES.input, results: NODES.results };
}
