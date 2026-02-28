/**
 * Normalizes title-filter query text for case-insensitive substring matching.
 * @param query User-entered filter query.
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
 * Checks whether title text contains a pre-normalized query substring.
 * @param title Candidate title text.
 * @param normalizedQuery Query text already normalized for matching.
 * @returns `true` when query is empty or title contains query substring.
 */
export function titleMatchesNormalizedQuery(
	title: string | null | undefined,
	normalizedQuery: string,
): boolean {
	if (normalizedQuery === "") {
		return true;
	}
	const normalizedTitle = String(title ?? "").toLocaleLowerCase();
	return normalizedTitle.includes(normalizedQuery);
}
