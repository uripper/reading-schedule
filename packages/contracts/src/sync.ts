/** Provider-neutral synced reading records and the source links books keep. */
import { z } from "zod";

const SYNC_MAX_PROGRESS_PERCENT = 100;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
export const MIN_SYNC_SESSION_MINUTES = 1;
export const MAX_SYNC_SESSION_MINUTES = HOURS_PER_DAY * MINUTES_PER_HOUR;

/** Manual reading time must fit within one local calendar day. */
export const SYNC_SESSION_MINUTES_SCHEMA = z
    .number()
    .int()
    .min(MIN_SYNC_SESSION_MINUTES)
    .max(MAX_SYNC_SESSION_MINUTES);

/** Fields every provider reports for one source book. */
export const SYNC_SOURCE_FIELDS = {
    author: z.string().min(1).optional(),
    dateLastRead: z.string(),
    percentRead: z.number().finite().positive().max(SYNC_MAX_PROGRESS_PERCENT),
    title: z.string().min(1),
};

/** One source book from one provider and, when known, one device. */
export const SYNC_RECORD_SCHEMA = z.object({
    ...SYNC_SOURCE_FIELDS,
    deviceId: z.string().min(1).optional(),
    provider: z.string().min(1),
    sourceId: z.string().min(1),
});

export type SyncRecord = z.infer<typeof SYNC_RECORD_SCHEMA>;

const SYNC_TIMESTAMP_SCHEMA = z.iso.datetime({ offset: true });

/** Requires an explicit timezone and a valid calendar date for safe ordering. */
export function syncReadTime(value: string): number | null {
    if (!SYNC_TIMESTAMP_SCHEMA.safeParse(value).success) {
        return null;
    }
    return Date.parse(value);
}

/** How a source author compares with a library author; unknown when either is blank. */
export type SyncAuthorAgreement = "match" | "mismatch" | "unknown";

export interface SyncAssessment {
    kind: "ready" | "link" | "review" | "blocked" | "unchanged";
    reason: string;
}

export interface SyncImportChoice {
    bookId: string;
    record: SyncRecord;
    /** When present, records a completed session on the local day of import. */
    sessionMinutes?: number;
}
