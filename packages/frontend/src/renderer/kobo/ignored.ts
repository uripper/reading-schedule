/** Persists explicit exclusions by Kobo content ID, including future progress changes. */
import type {
    AppBootstrapContext,
    KoboProgress,
    Preferences,
} from "@reading-schedule/contracts";
import { confirmAction } from "../confirm/action-confirm.ts";
import { saveKoboConfiguration } from "./configuration.ts";

/** Removes ignored source records before they can match, display, or import. */
export function visibleKoboRecords(
    records: readonly KoboProgress[],
    preferences: Partial<Preferences>,
): KoboProgress[] {
    const IGNORED = new Set(preferences.koboIgnoredContentIds ?? []);
    return records.filter((record) => !IGNORED.has(record.contentId));
}

/** Shows the lasting consequence before saving an exclusion. */
export async function confirmKoboIgnore(
    record: KoboProgress,
): Promise<boolean> {
    return await confirmAction({
        confirmLabel: "Ignore book",
        message: `Ignore “${record.title}”?`,
        title: "Ignore Kobo book?",
        warning:
            "This book will not appear again or sync reading progress from Kobo in the future.",
    });
}

/** Persists an exclusion only after the user confirms the future-sync warning. */
export async function ignoreKoboRecord(
    context: AppBootstrapContext,
    record: KoboProgress,
    confirm: (record: KoboProgress) => Promise<boolean> = confirmKoboIgnore,
): Promise<boolean> {
    if (!(await confirm(record))) {
        return false;
    }
    await saveKoboConfiguration(context, {
        koboIgnoredContentIds: [
            ...new Set([
                ...(context.state.preferences.koboIgnoredContentIds ?? []),
                record.contentId,
            ]),
        ],
    });
    return true;
}
