/**
 * Normalizes title-filter query text for case-insensitive substring matching.
 * @param query - User-entered filter query.
 * @returns Trimmed lowercase query text.
 */
export function normalizeTitleFilterQuery(
    query: string | null | undefined,
): string {
    return String(query ?? "")
        .trim()
        .toLocaleLowerCase();
}

/**
 * Checks whether any candidate field contains a pre-normalized query substring.
 * @param fields - Candidate text fields to test.
 * @param normalizedQuery - Query text already normalized for matching.
 * @returns `true` when query is empty or any field contains the query substring.
 */
export function anyFieldMatchesNormalizedQuery(
    fields: ReadonlyArray<string | null | undefined>,
    normalizedQuery: string,
): boolean {
    if (normalizedQuery === "") {
        return true;
    }
    for (const FIELD of fields) {
        const NORMALIZED_FIELD = String(FIELD ?? "").toLocaleLowerCase();
        if (NORMALIZED_FIELD.includes(normalizedQuery)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks whether title text contains a pre-normalized query substring.
 * @param title - Candidate title text.
 * @param normalizedQuery - Query text already normalized for matching.
 * @returns `true` when query is empty or title contains query substring.
 */
export function titleMatchesNormalizedQuery(
    title: string | null | undefined,
    normalizedQuery: string,
): boolean {
    if (normalizedQuery === "") {
        return true;
    }
    const NORMALIZED_TITLE = String(title ?? "").toLocaleLowerCase();
    return NORMALIZED_TITLE.includes(normalizedQuery);
}
