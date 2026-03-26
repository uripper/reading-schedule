import type {
    BookLookupItem,
    NumericLike,
    ProgressField,
    ProgressSyncInputs,
} from "../../types/types.ts";

const PLACEHOLDER_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">',
    '<rect width="120" height="160" fill="#1f2a3d"/>',
    '<rect x="14" y="20" width="92" height="120" rx="6" fill="#28384f"/>',
    '<path d="M30 46h60M30 66h60M30 86h44" stroke="#8da3c6" stroke-width="6" stroke-linecap="round"/>',
    "</svg>",
].join("");
const PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/**
 * Parses a numeric-like input into a non-negative integer.
 * @param raw - String/number-like value from form fields.
 * @returns Rounded integer, clamped at zero for invalid or negative input.
 */
function toInt(raw: NumericLike): number {
    const N = Number(raw);
    if (Number.isFinite(N)) {
        return Math.max(0, Math.round(N));
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

// TODO: Double check changes here
/**
 * Builds a user-facing description for a selected lookup result.
 * @param item - Selected lookup item.
 * @returns Description text including source/author/year when available.
 */
export function describeLookup(item: BookLookupItem): string {
    const BITS = [item.source, item.author, item.year]
        .map((value) => String(value ?? "").trim())
        .filter((bit) => bit.length > 0);

    if (BITS.length > 0) {
        return `Selected from ${BITS.join(" · ")}`;
    }
    return "Selected from lookup results.";
}

/**
 * Returns note text to save alongside a picked lookup result.
 * @param item - Selected lookup item.
 * @returns Saved note text describing the lookup source.
 */
export function noteFromLookup(item: BookLookupItem): string {
    return describeLookup(item);
}

/**
 * Keeps pages-read and progress inputs in sync after one of them changes.
 * @param form - Inputs participating in pages/progress synchronization.
 * @param changedField - Field that initiated the update.
 */
export function syncProgressAndPages(
    form: ProgressSyncInputs,
    changedField: ProgressField,
): void {
    const { pagesTotalInput, pagesReadInput, progressInput } = form;
    const TOTAL = toInt(pagesTotalInput.value);
    if (TOTAL <= 0) {
        return;
    }
    if (changedField === "pages") {
        const PAGES_READ = Math.min(toInt(pagesReadInput.value), TOTAL);
        if (PAGES_READ !== toInt(pagesReadInput.value)) {
            pagesReadInput.value = String(PAGES_READ);
        }
        progressInput.value = String(
            Math.round((PAGES_READ / TOTAL) * 1000) / 10,
        );
        return;
    }
    const PROGRESS = Math.min(100, Math.max(0, Number(progressInput.value)));
    progressInput.value = String(Math.round(PROGRESS * 10) / 10);
    pagesReadInput.value = String(Math.round((PROGRESS / 100) * TOTAL));
}
