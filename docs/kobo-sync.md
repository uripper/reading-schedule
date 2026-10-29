# Kobo reading-progress sync

Open **Settings → Sync** and check **Kobo** to reveal its controls.
Connect the Kobo over USB, choose **Browse…**, and select
`.kobo/KoboReader.sqlite` in the system file picker. The selection saves
automatically. Hidden folders may need to be shown to locate `.kobo`.
Cancelling the picker keeps the previous selection.

While enabled and Bartleby is open, the configured file is checked every five
seconds, including at startup. **Check now** retries or reopens review after
dismissal. Uncheck **Kobo** to pause checks while keeping the selected file.
If the device mounts at a different path, choose **Browse…** again.

The review lists device titles, suggested library matches, and current/proposed
progress. Matching ignores punctuation, accents, and connecting words and ranks
spelling, word, and subtitle similarity. The most likely match is preselected. Ambiguous editions or series titles
start unchecked for individual review.

Each row can search the **entire library by title or author**, even when no
suggestion was found. Results open directly beneath Search library. Choose a
result with a click or the arrow keys and Enter, then check its row to approve
the match. Typing a query does not add options to the match selector. Changing a query or match resets that row's approval. Imported
source IDs retain the match on subsequent connections, even if titles differ.

**Update all** and **Select all** include clear suggestions without progress
conflicts. **Update selected** imports checked rows, including manual matches.
Decreases, tied timestamps, undated existing progress, and multiple device
records targeting one library book require individual approval. No library
entries are created automatically. **Not now** or Escape dismisses the review.
The shared **X** in the top right closes the review; search does not receive
focus or open its dropdown automatically. Conflict notes name competing device
records or library editions and show the relevant reading dates.

**Add book** opens the normal book form with the source title and percentage
prefilled. Saving returns to the same review and selects the new book;
cancelling leaves the row unchanged. **Ignore** warns that the book will no
longer appear or sync in the future, then saves its Kobo content ID as an
exclusion. Cancel keeps the row; confirming removes it from this review and
future checks, including after reconnects or further reading.

Equal percentages can be selected and confirmed. Confirmation records the
source association without changing pages, finish date, or progress-update
time, even if the source date is older or lacks a timezone. Already confirmed
records are omitted from subsequent checks. Older progress, invalid dates,
and future device times cannot overwrite a different progress value.

The reader opens the database read-only and selects book-level records
(`BookID IS NULL`) with positive `___PercentRead` and a non-null `DateLastRead`.
It requires `ContentID`, `Title`, `DateLastRead`, `___PercentRead`, and `BookID`
in the `content` table. Missing or incompatible files have an actionable status
in settings. Malformed records are skipped and counted. Device data stays local.
The book-level filter follows the [calibre Kobo driver](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/devices/kobo/driver.py).

Approved imports use the existing progress normalization, including pages,
book status, and completion date. Their source record and progress timestamp
are saved in the same state snapshot before schedules and statistics refresh.
Failed saves restore staged progress and allow retry. Manual progress changes
are dated independently of title or shelf edits. Reconnecting cannot reapply
the same imported source record. A dismissed review is suppressed for the rest
of that connection; a manual check or reconnect allows another review.

This version imports from Kobo into Bartleby. It does not write to the reader,
run while Bartleby is closed, or discover devices without a configured path.
Automated database coverage uses synthetic SQLite fixtures. File-picker tests
mock the native dialog boundary, and browser checks exercise the actual review
and settings controls. The desktop host enables only the dialog open permission.

![Sync settings with Kobo enabled](screenshots/kobo-settings.png)

![Kobo review with synthetic book data](screenshots/kobo-review.png)

![Search library dropdown](screenshots/kobo-search.png)
