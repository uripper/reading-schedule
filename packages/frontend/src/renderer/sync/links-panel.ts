/** Lists a book's synced sources in its details dialog with per-link unlinking. */
import type {
    Book,
    SyncImportStore,
    SyncRecord,
} from "@reading-schedule/contracts";
import { syncButton, syncElement } from "./dom.ts";
import { confirmSyncUnlink, unlinkSyncSource } from "./links-unlink.ts";
import { syncSourceLabel } from "./links.ts";
import { syncReadDateLabel, syncRecordName } from "./review-conflicts.ts";

const PANEL_ID = "bookSyncLinks";
const UNLINK_FAILED = "Could not unlink this source. Retry.";

// audit-allow-local-types: Injected callbacks are this renderer's private wiring.
type UnlinkFlow = {
    confirm(link: SyncRecord): Promise<boolean>;
    store: SyncImportStore;
};

let configuredFlow: UnlinkFlow | null = null;

/** Enables unlinking once a host with sync providers supplies its library store. */
export function configureSyncLinks(
    store: SyncImportStore,
    confirm: (link: SyncRecord) => Promise<boolean> = confirmSyncUnlink,
): void {
    configuredFlow = { confirm, store };
}

/** Shows provider, device, source title, and the last imported reading state. */
function linkItem(
    book: Book,
    link: SyncRecord,
    status: HTMLElement,
): HTMLLIElement {
    const ITEM = syncElement("li");
    const SOURCE = syncElement("strong", syncSourceLabel(link));
    SOURCE.className = "sync-link-source";
    const TITLE = syncElement("span", syncRecordName(link));
    TITLE.className = "sync-link-title";
    const UNLINK = syncButton("Unlink", () => {
        startUnlink(book.book_id, link, status);
    });
    UNLINK.classList.add("btn-remove");
    UNLINK.setAttribute("aria-label", `Unlink ${syncSourceLabel(link)}`);
    ITEM.append(SOURCE, TITLE, readingDetails(link), UNLINK);
    return ITEM;
}

/** Keeps progress and last-read date separate so they can wrap on narrow screens. */
function readingDetails(link: SyncRecord): HTMLDivElement {
    const DETAILS = syncElement("div");
    DETAILS.className = "sync-link-details";
    const PROGRESS = syncElement("span", `${link.percentRead}% read`);
    PROGRESS.className = "sync-link-progress";
    DETAILS.append(
        PROGRESS,
        syncElement(
            "span",
            `Last read ${syncReadDateLabel(link.dateLastRead)}`,
        ),
    );
    return DETAILS;
}

/** Re-renders from the saved library so the dialog reflects what was persisted. */
async function unlink(bookId: string, link: SyncRecord): Promise<void> {
    const FLOW = configuredFlow;
    if (FLOW === null) {
        throw new Error("Sync is not available on this device.");
    }
    if (!(await FLOW.confirm(link))) {
        return;
    }
    await unlinkSyncSource(FLOW.store, bookId, link);
    renderSyncLinks(
        FLOW.store.getBooks().find((book) => book.book_id === bookId) ?? null,
        `Unlinked ${syncSourceLabel(link)}.`,
    );
}

/** Uses the error's own guidance when it has one. */
function unlinkErrorText(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return UNLINK_FAILED;
}

/** Keeps failures visible in the panel instead of the console. */
function startUnlink(
    bookId: string,
    link: SyncRecord,
    status: HTMLElement,
): void {
    const STATUS = status;
    unlink(bookId, link).catch((error: unknown) => {
        STATUS.textContent = unlinkErrorText(error);
    });
}

/** Renders saved sources or an empty state for a single existing book. */
export function renderSyncLinks(book: Book | null, message = ""): void {
    const PANEL = document.getElementById(PANEL_ID);
    if (PANEL === null) {
        return;
    }
    const STATUS = syncElement("p", message);
    STATUS.setAttribute("role", "status");
    PANEL.hidden = book === null && message === "";
    PANEL.replaceChildren(panelContent(book, STATUS), STATUS);
}

/** Collapses source cards by default and opens the empty state for unlinked books. */
function panelContent(book: Book | null, status: HTMLElement): HTMLElement {
    const DETAILS = syncElement("details");
    DETAILS.open = !book?.sync_links?.length || status.textContent !== "";
    const SUMMARY = syncElement("summary");
    SUMMARY.className = "book-section-toggle";
    SUMMARY.append(syncElement("h3", "Synced sources"));
    DETAILS.append(SUMMARY, sourceList(book, status));
    return DETAILS;
}

/** Shows the source cards or the empty state inside the disclosure. */
function sourceList(book: Book | null, status: HTMLElement): HTMLElement {
    const LINKS = book?.sync_links ?? [];
    if (book === null || LINKS.length === 0) {
        return syncElement("p", "No synced sources");
    }
    const LIST = syncElement("ul");
    LIST.append(...LINKS.map((link) => linkItem(book, link, status)));
    return LIST;
}
