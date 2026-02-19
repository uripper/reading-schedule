function missingElementMessage(id: string): string {
  return `Missing required element with id "${id}"`;
}

export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    throw new Error(missingElementMessage(id));
  }
  return node as T;
}

export function q<T extends Element = Element>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector(sel) as T | null;
}

export function qa<T extends Element = Element>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(sel));
}

const BASE_36 = 36;
const MAX_ID_LENGTH = 20;

export function uid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const base = `${Date.now().toString(BASE_36)}${Math.random().toString(BASE_36).slice(2)}`;
  return `book-${base.slice(0, MAX_ID_LENGTH)}`;
}
