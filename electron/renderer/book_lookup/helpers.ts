import type { BookLookupItem } from "../app/types.js";

const PLACEHOLDER_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">',
  '<rect width="120" height="160" fill="#1f2a3d"/>',
  '<rect x="14" y="20" width="92" height="120" rx="6" fill="#28384f"/>',
  '<path d="M30 46h60M30 66h60M30 86h44" stroke="#8da3c6" stroke-width="6" stroke-linecap="round"/>',
  "</svg>",
].join("");
const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

type NumericLike = string | number | null | undefined;

export interface ProgressSyncInputs {
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
}

type ProgressField = "pages" | "progress";

/**
 * Parses a numeric-like input into a non-negative integer.
 * @param raw String/number-like value from form fields.
 * @returns Rounded integer, clamped at zero for invalid or negative input.
 */
function toInt(raw: NumericLike): number {
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.max(0, Math.round(n));
  }
  return 0;
}

/**
 * Returns data-URL placeholder SVG used when no cover image is available.
 * @returns Encoded placeholder image URL.
 */
export function placeholderCoverSvg(): string {
  return PLACEHOLDER;
}

/**
 * Builds a user-facing description for a selected lookup result.
 * @param item Selected lookup item.
 * @returns Description text including source/author/year when available.
 */
export function describeLookup(item: BookLookupItem): string {
  const bits: string[] = [];
  const source = String(item.source ?? "").trim();
  if (source.length > 0) {
    bits.push(source);
  }
  const author = String(item.author ?? "").trim();
  if (author.length > 0) {
    bits.push(author);
  }
  const year = String(item.year ?? "").trim();
  if (year.length > 0) {
    bits.push(year);
  }
  if (bits.length > 0) {
    return `Selected from ${bits.join(" · ")}`;
  }
  return "Selected from lookup results.";
}

/**
 * Returns note text to save alongside a picked lookup result.
 * @param item Selected lookup item.
 * @returns Saved note text describing the lookup source.
 */
export function noteFromLookup(item: BookLookupItem): string {
  return describeLookup(item);
}

/**
 * Keeps pages-read and progress inputs in sync after one of them changes.
 * @param form Inputs participating in pages/progress synchronization.
 * @param changedField Field that initiated the update.
 */
export function syncProgressAndPages(
  form: ProgressSyncInputs,
  changedField: ProgressField,
): void {
  const pagesTotalInput = form.pagesTotalInput;
  const pagesReadInput = form.pagesReadInput;
  const progressInput = form.progressInput;
  const total = toInt(pagesTotalInput.value);
  if (total <= 0) {
    return;
  }
  if (changedField === "pages") {
    const pagesRead = Math.min(toInt(pagesReadInput.value), total);
    if (pagesRead !== toInt(pagesReadInput.value)) {
      pagesReadInput.value = String(pagesRead);
    }
    progressInput.value = String(
      Math.round((pagesRead / total) * 1000) / 10,
    );
    return;
  }
  const progress = Math.min(
    100,
    Math.max(0, Number(progressInput.value)),
  );
  progressInput.value = String(Math.round(progress * 10) / 10);
  pagesReadInput.value = String(Math.round((progress / 100) * total));
}
