/** Connects desktop database scans, shared progress mutations, and durable persistence. */
import type {
    AppBootstrapContext,
    KoboMonitorOptions,
    KoboSnapshot,
    SyncImportChoice,
    SyncImportStore,
    SyncReviewEntry,
    SyncReviewPresentation,
} from "@reading-schedule/contracts";
import { addLibraryBook } from "../books/add-book-flow.ts";
import { collectAllBooks, fillBooks } from "../books/controller.ts";
import { collectSettings } from "../settings.ts";
import type { prepareSyncImport } from "../sync/import.ts";
import { applySyncImport } from "../sync/import.ts";
import { configureSyncLinks } from "../sync/links-panel.ts";
import {
    actionableSyncEntries,
    hasSyncUpdates,
    syncReviewEntries,
} from "../sync/model.ts";
import { showSyncNotice } from "../sync/notice.ts";
import { showSyncReview } from "../sync/review-dialog.ts";
import { renderSyncSessions, stageSyncSessions } from "../sync/sessions.ts";
import { bindKoboConfiguration } from "./configuration.ts";
import { ignoreKoboRecord } from "./ignored.ts";
import { createKoboMonitor, startKoboMonitor } from "./monitor.ts";
import { koboSyncRecords } from "./records.ts";
import {
    createKoboSettings,
    koboSyncEnabled,
    setKoboStatus,
} from "./settings.ts";

const KOBO_SOURCE_LABEL = "Kobo";

/** Shares the library and durable save path between imports and link removal. */
function libraryStore(context: AppBootstrapContext): SyncImportStore {
    return {
        changed: () => {
            renderSyncSessions(context);
            context.runtime.handleBooksChanged();
        },
        flush: context.flushPendingState,
        getBooks: collectAllBooks,
        replaceBooks: fillBooks,
        save: context.persistDraft,
        stageSessions: (choices) =>
            stageSyncSessions(context.state, {
                books: collectAllBooks(),
                choices,
                settings: collectSettings(),
            }),
    };
}

/** Applies one reviewed batch and restores the library if the durable save fails. */
async function applyImport(
    context: AppBootstrapContext,
    choices: SyncImportChoice[],
): Promise<string> {
    const BATCH = await applySyncImport(libraryStore(context), choices);
    const MESSAGE = importMessage(BATCH);
    context.setStatus(MESSAGE);
    return MESSAGE;
}

/** Reports successful updates and stale or missing books that were left untouched. */
function importMessage(batch: ReturnType<typeof prepareSyncImport>): string {
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
    const ENTRIES = actionableSyncEntries(
        syncReviewEntries(
            koboSyncRecords(snapshot, context.state.preferences),
            collectAllBooks(),
        ),
    );
    if (ENTRIES.length === 0) {
        if (manual) {
            showSyncNotice("All books up to date!");
        }
        return false;
    }
    if (!(manual || hasSyncUpdates(ENTRIES))) {
        return false;
    }
    showSyncReview(reviewPresentation(context, snapshot, ENTRIES));
    return true;
}

/** Supplies Kobo's add, import, and ignore actions to the shared review. */
function reviewPresentation(
    context: AppBootstrapContext,
    snapshot: Extract<KoboSnapshot, { status: "connected" }>,
    entries: SyncReviewEntry[],
): SyncReviewPresentation {
    return {
        addBook: async (record) =>
            await addLibraryBook({
                author: record.author ?? "",
                progress_percent: record.percentRead,
                title: record.title,
            }),
        apply: async (choices) => await applyImport(context, choices),
        books: collectAllBooks(),
        entries,
        ignore: async (record) => await ignoreKoboRecord(context, record),
        invalidRows: snapshot.invalidRows,
        sourceLabel: KOBO_SOURCE_LABEL,
    };
}

/** Installs controls and mount polling only on hosts with a native Kobo reader. */
export function startKoboSync(context: AppBootstrapContext): void {
    const READ = context.plannerApi.readKoboProgress;
    const PICK = context.plannerApi.pickKoboDatabase;
    if (READ === undefined || PICK === undefined) {
        return;
    }
    configureSyncLinks(libraryStore(context));
    const NODES = createKoboSettings(context.state.preferences);
    const MONITOR = koboMonitor(context, NODES, READ);
    bindKoboConfiguration(context, {
        monitor: MONITOR,
        nodes: NODES,
        pick: PICK,
    });
    startMonitoring(MONITOR);
}

/** Pauses checks while settings are busy or any dialog is open. */
function koboMonitor(
    context: AppBootstrapContext,
    nodes: ReturnType<typeof createKoboSettings>,
    read: KoboMonitorOptions["read"],
): ReturnType<typeof createKoboMonitor> {
    return createKoboMonitor({
        getPath: () => configuredPath(context),
        hasModal: () =>
            nodes.enable.disabled ||
            document.querySelector("dialog[open]") !== null,
        present: (snapshot, manual) =>
            presentSnapshot(context, snapshot, manual),
        read,
        status: (message) => {
            setKoboStatus(nodes.status, message);
        },
    });
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
