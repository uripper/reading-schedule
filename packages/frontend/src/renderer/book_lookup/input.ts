/** Runs explicit Open Library searches and ignores results from superseded requests. */
import type { BookLookupItem, LookupQueryArgs } from "../../types/types.ts";
import { getPlannerApi } from "../app/planner_api.ts";

const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

/** Dismisses the results, invalidates pending requests, and restores the book note. */
export function clearLookupQuery(args: LookupQueryArgs): void {
    args.state.token += 1;
    args.clearResults();
    args.searchInput.removeAttribute("aria-busy");
    args.metaEl.textContent = args.metaEl.dataset.lookupNote ?? "";
}

/** Updates the result list after a successful query. */
function showLookupResults(
    args: LookupQueryArgs,
    items: BookLookupItem[],
): void {
    args.searchInput.removeAttribute("aria-busy");
    if (items.length === 0) {
        args.metaEl.textContent = "No matches found.";
        return;
    }
    args.state.currentItems = items.slice(0, RESULT_LIMIT);
    args.state.activeIndex = 0;
    args.refreshResults();
    args.metaEl.textContent = "Select a result to fill details.";
}

/** Fetches a query and updates the dialog only while the request is current. */
function fetchLookupResults(args: LookupQueryArgs, query: string): void {
    const TOKEN = args.state.token;
    Promise.resolve()
        .then(() => getPlannerApi().searchBooks(query))
        .then((items) => {
            if (TOKEN === args.state.token) {
                showLookupResults(args, items);
            }
        })
        .catch(() => {
            if (TOKEN === args.state.token) {
                clearLookupQuery(args);
                args.metaEl.textContent =
                    "Lookup unavailable. Try again or enter details manually.";
            }
        });
}

/** Submits the trimmed search text without submitting the surrounding book form. */
export function submitLookupQuery(args: LookupQueryArgs): void {
    clearLookupQuery(args);
    const QUERY = args.searchInput.value.trim();
    if (QUERY.length < MIN_QUERY_LENGTH) {
        args.metaEl.textContent = `Enter at least ${MIN_QUERY_LENGTH} characters to search.`;
        return;
    }
    args.searchInput.setAttribute("aria-busy", "true");
    args.metaEl.textContent = "Searching Open Library...";
    fetchLookupResults(args, QUERY);
}
