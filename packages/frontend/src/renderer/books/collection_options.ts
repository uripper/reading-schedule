/**
 * Builds the collection combobox options: existing collections that match the
 * typed text and are not already chosen, then a "create" entry for a new name.
 */
import type { CollectionOption } from "../../types/types.ts";
import {
    compareCollectionNames,
    foldCollectionName,
    normalizeCollectionName,
} from "./collection.ts";

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
 * Checks whether a collection name contains the typed text.
 * @param name - Collection name.
 * @param foldedQuery - Search text folded by {@link foldCollectionName}.
 * @returns `true` when the query is empty or found in the name.
 */
function matchesCollectionQuery(name: string, foldedQuery: string): boolean {
    if (foldedQuery === "") {
        return true;
    }
    return foldCollectionName(name).includes(foldedQuery);
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
 * Lists combobox options for the current search text.
 * @param available - Every known collection.
 * @param selected - Collections the book already belongs to.
 * @param rawQuery - Text typed in the combobox.
 * @returns Matching unchosen collections, then a create entry when useful.
 */
export function collectionOptions(
    available: string[],
    selected: string[],
    rawQuery: string,
): CollectionOption[] {
    const FOLDED_QUERY = foldCollectionName(rawQuery.trim());
    const NEW_NAME = normalizeCollectionName(rawQuery);
    const OPTIONS: CollectionOption[] = available
        .filter((name) => !includesCollectionName(selected, name))
        .filter((name) => matchesCollectionQuery(name, FOLDED_QUERY))
        .map((name) => ({ isNew: false, name }));
    if (offersCreate(available, selected, NEW_NAME)) {
        OPTIONS.push({ isNew: true, name: NEW_NAME });
    }
    return OPTIONS;
}
