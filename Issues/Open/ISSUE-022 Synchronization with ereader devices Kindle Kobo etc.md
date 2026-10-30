# ISSUE-022: Synchronization with e-reader devices (Kindle, Kobo, etc...)

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `planner`

Problem:

Many users read on e-reader devices like Kindle or Kobo and would benefit from having their reading progress automatically synchronized with Bartleby to keep their schedule and stats up to date without manual input.

Expected:

Users can connect their e-reader device to Bartleby, allowing for automatic synchronization of reading progress. This could be achieved through:

- Direct integration with e-reader APIs (if available).
- Syncing through a companion app that reads progress from the device and updates Bartleby.
- Providing a clear UI for managing the e-reader connection and synchronization settings.
- Ensuring that synchronization is secure and respects user privacy.
- Could pull highlights and other data if user would like, and then they can export that to Obsidian or Notion or whatever.

Kobo autosync (first implementation):

Let the user provide the location of their `KoboReader.sqlite` file. When the Kobo is connected and that database becomes available, check for reading progress updates and ask which books to update in Bartleby.

Starting query (based on the provided Kobo database fields):

```sql
SELECT Title, DateLastRead, ___PercentRead AS PercentRead
FROM content
WHERE ___PercentRead > 0
  AND DateLastRead IS NOT NULL
ORDER BY DateLastRead DESC;
```

Validate the schema against a real Kobo database before implementation. Use the source column `___PercentRead` in the filter so it does not depend on alias resolution.

Expected flow:

- Save the user-selected database location and detect when the connected Kobo makes it available, including when Bartleby starts with the device already connected. Allow the user to change the location if the mount path changes.
- Read the Kobo database locally and read-only. Never modify it. Handle a missing, busy, unsupported, or disconnected database with an actionable status and a retry option.
- Find matching Bartleby books by title initially. Ask the user to resolve duplicate or ambiguous titles; do not update an arbitrary match. Unmatched books should be visible without creating library entries automatically.
- Compare each book's `DateLastRead` and percentage with its latest Bartleby reading-progress update, if any, and its last successfully imported Kobo record. Track progress-update timestamps separately from unrelated book edits if needed.
- A matched book with no existing progress update can be proposed as an initial import. Otherwise, propose a changed Kobo record when it is newer than the Bartleby progress update. Skip unchanged or already imported records.
- Normalize timestamps before comparison. Flag unparseable dates, uncertain ordering, and progress decreases for explicit review; do not silently overwrite newer Bartleby progress.
- When updates are available, show one popup listing books with current Bartleby progress, proposed Kobo progress, and the Kobo last-read time. Include per-book checkboxes, select/deselect all, **Update selected**, and the shared top-right **X**. Remove redundant **Update all** and **Not now** actions as tracked in ISSUE-126.
- Apply only the approved updates through Bartleby's existing progress-update flow so schedules and stats stay consistent. Confirm successful updates and identify any failures that can be retried.
- Persist the imported source timestamp and percentage only after a successful update. Reconnecting without new progress must not reapply it. Dismissing the popup or leaving a book unchecked must not mark it as imported; avoid repeatedly opening the same popup during one connection.
- Automatic checking is triggered by connection; importing progress requires the user's approval. Write-back to Kobo is outside this first implementation.

Definition of done:

- Research and define the best approach for e-reader synchronization.
- Implement synchronization logic for at least one e-reader platform (e.g., Kobo).
- Add UI components for managing the e-reader connection and displaying synchronized progress.
- Ensure that synchronization is robust and handles edge cases (e.g., connectivity issues, data conflicts).
- Add tests for e-reader synchronization functionality and error handling.
- A configured Kobo connection automatically checks for updates and opens the review popup only when there are actionable changes.
- Users can import all eligible updates, only checked books, or dismiss without changing progress.
- Tests cover first import, newer/older/equal timestamps, unchanged progress, repeated connections, duplicate/unmatched titles, invalid percentages/dates, progress decreases, database failures, and partial import failures.

Follow-ups from testing the initial implementation:

- [ISSUE-124: Share sync language and review flow across providers.](https://github.com/uripper/reading-schedule/issues/261)
- [ISSUE-125: Read Kobo authors to improve book matching.](https://github.com/uripper/reading-schedule/issues/262)
- [ISSUE-126: Remove redundant sync review actions.](https://github.com/uripper/reading-schedule/issues/263)
- [ISSUE-127: Use source last-read date when syncing a finished book.](https://github.com/uripper/reading-schedule/issues/264)
- [ISSUE-128: Show and remove synced book links in Library, including multiple devices.](https://github.com/uripper/reading-schedule/issues/265)
- [ISSUE-129: Investigate importing reading time and sessions from device history; larger research follow-up.](https://github.com/uripper/reading-schedule/issues/266)
