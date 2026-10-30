/** Tags native Kobo rows as provider-neutral sync records for the shared review. */
import type {
    KoboRecord,
    KoboSnapshot,
    Preferences,
    SyncRecord,
} from "@reading-schedule/contracts";
import { SYNC_PROVIDER_KOBO } from "@reading-schedule/contracts";
import { visibleKoboRecords } from "./ignored.ts";

/** Converts `ContentID` to the shared source ID and attaches the device that reported it. */
export function toKoboSyncRecord(
    record: KoboRecord,
    deviceId: string | undefined,
): SyncRecord {
    const { contentId, ...FIELDS } = record;
    const RECORD: SyncRecord = {
        ...FIELDS,
        provider: SYNC_PROVIDER_KOBO,
        sourceId: contentId,
    };
    if (deviceId !== undefined) {
        RECORD.deviceId = deviceId;
    }
    return RECORD;
}

/** Removes ignored books before tagging so exclusions never reach matching or review. */
export function koboSyncRecords(
    snapshot: Extract<KoboSnapshot, { status: "connected" }>,
    preferences: Partial<Preferences>,
): SyncRecord[] {
    return visibleKoboRecords(snapshot.records, preferences).map((record) =>
        toKoboSyncRecord(record, snapshot.deviceId),
    );
}
