/**
 * Builds a consistent missing-element error message for required ids.
 * @param id Missing element id.
 * @returns Formatted error message.
 */
function missingElementMessage(id: string): string {
	return `Missing required element with id "${id}"`;
}

/**
 * Returns required element by id or throws when not found.
 * @param id Element id to resolve.
 * @returns Resolved element cast to requested subtype.
 * @throws {TypeError} Thrown when element is missing or not an HTMLElement.
 */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!(node instanceof HTMLElement)) {
		throw new TypeError(missingElementMessage(id));
	}
	return node as T;
}

/**
 * Queries for a single element within a root node.
 * @param sel Selector string.
 * @param root Query root node.
 * @returns Matched element or `null`.
 */
export function q<T extends Element = Element>(
	sel: string,
	root: ParentNode = document,
): T | null {
	const node = root.querySelector(sel);
	if (node === null) {
		return null;
	}
	return node as T;
}

/**
 * Queries for all matching elements within a root node.
 * @param sel Selector string.
 * @param root Query root node.
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
		const base = `${Date.now().toString(BASE_36)}${Math.random().toString(BASE_36).slice(2)}`;
		return `book-${base.slice(0, MAX_ID_LENGTH)}`;
	}
}
