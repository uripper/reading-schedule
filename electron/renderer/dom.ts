/**
 * Builds a consistent missing-element error message for required ids.
 * @param id - Missing element id.
 * @returns Formatted error message.
 */
function missingElementMessage(id: string): string {
    return `Missing required element with id "${id}"`;
}

/**
 * Returns required element by id or throws when not found.
 * @param id - Element id to resolve.
 * @returns Resolved element cast to requested subtype.
 */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
    const NODE = document.getElementById(id);
    if (!(NODE instanceof HTMLElement)) {
        throw new TypeError(missingElementMessage(id));
    }
    return NODE as T;
}

/**
 * Queries for all matching elements within a root node.
 * @param sel - Selector string.
 * @param root - Query root node.
 * @returns Array of matched elements.
 */
export function qa<T extends Element = Element>(
    sel: string,
    root: ParentNode = document,
): T[] {
    return Array.from(root.querySelectorAll(sel));
}

const BASE_36 = 36;
const MAX_ID_LENGTH = 20;

/**
 * Generates stable-ish unique ids for client-created entities.
 * @returns UUID when available, otherwise timestamp/random fallback id.
 */
export function uid(): string {
    try {
        return globalThis.crypto.randomUUID();
    } catch {
        const BASE = `${Date.now().toString(BASE_36)}${Math.random().toString(BASE_36).slice(2)}`;
        return `book-${BASE.slice(0, MAX_ID_LENGTH)}`;
    }
}
