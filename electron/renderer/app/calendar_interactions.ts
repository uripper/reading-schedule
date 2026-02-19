// @ts-nocheck

export function configureAppCalendarInteractions({
  configureCalendarInteractions,
  state,
  queuePersist,
  setStatus,
  updateBookProgress,
  getBookById,
  onProgressUpdated = () => {},
}) {
  configureCalendarInteractions({
    isSessionCompleted: (sessionKey) => Boolean(state.scheduleCompletions?.[sessionKey]),
    onSessionCompletionChanged: ({ sessionKey, completed, row }) => {
      if (completed) {
        state.scheduleCompletions[sessionKey] = true;
      } else {
        delete state.scheduleCompletions[sessionKey];
      }
      queuePersist();

      if (row?.title && row?.date) {
        if (completed) {
          setStatus(`Marked "${row.title}" complete on ${row.date}.`);
        } else {
          setStatus(`Marked "${row.title}" incomplete on ${row.date}.`);
        }
      }
    },
    onSessionProgressUpdated: ({ bookId, pagesRead, progressPercent }) => {
      const updated = updateBookProgress(bookId, { pagesRead, progressPercent });
      if (!updated) {
        setStatus("Could not find that book to update progress.", true);
        return null;
      }
      setStatus(`Updated progress for ${updated.title || "book"}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
  });
}
