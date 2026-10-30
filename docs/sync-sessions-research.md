# Importing reading time and sessions from devices (research)

Research for ISSUE-129. **Recommendation: do not create sessions
automatically from Kobo data.** No Kobo source is both complete and
documented. One source, the `AnalyticsEvents` table, could later feed
user-reviewed session suggestions when it happens to be present, as described
below.

## What Kobo stores

None of this is documented by Kobo. The findings come from the calibre Kobo
driver and from community tools that parse `KoboReader.sqlite`. They have not
yet been checked against real databases from several firmware versions.

| Source | What it holds | Usable for sessions? |
| --- | --- | --- |
| `content.TimeSpentReading` | One cumulative reading-time counter per book. Community importers convert it to minutes, but its unit is not confirmed. | **No.** It is a running total with no dates. The difference between two syncs gives time read in that interval, not when or on which days. |
| `content.LastTimeStartedReading`, `content.LastTimeFinishedReading` | Timestamps of the most recent start and finish. | **No.** They are points in time without durations, and they are overwritten. |
| `content.ReadStatus`, `___PercentRead`, `DateLastRead` | Latest state, already imported by progress sync. | No new session information. |
| `AnalyticsEvents` (for example `LeaveContent` rows with seconds read, pages turned, and timestamps) | Per-visit reading events. | **Partially.** This is the only per-session source, but Kobo clears it whenever the device goes online. It is complete only on devices that never sync with Kobo's cloud, or where users install a trigger that blocks the deletion. Bartleby opens the database read-only and must not install that trigger. |
| `Event.ExtraData` | Binary blobs that remain after `AnalyticsEvents` is cleared. | **No.** The format is undocumented, and community parsers do not decode it. |
| Calibre "bookstats" (`StoreTimeToReadLowerEstimate`, `StoreTimeToReadUpperEstimate`, `StorePages`, `StoreWordCount`) | Store-supplied size and time-to-read estimates. | **No.** They are publisher estimates, not reading. Word and page counts could fill book metadata separately. |

## Interpretation

- **Individual sessions:** only `AnalyticsEvents`, and only while it has not
  been cleared. Missing rows cannot be told apart from days without reading.
- **Cumulative time:** `TimeSpentReading`. A sync-to-sync difference could
  show "time read since the last sync," but turning it into dated sessions
  would invent dates.
- **Estimates:** the bookstats columns.

## If session import is built later

Treat it as a separate, opt-in review, like progress review, never as an
automatic import.

1. **Probe the schema first.** Use `pragma table_info` on `AnalyticsEvents` and
   `content`, and skip the feature with a visible status when columns are
   missing. Parse event attributes and metrics as untrusted JSON, and drop
   rows without a valid timestamp, a positive duration, and a source book ID.
2. **Map to `Session`.** Use these fields:
   - `book_id`: the linked library book, found through the existing
     `sync_links` match on provider and source ID.
   - `started_at` and `ended_at`: the event's end timestamp minus and plus its
     seconds read. Only zoned timestamps are accepted, using the same rule as
     `syncReadTime`.
   - `minutes`: seconds read divided by 60, rounded and at least 1.
   - `pages_read`: pages turned, when present.
   - `source`: a new value such as `"sync"`. This keeps imported sessions
     separate from `"timer"` and `"manual"` in statistics and editing.
   - The calendar day: the local day of `ended_at`, matching finish dates.
3. **Deduplicate.** Store a source key on each imported session: provider,
   `deviceId`, the event's row ID, and its timestamp. Skip any key already
   stored, so reconnecting or syncing a second device never imports twice. Do
   not merge into manual or timer sessions. When an imported interval overlaps
   an existing session for the same book, show it for individual approval
   instead of selecting it.
4. **Avoid inventing data.** Never create sessions from `TimeSpentReading`
   differences, read times without a timezone, or `Event` blobs. Label the
   review "Sessions recorded on this Kobo since its last cloud sync" so missing
   days are not read as days without reading.
5. **Possible use of `TimeSpentReading`.** It could give adaptive reading-speed
   calibration (ISSUE-030) a reading-time total to compare with progress
   changes, without creating sessions. That is a separate decision.

## Before committing to implementation

- Collect several real `KoboReader.sqlite` files across firmware versions,
  with and without cloud sync, and confirm column names, units, and
  `AnalyticsEvents` attribute keys.
- Decide whether a feature that is empty for most users (anyone who uses Kobo
  Wi-Fi sync) is worth its review UI.

## Sources

- [calibre Kobo driver](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/devices/kobo/driver.py): schema columns, `Attribution`, bookstats, and the `.kobo/version` serial.
- [gildo/talpa](https://github.com/gildo/talpa): `AnalyticsEvents` as the only per-session source, cleared on sync.
- [chorsnell/moonreader-dashboard PR #66](https://github.com/chorsnell/moonreader-dashboard/pull/66): `TimeSpentReading`, `LeaveContent` rows with seconds read, and `Event` blobs left unparsed.
- [mfdaves/kobo-db-tools](https://github.com/mfdaves/kobo-db-tools): `AnalyticsEvents` cleared when the device goes online; `Event.ExtraData` is an undocumented binary blob.
