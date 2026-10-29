/** Validated Kobo read results and persisted import history. */
import { z } from "zod";

const KOBO_MAX_PROGRESS_PERCENT = 100;

export const KOBO_PROGRESS_SCHEMA = z.object({
    contentId: z.string().min(1),
    dateLastRead: z.string(),
    percentRead: z.number().finite().positive().max(KOBO_MAX_PROGRESS_PERCENT),
    title: z.string().min(1),
});

export type KoboProgress = z.infer<typeof KOBO_PROGRESS_SCHEMA>;

const KOBO_SNAPSHOT_SCHEMA = z.discriminatedUnion("status", [
    z.object({ status: z.literal("disconnected") }),
    z.object({
        invalidRows: z.number().int().nonnegative(),
        records: z.array(KOBO_PROGRESS_SCHEMA),
        status: z.literal("connected"),
    }),
]);

export type KoboSnapshot = z.infer<typeof KOBO_SNAPSHOT_SCHEMA>;

const KOBO_TIMESTAMP_SCHEMA = z.iso.datetime({ offset: true });

/** Requires an explicit timezone and a valid calendar date for safe ordering. */
export function koboReadTime(value: string): number | null {
    if (!KOBO_TIMESTAMP_SCHEMA.safeParse(value).success) {
        return null;
    }
    return Date.parse(value);
}

/** Validates the native database boundary before rendering or importing. */
export function parseKoboSnapshot(value: unknown): KoboSnapshot {
    return KOBO_SNAPSHOT_SCHEMA.parse(value);
}
