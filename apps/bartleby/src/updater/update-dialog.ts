/**
 * Builds and manages Bartleby's neobrutalist application-update dialog.
 */

import type {
    AppUpdateDialog,
    AppUpdateDialogPresentation,
    AppUpdateProgress,
} from "@reading-schedule/contracts";
import {
    closeUpdateDialog,
    createUpdateDialogNodes,
} from "./update-dialog-nodes.ts";

const PERCENT_COMPLETE = 100;
// audit-allow-local-types: This alias is private to the desktop DOM adapter.
type UpdateDialogNodes = ReturnType<typeof createUpdateDialogNodes>;

/** Enables or disables all dialog actions during installation. */
function setBusy(nodes: UpdateDialogNodes, busy: boolean): void {
    const NODES = nodes;
    NODES.closeButton.disabled = busy;
    NODES.installButton.disabled = busy;
    NODES.laterButton.disabled = busy;
}

/** Enforces exhaustive handling of update progress phases. */
function assertUnreachableProgress(progress: never): never {
    throw new Error(`Unhandled update progress: ${JSON.stringify(progress)}`);
}

/** Renders determinate or indeterminate download progress. */
function renderDownloadProgress(
    nodes: UpdateDialogNodes,
    progress: Extract<AppUpdateProgress, { phase: "downloading" }>,
): void {
    const NODES = nodes;
    NODES.progress.hidden = false;
    if (progress.totalBytes === null || progress.totalBytes <= 0) {
        NODES.progress.removeAttribute("value");
        NODES.status.textContent = "Downloading update…";
        return;
    }
    const PERCENT = Math.min(
        PERCENT_COMPLETE,
        Math.round(
            (progress.downloadedBytes / progress.totalBytes) * PERCENT_COMPLETE,
        ),
    );
    NODES.progress.value = PERCENT;
    NODES.status.textContent = `Downloading update… ${PERCENT}%`;
}

/** Renders the current save, download, install, or restart phase. */
function renderProgress(
    nodes: UpdateDialogNodes,
    progress: AppUpdateProgress,
): void {
    const NODES = nodes;
    if (progress.phase === "preparing") {
        NODES.status.textContent = "Saving your latest changes…";
        return;
    }
    if (progress.phase === "downloading") {
        renderDownloadProgress(NODES, progress);
        return;
    }
    if (progress.phase === "installing") {
        NODES.progress.hidden = false;
        NODES.progress.value = PERCENT_COMPLETE;
        NODES.status.textContent = "Installing update…";
        return;
    }
    if (progress.phase === "restarting") {
        NODES.status.textContent = "Restarting Bartleby…";
        return;
    }
    assertUnreachableProgress(progress);
}

/** Normalizes an unknown install failure for display. */
function errorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected update error.";
}

/** Runs an install action and restores controls after recoverable errors. */
async function runInstall(
    nodes: UpdateDialogNodes,
    presentation: AppUpdateDialogPresentation,
): Promise<void> {
    const NODES = nodes;
    setBusy(NODES, true);
    try {
        await presentation.onInstall((progress) => {
            renderProgress(NODES, progress);
        });
    } catch (error) {
        NODES.status.textContent = `Update failed: ${errorMessage(error)}`;
        setBusy(NODES, false);
    }
}

/** Binds dismissal, installation, and keyboard-cancel behavior. */
function bindDialogEvents(
    nodes: UpdateDialogNodes,
    presentation: AppUpdateDialogPresentation,
): void {
    const NODES = nodes;
    const REMIND_LATER = (): void => {
        presentation.onLater();
        closeUpdateDialog(NODES.dialog);
    };
    NODES.closeButton.addEventListener("click", REMIND_LATER);
    NODES.laterButton.addEventListener("click", REMIND_LATER);
    NODES.installButton.addEventListener("click", () => {
        runInstall(NODES, presentation).catch((error: unknown) => {
            NODES.status.textContent = `Update failed: ${errorMessage(error)}`;
            setBusy(NODES, false);
        });
    });
    NODES.dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        if (!NODES.installButton.disabled) {
            REMIND_LATER();
        }
    });
}

/**
 * Creates the custom dialog adapter used by the desktop update controller.
 * @returns Update dialog that renders release metadata and install progress.
 */
export function createAppUpdateDialog(): AppUpdateDialog {
    return {
        show: (presentation): void => {
            const NODES = createUpdateDialogNodes(presentation);
            bindDialogEvents(NODES, presentation);
            document.body.append(NODES.dialog);
            NODES.dialog.showModal();
            NODES.laterButton.focus();
        },
    };
}
