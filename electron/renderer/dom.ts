// @ts-nocheck

export const el = (id) => document.getElementById(id);
export const q = (sel, root = document) => root.querySelector(sel);
export const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

const BASE_36 = 36;
const MAX_ID_LENGTH = 20;

export function uid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const base = `${Date.now().toString(BASE_36)}${Math.random().toString(BASE_36).slice(2)}`;
  return `book-${base.slice(0, MAX_ID_LENGTH)}`;
}
