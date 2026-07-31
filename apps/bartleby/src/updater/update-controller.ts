/**
 * Coordinates update checks, session dismissal, safe persistence, and install.
 */

import type {
    AppUpdateCandidate,
    AppUpdateController,
    AppUpdateControllerOptions,
    AppUpdateDialogPresentation,
    AppUpdateDownloadEvent,
    AppUpdateProgress,
} from "@reading-schedule/contracts";

// audit-allow-local-types: Controller state is transient desktop orchestration state.
interface UpdateControllerState {
    activeVersion: string | null;
    checking: boolean;
    dismissedVersions: Set<string>;
}

/** Creates fresh session-scoped controller state. */
function updateControllerState(): UpdateControllerState {
    return {
        activeVersion: null,
        checking: false,
        dismissedVersions: new Set<string>(),
    };
}

/** Converts platform download events into user-visible progress. */
function progressReporter(
    report: (progress: AppUpdateProgress) => void,
): (event: AppUpdateDownloadEvent) => void {
    let downloadedBytes = 0;
    let totalBytes: number | null = null;
    return (event: AppUpdateDownloadEvent): void => {
        if (event.event === "Started") {
            totalBytes = event.data.contentLength ?? null;
            report({ downloadedBytes, phase: "downloading", totalBytes });
            return;
        }
        if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            report({ downloadedBytes, phase: "downloading", totalBytes });
            return;
        }
        report({ phase: "installing" });
    };
}

/** Flushes state, installs one candidate, and relaunches the application. */
async function installCandidate(
    options: AppUpdateControllerOptions,
    candidate: AppUpdateCandidate,
    report: (progress: AppUpdateProgress) => void,
): Promise<void> {
    report({ phase: "preparing" });
    const SAVED = await options.flushPendingState();
    if (!SAVED) {
        throw new Error(
            "Bartleby could not save your latest changes. The update was not installed.",
        );
    }
    await candidate.downloadAndInstall(progressReporter(report));
    report({ phase: "restarting" });
    await options.relaunchApp();
}

/** Dismisses and releases one candidate for the current session. */
function dismissCandidate(
    options: AppUpdateControllerOptions,
    state: UpdateControllerState,
    candidate: AppUpdateCandidate,
): void {
    const STATE = state;
    STATE.dismissedVersions.add(candidate.version);
    STATE.activeVersion = null;
    candidate.close().catch((error: unknown) => {
        options.reportError("Failed to release dismissed update.", error);
    });
}

/** Binds candidate metadata and actions for the update dialog. */
function updatePresentation(
    options: AppUpdateControllerOptions,
    state: UpdateControllerState,
    candidate: AppUpdateCandidate,
): AppUpdateDialogPresentation {
    return {
        currentVersion: candidate.currentVersion,
        notes: candidate.body ?? "A newer Bartleby release is available.",
        onInstall: async (report): Promise<void> => {
            await installCandidate(options, candidate, report);
        },
        onLater: (): void => {
            dismissCandidate(options, state, candidate);
        },
        version: candidate.version,
    };
}

/** Releases an update candidate that should not be presented. */
async function closeIgnoredCandidate(
    options: AppUpdateControllerOptions,
    candidate: AppUpdateCandidate,
): Promise<void> {
    try {
        await candidate.close();
    } catch (error) {
        options.reportError("Failed to release ignored update.", error);
    }
}

/** Presents a new candidate unless that version was already dismissed. */
async function presentAvailableUpdate(
    options: AppUpdateControllerOptions,
    state: UpdateControllerState,
    candidate: AppUpdateCandidate | null,
): Promise<void> {
    const STATE = state;
    if (candidate === null) {
        return;
    }
    if (STATE.dismissedVersions.has(candidate.version)) {
        await closeIgnoredCandidate(options, candidate);
        return;
    }
    STATE.activeVersion = candidate.version;
    options.dialog.show(updatePresentation(options, STATE, candidate));
}

/**
 * Creates a controller that discovers and presents at most one update at a time.
 * @param options - Platform, persistence, presentation, and logging adapters.
 * @returns Update controller with an explicit immediate check operation.
 */
export function createAppUpdateController(
    options: AppUpdateControllerOptions,
): AppUpdateController {
    const STATE = updateControllerState();
    return {
        checkNow: async (): Promise<void> => {
            if (STATE.checking || STATE.activeVersion !== null) {
                return;
            }
            STATE.checking = true;
            try {
                const CANDIDATE = await options.checkForUpdate();
                await presentAvailableUpdate(options, STATE, CANDIDATE);
            } finally {
                STATE.checking = false;
            }
        },
    };
}
