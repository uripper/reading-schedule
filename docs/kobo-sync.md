# Kobo reading-progress sync

Open **Settings → Sync** and check **Kobo** to reveal its controls and file-location hint.
Connect the Kobo over USB, choose **Browse…**, and select
`device/.kobo/KoboReader.sqlite` in the system file picker, where `device` is
the mounted reader. The provider panel shows this usual location and a
connection badge when the database is available. The selection saves
automatically. Hidden folders may need to be shown to locate `.kobo`.
Cancelling the picker keeps the previous selection.

While enabled and Bartleby is open, the configured file is checked every five
seconds, including at startup. **Check now** retries or reopens review after
dismissal. When a manual check finds nothing to sync, an **All books up to date!**
popup appears; dismiss it with **OK** or Escape. The **Connected** badge stays
unchanged. Uncheck **Kobo** to pause checks and collapse the
controls and hint while keeping the selected file.
If the device mounts at a different path, choose **Browse…** again.

The review lists device titles and authors, suggested library matches, and
current/proposed progress. Matching ignores punctuation, accents, and connecting
words and ranks spelling, word, and subtitle similarity. When both the device
and the library book credit an author, it also compares authors, ignoring name
order and minor spelling differences; co-authors joined with `&` match any one
credited name. The most likely match is preselected. Among books with the same
title, a matching author is preselected only when every other candidate credits
a different author. A lone same-title book by a different author, ambiguous
editions, and series titles start unchecked for individual review. A missing or
blank author falls back to title-only matching.

Each row can search the **entire library by title or author**, even when no
suggestion was found. Results open directly beneath Search library. Choose a
result with a click or the arrow keys and Enter, then check its row to approve
the match. Typing a query does not add options to the match selector. Changing a query or match resets that row's approval. Imported
source IDs retain the match on subsequent connections, even if titles differ.

**Select all** checks clear suggestions without progress conflicts and keeps
any rows already approved individually; **Deselect all** clears every check.
**Update selected** imports checked rows, including manual matches.
Decreases, tied timestamps, undated existing progress, and multiple device
records targeting one library book require individual approval. No library
entries are created automatically. The shared **X** in the top right or Escape
dismisses the review without importing or marking any record as synced;
search does not receive focus or open its dropdown automatically. Conflict notes name competing device
records or library editions and show the relevant reading dates.

**Add book** opens the normal book form with the source title, author, and
percentage prefilled. Saving returns to the same review and selects the new book;
cancelling leaves the row unchanged. **Ignore** warns that the book will no
longer appear or sync in the future, then saves its Kobo content ID as an
exclusion. Cancel keeps the row; confirming removes it from this review and
future checks, including after reconnects or further reading.

Equal percentages can be selected and confirmed. Confirmation records the
source association without changing pages, finish date, or progress-update
time, even if the source date is older or lacks a timezone. Already confirmed
records are omitted from subsequent checks. Older progress, invalid dates,
and future device times cannot overwrite a different progress value.

Completed (100%) records set the finish date to the local calendar day of
`DateLastRead`. This also applies to a library book already at 100% whose
finish date is missing; the row names the date it will set. A different
existing finish date requires individual approval, and the row shows both
dates before replacement. Times without a timezone, invalid times, and future
times never set a finish date; the row explains that it stays unchanged.
Each source record offers its finish date once, so later manual edits are kept.

The reader opens the database read-only and selects book-level records
(`BookID IS NULL`) with positive `___PercentRead` and a non-null `DateLastRead`.
It requires `ContentID`, `Title`, `Attribution`, `DateLastRead`,
`___PercentRead`, and `BookID` in the `content` table. `Attribution` holds the
author in every Kobo schema the calibre driver supports; NULL or blank values
are treated as unknown. Missing or incompatible files have an actionable status
in settings. Malformed records are skipped and counted. Device data stays local.
The book-level filter follows the [calibre Kobo driver](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/devices/kobo/driver.py).
The device serial is read from the first comma-separated field of
`.kobo/version` beside the database; a missing or malformed file leaves the
device unknown without affecting the scan.

## Synced sources

Each approved record is saved as a link on its library book, one per provider,
device, and source book. Reading the same book on a second Kobo adds a second
link instead of replacing the first. A link from either device keeps the match
for the other; the newest reading time still decides whether progress can be
imported. Links saved before device tracking have no device and are taken over
by the next Kobo that syncs that book.

Open a book with **Edit** to see the collapsed **Synced sources** disclosure
above Save and Cancel. Select its heading or arrow to expand the cards. Each
link shows its provider and device serial when known, the source title and
author, and the last imported percentage and reading date. Source IDs stay
internal and are not displayed in the card.
**Unlink** asks for confirmation, then removes only that link and saves
immediately. The book, its progress, finish date, history, and other links are
kept. Unlinking does not ignore the source book: it appears in the next review
and can be matched again. A failed save restores the link and allows retry.

Approved imports use the existing progress normalization, including pages,
book status, and completion date. Their source link and progress timestamp
are saved in the same state snapshot before schedules and statistics refresh.
Failed saves restore staged progress and allow retry. Manual progress changes
are dated independently of title or shelf edits. Reconnecting cannot reapply
the same imported source record. A dismissed review is suppressed for the rest
of that connection; a manual check or reconnect allows another review.

## Implementation

The review, matching, import, and link code in
`packages/frontend/src/renderer/sync/` is provider-neutral and works on
`SyncRecord` values (`provider`, `sourceId`, optional `deviceId`) from
`packages/contracts/src/sync.ts`. The Kobo layer in
`packages/frontend/src/renderer/kobo/` owns settings, polling, ignored IDs, and
conversion of native rows (`ContentID`) to sync records. The review title,
progress comparisons, conflicts, and errors name the record's provider.

This version imports from Kobo into Bartleby. It does not write to the reader,
run while Bartleby is closed, or discover devices without a configured path.
Automated database coverage uses synthetic SQLite fixtures. File-picker tests
mock the native dialog boundary, and browser checks exercise the actual review
and settings controls. The desktop host enables only the dialog open permission.
