export const el = (id) => document.getElementById(id);
export const q = (sel, root = document) => root.querySelector(sel);
export const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const base = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `book-${base.slice(0, 20)}`;
}
