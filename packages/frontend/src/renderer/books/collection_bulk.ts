/**
 * Mass-edit rules for collections. The form shows the collections every
 * selected book shares; saving adds or removes only what the user changed, so
 * collections that just some of the books belong to are left as they are.
 */
import type { Book, CollectionChanges } from "../../types/types.ts";
import { normalizeCollections } from "./collection.ts";
import { includesCollectionName } from "./collection_options.ts";

/**
 * Lists the collections that every given book belongs to.
 * @param books - Selected books.
 * @returns Shared collection names, sorted.
 */
export function sharedCollections(
    books: Pick<Book, "collections">[],
): string[] {
    const [FIRST, ...REST] = books;
    if (FIRST === undefined) {
        return [];
    }
    return normalizeCollections(FIRST.collections).filter((name) => {
        return REST.every((book) => {
            return includesCollectionName(
                normalizeCollections(book.collections),
                name,
            );
        });
    });
}

/**
 * Compares the collections shown when the form opened with the current ones.
 * @param initial - Collections shown when the form opened.
 * @param current - Collections shown when the form is saved.
 * @returns Names added and removed, or `null` when nothing changed.
 */
export function collectionChanges(
    initial: string[],
    current: string[],
): CollectionChanges | null {
    const ADDED = current.filter(
        (name) => !includesCollectionName(initial, name),
    );
    const REMOVED = initial.filter(
        (name) => !includesCollectionName(current, name),
    );
    if (ADDED.length === 0 && REMOVED.length === 0) {
        return null;
    }
    return { added: ADDED, removed: REMOVED };
}

/**
 * Applies mass-edit collection changes to one book's collections.
 * @param collections - The book's current collections.
 * @param changes - Collections to add and remove.
 * @returns Updated collections, distinct and sorted.
 */
export function withCollectionChanges(
    collections: unknown,
    changes: CollectionChanges,
): string[] {
    const KEPT = normalizeCollections(collections).filter((name) => {
        return !includesCollectionName(changes.removed, name);
    });
    return normalizeCollections([...KEPT, ...changes.added]);
}
