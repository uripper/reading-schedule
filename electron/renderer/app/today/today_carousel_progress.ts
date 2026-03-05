const UNKNOWN_PAGES_TOTAL = "--";

export function formatPagesTotalText(pagesTotal: number | null): string {
    if (pagesTotal === null) {
        return UNKNOWN_PAGES_TOTAL;
    }
    return String(pagesTotal);
}
