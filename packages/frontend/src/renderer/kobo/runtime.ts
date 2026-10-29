/** Connects desktop database scans, shared progress mutations, and durable persistence. */
import type {
    AppBootstrapContext,
    KoboImportChoice,
    KoboSnapshot,
} from "@reading-schedule/contracts";
import { addLibraryBook } from "../books/add-book-flow.ts";
import { collectAllBooks, fillBooks } from "../books/controller.ts";
import { bindKoboConfiguration } from "./configuration.ts";
import { ignoreKoboRecord, visibleKoboRecords } from "./ignored.ts";
import type { prepareKoboImport } from "./import.ts";
import { applyKoboImport } from "./import.ts";
import {
    actionableKoboEntries,
    hasKoboUpdates,
    koboReviewEntries,
} from "./model.ts";
import { createKoboMonitor, startKoboMonitor } from "./monitor.ts";
import { showKoboReview } from "./review-dialog.ts";
import { createKoboSettings, koboSyncEnabled } from "./settings.ts";

/** Applies one reviewed batch and restores the library if the durable save fails. */
async function applyImport(
    context: AppBootstrapContext,
    choices: KoboImportChoice[],
): Promise<string> {
    const BATCH = await applyKoboImport(
        {
            changed: () => {
                context.runtime.handleBooksChanged();
            },
            flush: context.flushPendingState,
            getBooks: collectAllBooks,
            replaceBooks: fillBooks,
            save: context.persistDraft,
        },
        choices,
    );
    const MESSAGE = importMessage(BATCH);
    context.setStatus(MESSAGE);
    return MESSAGE;
}

/** Reports successful updates and stale or missing books that were left untouched. */
function importMessage(batch: ReturnType<typeof prepareKoboImport>): string {
    const MESSAGE = `Synced ${batch.imported} books with Kobo.`;
    if (batch.failed.length > 0) {
        return `${MESSAGE} Skipped changed, missing, or already imported books: ${batch.failed.join(", ")}. Check again to refresh.`;
    }
    return MESSAGE;
}

/** Omits no-op rows but shows unmatched records for user resolution. */
function presentSnapshot(
    context: AppBootstrapContext,
    snapshot: Extract<KoboSnapshot, { status: "connected" }>,
    manual: boolean,
): boolean {
    const ENTRIES = actionableKoboEntries(
        koboReviewEntries(
            visibleKoboRecords(snapshot.records, context.state.preferences),
            collectAllBooks(),
        ),
    );
    if (ENTRIES.length === 0 || !(manual || hasKoboUpdates(ENTRIES))) {
        return false;
    }
    showKoboReview({
        addBook: async (record) =>
            await addLibraryBook({
                progress_percent: record.percentRead,
                title: record.title,
            }),
        apply: async (choices) => await applyImport(context, choices),
        books: collectAllBooks(),
        entries: ENTRIES,
        ignore: async (record) => await ignoreKoboRecord(context, record),
        invalidRows: snapshot.invalidRows,
    });
    return true;
}

/** Installs controls and mount polling only on hosts with a native Kobo reader. */
export function startKoboSync(context: AppBootstrapContext): void {
    const READ = context.plannerApi.readKoboProgress;
    const PICK = context.plannerApi.pickKoboDatabase;
    if (READ === undefined || PICK === undefined) {
        return;
    }
    const NODES = createKoboSettings(context.state.preferences);
    const MONITOR = createKoboMonitor({
        getPath: () => configuredPath(context),
        hasModal: () =>
            NODES.enable.disabled ||
            document.querySelector("dialog[open]") !== null,
        present: (snapshot, manual) =>
            presentSnapshot(context, snapshot, manual),
        read: READ,
        status: (message) => {
            NODES.status.textContent = message;
        },
    });
    bindKoboConfiguration(context, {
        monitor: MONITOR,
        nodes: NODES,
        pick: PICK,
    });
    startMonitoring(MONITOR);
}

/** Stops polling when the host page is unloaded. */
function startMonitoring(monitor: ReturnType<typeof createKoboMonitor>): void {
    const STOP = startKoboMonitor(async () => {
        await monitor.check();
    });
    globalThis.addEventListener("pagehide", STOP, { once: true });
}

/** An unchecked provider pauses checks while retaining its selected database. */
function configuredPath(context: AppBootstrapContext): string {
    if (!koboSyncEnabled(context.state.preferences)) {
        return "";
    }
    return context.state.preferences.koboDatabasePath ?? "";
}
