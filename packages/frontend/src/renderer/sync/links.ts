/** Keeps one source link per provider, device, and source book, including legacy Kobo history. */
import type { BookInput, SyncRecord } from "@reading-schedule/contracts";
import {
    KOBO_RECORD_SCHEMA,
    SYNC_PROVIDER_KOBO,
    SYNC_RECORD_SCHEMA,
} from "@reading-schedule/contracts";

/** Single-link history persisted before provider-neutral links existed. */
const LEGACY_KOBO_FIELD = "kobo_progress";
const PROVIDER_LABELS: Readonly<Record<string, string>> = {
    [SYNC_PROVIDER_KOBO]: "Kobo",
};

/** Names a provider for people, falling back to its identifier. */
export function syncProviderLabel(provider: string): string {
    return PROVIDER_LABELS[provider] ?? provider;
}

/** Names a link's provider and, when known, the device it came from. */
export function syncSourceLabel(record: SyncRecord): string {
    const PROVIDER = syncProviderLabel(record.provider);
    if (record.deviceId === undefined) {
        return PROVIDER;
    }
    return `${PROVIDER} (${record.deviceId})`;
}

/** Same provider and source book, on any device. */
export function isSameSyncSource(
    link: SyncRecord,
    record: SyncRecord,
): boolean {
    return (
        link.provider === record.provider && link.sourceId === record.sourceId
    );
}

/** Same device as well; a legacy link without a device belongs to the next device to sync it. */
export function isSameSyncLink(link: SyncRecord, record: SyncRecord): boolean {
    return (
        isSameSyncSource(link, record) &&
        (link.deviceId === undefined || link.deviceId === record.deviceId)
    );
}

/** Finds the link a record would update, if the book already has one. */
export function linkedSyncRecord(
    links: readonly SyncRecord[] | undefined,
    record: SyncRecord,
): SyncRecord | undefined {
    return (links ?? []).find((link) => isSameSyncLink(link, record));
}

/** Replaces only this device's link, leaving other devices' links intact. */
export function withSyncLink(
    links: readonly SyncRecord[] | undefined,
    record: SyncRecord,
): SyncRecord[] {
    return [
        ...(links ?? []).filter((link) => !isSameSyncLink(link, record)),
        record,
    ];
}

/** Removes exactly one link; the source book stays eligible for later matching. */
export function withoutSyncLink(
    links: readonly SyncRecord[] | undefined,
    target: SyncRecord,
): SyncRecord[] {
    return (links ?? []).filter(
        (link) =>
            !(
                isSameSyncSource(link, target) &&
                link.deviceId === target.deviceId
            ),
    );
}

/** Validates stored links and migrates a legacy Kobo record into the list. */
export function normalizedSyncLinks(book: BookInput): SyncRecord[] {
    const LINKS = storedLinks(book.sync_links);
    const LEGACY = legacyKoboLink(Reflect.get(book, LEGACY_KOBO_FIELD));
    if (
        LEGACY === null ||
        LINKS.some((link) => isSameSyncSource(link, LEGACY))
    ) {
        return LINKS;
    }
    return [...LINKS, LEGACY];
}

/** Drops malformed entries instead of rejecting the whole book. */
function storedLinks(value: unknown): SyncRecord[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.flatMap((link: unknown) => {
        const RESULT = SYNC_RECORD_SCHEMA.safeParse(link);
        if (!RESULT.success) {
            return [];
        }
        return [RESULT.data];
    });
}

/** Legacy links never recorded a device, so any Kobo can update them. */
function legacyKoboLink(value: unknown): SyncRecord | null {
    const RESULT = KOBO_RECORD_SCHEMA.safeParse(value);
    if (!RESULT.success) {
        return null;
    }
    const { contentId, ...RECORD } = RESULT.data;
    return { ...RECORD, provider: SYNC_PROVIDER_KOBO, sourceId: contentId };
}
