// @ts-nocheck


export function configureAppCalendarInteractions({
  configureCalendarInteractions,
  state,
  queuePersist,
  setStatus,
  updateBookProgress,
  getBookById,
  onSessionCompletionUpdated = () => {},
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
      onSessionCompletionUpdated({ sessionKey, completed, row });
    },
    onSessionProgressUpdated: ({ bookId, pagesRead, progressPercent }) => {
      const updated = updateBookProgress(
        bookId,
        { pagesRead, progressPercent },
        { notifyBooksChanged: false },
      );
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
