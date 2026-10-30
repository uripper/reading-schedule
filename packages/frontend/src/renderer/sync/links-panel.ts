/** Lists a book's synced sources in its details dialog with per-link unlinking. */
import type {
    Book,
    SyncImportStore,
    SyncRecord,
} from "@reading-schedule/contracts";
import { syncButton, syncElement } from "./dom.ts";
import { syncSourceLabel } from "./links.ts";
import { confirmSyncUnlink, unlinkSyncSource } from "./links-unlink.ts";
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

/** Places the section just above the dialog's Save and Cancel buttons. */
function panelNode(): HTMLElement | null {
    const EXISTING = document.getElementById(PANEL_ID);
    if (EXISTING !== null) {
        return EXISTING;
    }
    const FORM = document.getElementById("bookForm");
    if (FORM === null) {
        return null;
    }
    const PANEL = syncElement("section");
    PANEL.id = PANEL_ID;
    PANEL.className = "sync-links";
    PANEL.setAttribute("aria-label", "Synced sources");
    const ACTIONS = FORM.querySelector("#cancelBookBtn")?.parentElement;
    FORM.insertBefore(PANEL, ACTIONS ?? null);
    return PANEL;
}

/** Shows provider, device, source title, and the last imported reading state. */
function linkItem(
    book: Book,
    link: SyncRecord,
    status: HTMLElement,
): HTMLLIElement {
    const ITEM = syncElement("li");
    const SOURCE = syncElement("strong", syncSourceLabel(link));
    const DETAILS = syncElement(
        "span",
        `“${syncRecordName(link)}” · ${link.percentRead}% · last read ${syncReadDateLabel(link.dateLastRead)}`,
    );
    const ID = syncElement("small", `Source ID: ${link.sourceId}`);
    const UNLINK = syncButton("Unlink", () => {
        startUnlink(book.book_id, link, status);
    });
    UNLINK.setAttribute("aria-label", `Unlink ${syncSourceLabel(link)}`);
    ITEM.append(SOURCE, DETAILS, ID, UNLINK);
    return ITEM;
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

/** Renders the current book's links; hides the section for new, bulk, or unlinked books. */
export function renderSyncLinks(book: Book | null, message = ""): void {
    const PANEL = panelNode();
    if (PANEL === null) {
        return;
    }
    const STATUS = syncElement("p", message);
    STATUS.setAttribute("role", "status");
    const CONTENT = panelContent(book, STATUS);
    PANEL.hidden = CONTENT.length === 0 && message === "";
    PANEL.replaceChildren(...CONTENT, STATUS);
}

/** Lists links under a heading, or nothing for new, bulk, or unlinked books. */
function panelContent(book: Book | null, status: HTMLElement): HTMLElement[] {
    const LINKS = book?.sync_links ?? [];
    if (book === null || LINKS.length === 0) {
        return [];
    }
    const LIST = syncElement("ul");
    LIST.append(...LINKS.map((link) => linkItem(book, link, status)));
    return [syncElement("h3", "Synced sources"), LIST];
}
