/** Isolated, validated browser persistence and race-safe demo reset. */

import type {
    PlannerSaveResult,
    PlannerStateLoadResult,
    PlannerStateSnapshot,
} from "@reading-schedule/contracts";
import { parsePlannerStateSnapshot } from "@reading-schedule/contracts";

export const DEMO_STORAGE_KEY = "bartleby.website.demo.v1";

/** Owns only the demo key and prevents delayed saves from undoing a reset. */
export class DemoStorage {
    private canSave = true;

    private readonly getStorage: () => Pick<
        Storage,
        "getItem" | "setItem" | "removeItem"
    >;

    /** Accepts browser storage lazily, including browsers that deny access. */
    public constructor(
        getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">,
    ) {
        this.getStorage = getStorage;
    }

    /** Restores a complete validated snapshot or reports a recoverable failure. */
    public load(): PlannerStateLoadResult {
        try {
            const SAVED = this.getStorage().getItem(DEMO_STORAGE_KEY);
            if (SAVED === null) {
                return { source: "fresh", state: null };
            }
            const INPUT: unknown = JSON.parse(SAVED);
            return {
                source: "browser_storage",
                state: parsePlannerStateSnapshot(INPUT),
            };
        } catch (error) {
            return {
                source: "fresh",
                state: null,
                warningCode: "STATE_RESET_FRESH",
                warningMessage: storageError(error),
            };
        }
    }

    /** Reports quota/access failures so the frontend can show unsaved status. */
    public save(state: PlannerStateSnapshot): PlannerSaveResult {
        if (!this.canSave) {
            return { ok: true };
        }
        try {
            const STATE = parsePlannerStateSnapshot(state);
            this.getStorage().setItem(DEMO_STORAGE_KEY, JSON.stringify(STATE));
            return { ok: true };
        } catch (error) {
            return { error: storageError(error), ok: false };
        }
    }

    /** Deletes only demo data; successful reset freezes pending persistence. */
    public reset(): void {
        this.getStorage().removeItem(DEMO_STORAGE_KEY);
        this.canSave = false;
    }
}

/** Converts untrusted exceptions into actionable persistence diagnostics. */
function storageError(error: unknown): string {
    let detail = "Storage is unavailable.";
    if (error instanceof Error) {
        detail = error.message;
    }
    return `Demo changes could not be restored or saved. Allow browser storage or reset the demo. ${detail}`;
}
