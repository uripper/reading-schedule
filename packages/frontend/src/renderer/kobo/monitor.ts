/** Polls a configured mount path without overlapping scans or repeated popups. */
import type { KoboMonitorOptions } from "@reading-schedule/contracts";

const KOBO_POLL_INTERVAL_MS = 5_000;

// audit-allow-local-types: Transient monitor state never leaves this module.
interface MonitorState {
    busy: boolean;
    lastPath: string;
    presented: boolean;
}

/** Creates a serialized checker; errors preserve the current connection's popup suppression. */
export function createKoboMonitor(options: KoboMonitorOptions) {
    const STATE: MonitorState = { busy: false, lastPath: "", presented: false };
    return {
        check: async (manual = false): Promise<void> => {
            await checkedScan(options, STATE, manual);
        },
    };
}

/** Releases the scan guard on failures so a later retry can succeed. */
async function checkedScan(
    options: KoboMonitorOptions,
    state: MonitorState,
    manual: boolean,
): Promise<void> {
    if (state.busy || options.hasModal()) {
        return;
    }
    const STATE = state;
    STATE.busy = true;
    try {
        await scan(options, STATE, manual);
    } catch (error) {
        options.status(koboErrorMessage(error));
    } finally {
        STATE.busy = false;
    }
}

/** Resets suppression only for a new path or a confirmed disconnect. */
async function scan(
    options: KoboMonitorOptions,
    state: MonitorState,
    manual: boolean,
): Promise<void> {
    const STATE = state;
    const PATH = options.getPath().trim();
    if (PATH !== STATE.lastPath) {
        STATE.lastPath = PATH;
        STATE.presented = false;
    }
    if (PATH === "") {
        return;
    }
    const SNAPSHOT = await options.read(PATH);
    if (options.getPath().trim() === PATH) {
        processSnapshot(options, { manual, snapshot: SNAPSHOT, state: STATE });
    }
}

/** Presents at most once per connection unless the user explicitly checks again. */
function processSnapshot(
    options: KoboMonitorOptions,
    scanResult: {
        manual: boolean;
        snapshot: Awaited<ReturnType<KoboMonitorOptions["read"]>>;
        state: MonitorState;
    },
): void {
    const STATE = scanResult.state;
    if (scanResult.snapshot.status === "disconnected") {
        STATE.presented = false;
        options.status("Kobo disconnected or file unavailable.");
        return;
    }
    options.status(connectedStatus(scanResult.snapshot.invalidRows));
    if ((scanResult.manual || !STATE.presented) && !options.hasModal()) {
        STATE.presented =
            options.present(scanResult.snapshot, scanResult.manual) ||
            STATE.presented;
    }
}

/** Reports errors without repeating an explanatory paragraph during normal checks. */
function connectedStatus(invalidRows: number): string {
    if (invalidRows === 0) {
        return "Connected";
    }
    return `Connected`;
}

/** Formats native and JavaScript errors without object coercion. */
export function koboErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return `Kobo sync: ${error.message}`;
    }
    if (typeof error === "string") {
        return `Kobo sync: ${error}`;
    }
    return "Kobo sync failed. Reconnect the device and choose Check now to retry.";
}

/** Starts connection checks while Bartleby is running and returns a cleanup function. */
export function startKoboMonitor(check: () => Promise<void>): () => void {
    const RUN = (): void => {
        check().catch(reportUnexpectedFailure);
    };
    const TIMER = globalThis.setInterval(RUN, KOBO_POLL_INTERVAL_MS);
    RUN();
    return (): void => {
        globalThis.clearInterval(TIMER);
    };
}

/** Surfaces unexpected scheduling failures in the existing application status area. */
function reportUnexpectedFailure(error: unknown): void {
    const STATUS = document.getElementById("status");
    if (STATUS !== null) {
        STATUS.textContent = koboErrorMessage(error);
    }
}
