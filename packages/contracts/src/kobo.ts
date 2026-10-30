/** Validated read results from a locally mounted Kobo database. */
import { z } from "zod";
import { SYNC_SOURCE_FIELDS } from "./sync.ts";

export const SYNC_PROVIDER_KOBO = "kobo";

/** Native Kobo rows keep the database's `ContentID` naming at the boundary. */
export const KOBO_RECORD_SCHEMA = z.object({
    ...SYNC_SOURCE_FIELDS,
    contentId: z.string().min(1),
});

export type KoboRecord = z.infer<typeof KOBO_RECORD_SCHEMA>;

const KOBO_SNAPSHOT_SCHEMA = z.discriminatedUnion("status", [
    z.object({ status: z.literal("disconnected") }),
    z.object({
        deviceId: z.string().min(1).optional(),
        invalidRows: z.number().int().nonnegative(),
        records: z.array(KOBO_RECORD_SCHEMA),
        status: z.literal("connected"),
    }),
]);

export type KoboSnapshot = z.infer<typeof KOBO_SNAPSHOT_SCHEMA>;

/** Validates the native database boundary before rendering or importing. */
export function parseKoboSnapshot(value: unknown): KoboSnapshot {
    return KOBO_SNAPSHOT_SCHEMA.parse(value);
}

/** Callbacks the Kobo connection monitor uses to read, report, and present scans. */
export interface KoboMonitorOptions {
    getPath(): string;
    hasModal(): boolean;
    present(
        snapshot: Extract<KoboSnapshot, { status: "connected" }>,
        manual: boolean,
    ): boolean;
    read(databasePath: string): Promise<KoboSnapshot>;
    status(message: string): void;
}
