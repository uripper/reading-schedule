/**
 * Builds the collection combobox rows: every collection matching the typed
 * text (word-start matches first, chosen ones kept and marked), then a
 * `Create "<text>"` action for a new name, then the pinned "New collection…"
 * action. Creating is always an explicit choice.
 */
import type { CollectionOption } from "../../types/types.ts";
import {
    compareCollectionNames,
    normalizeCollectionName,
} from "./collection.ts";
import { matchText } from "./text_match.ts";

/**
 * Checks whether a list holds a name, ignoring case and accents.
 * @param names - Names to search.
 * @param name - Name to look for.
 * @returns `true` when an equal name is present.
 */
export function includesCollectionName(names: string[], name: string): boolean {
    return names.some(
        (existing) => compareCollectionNames(existing, name) === 0,
    );
}

/**
 * Finds the stored spelling of a name already in the list.
 * @param names - Names to search.
 * @param name - Name typed by the user.
 * @returns Existing spelling, or the typed name when it is new.
 */
export function canonicalCollectionName(names: string[], name: string): string {
    const EXISTING = names.find((candidate) => {
        return compareCollectionNames(candidate, name) === 0;
    });
    return EXISTING ?? name;
}

/**
 * Lists existing collections that match the search, best matches first.
 * @param available - Every known collection, already sorted.
 * @param selected - Collections the book belongs to.
 * @param rawQuery - Text typed in the combobox.
 * @returns Existing-collection rows.
 */
function existingOptions(
    available: string[],
    selected: string[],
    rawQuery: string,
): CollectionOption[] {
    const QUERY_IS_BLANK = rawQuery.trim() === "";
    const ROWS: Array<CollectionOption & { rank: number }> = [];
    for (const NAME of available) {
        const MATCH = matchText(NAME, rawQuery);
        if (MATCH === null && !QUERY_IS_BLANK) {
            continue;
        }
        ROWS.push({
            kind: "existing",
            match: MATCH?.range ?? null,
            name: NAME,
            rank: MATCH?.rank ?? 0,
            selected: includesCollectionName(selected, NAME),
        });
    }
    return ROWS.toSorted((left, right) => left.rank - right.rank).map(
        ({ kind, match, name, selected: isSelected }) => {
            return { kind, match, name, selected: isSelected };
        },
    );
}

/**
 * Decides whether to offer creating the typed name as a new collection.
 * @param available - Every known collection.
 * @param selected - Collections the book already belongs to.
 * @param name - Normalized typed name; empty when blank or reserved.
 * @returns `true` when the text names a collection that does not exist yet.
 */
function offersCreate(
    available: string[],
    selected: string[],
    name: string,
): boolean {
    if (name === "") {
        return false;
    }
    if (includesCollectionName(available, name)) {
        return false;
    }
    return !includesCollectionName(selected, name);
}

/**
 * Builds an action row.
 * @param kind - `create` or `new`.
 * @param name - Typed name for `create`; empty for `new`.
 * @returns Action option.
 */
function actionOption(
    kind: CollectionOption["kind"],
    name: string,
): CollectionOption {
    return { kind, match: null, name, selected: false };
}

/**
 * Lists combobox rows for the current search text.
 * @param available - Every known collection, already sorted.
 * @param selected - Collections the book already belongs to.
 * @param rawQuery - Text typed in the combobox.
 * @returns Matching collections, then the create and new actions.
 */
export function collectionOptions(
    available: string[],
    selected: string[],
    rawQuery: string,
): CollectionOption[] {
    const NEW_NAME = normalizeCollectionName(rawQuery);
    const OPTIONS = existingOptions(available, selected, rawQuery);
    if (offersCreate(available, selected, NEW_NAME)) {
        OPTIONS.push(actionOption("create", NEW_NAME));
    }
    OPTIONS.push(actionOption("new", ""));
    return OPTIONS;
}

/**
 * Narrows the rows while the user names a new collection: no pinned "New
 * collection…" row, and nothing at all until a name is typed.
 * @param options - Rows from {@link collectionOptions}.
 * @param rawQuery - Text typed in the combobox.
 * @returns Rows to show in naming mode.
 */
export function namingOptions(
    options: CollectionOption[],
    rawQuery: string,
): CollectionOption[] {
    if (rawQuery.trim() === "") {
        return [];
    }
    return options.filter((option) => option.kind !== "new");
}
