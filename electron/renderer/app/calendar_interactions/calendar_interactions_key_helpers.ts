/**
 * Generates a unique key for tracking the completion status of a book on a specific day.
 * @param rowDate The date associated with the session, in "YYYY-MM-DD" format.
 * @param bookId The unique identifier of the book.
 * @returns A string key in the format "YYYY-MM-DD|bookId" for tracking completion.
 */
export function dayBookCompletionKey(rowDate: string, bookId: string): string {
    return `${rowDate}|${bookId}`;
}

/**
 * Extracts the date and book ID from a session key and generates a day-book completion key.
 * @param sessionKey The session key in the format "YYYY-MM-DD|sessionIndex|bookId".
 * @returns A day-book completion key in the format "YYYY-MM-DD|bookId" or an empty string if the input is invalid.
 */
export function dayBookCompletionKeyFromSession(sessionKey: string): string {
    const [date, , bookId] = String(sessionKey || "").split("|");
    if (!date || !bookId) {
        return "";
    }
    return dayBookCompletionKey(date, bookId);
}
