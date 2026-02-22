export function dayBookCompletionKey(rowDate: string, bookId: string): string {
  return `${rowDate}|${bookId}`;
}

export function dayBookCompletionKeyFromSession(sessionKey: string): string {
  const [date, , bookId] = String(sessionKey || "").split("|");
  if (!date || !bookId) {
    return "";
  }
  return dayBookCompletionKey(date, bookId);
}
