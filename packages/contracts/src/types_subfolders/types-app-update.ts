/**
 * Shared contracts for desktop update discovery, progress, and presentation.
 */

/** Download event emitted while an updater resource streams an artifact. */
export type AppUpdateDownloadEvent =
    | {
          data: { contentLength?: number };
          event: "Started";
      }
    | {
          data: { chunkLength: number };
          event: "Progress";
      }
    | {
          event: "Finished";
      };

/** Update resource returned by a platform update checker. */
export interface AppUpdateCandidate {
    /** Optional release notes. */
    body?: string;
    /** Releases the platform resource. */
    close(): Promise<void>;
    /** Currently installed application version. */
    currentVersion: string;
    /** Downloads, verifies, and installs the update artifact. */
    downloadAndInstall(
        onEvent?: (event: AppUpdateDownloadEvent) => void,
    ): Promise<void>;
    /** Available application version. */
    version: string;
}

/** User-visible phases emitted while applying an update. */
export type AppUpdateProgress =
    | { phase: "preparing" }
    | {
          downloadedBytes: number;
          phase: "downloading";
          totalBytes: number | null;
      }
    | { phase: "installing" }
    | { phase: "restarting" };

/** Actions and metadata presented by an update dialog. */
export interface AppUpdateDialogPresentation {
    /** Currently installed application version. */
    currentVersion: string;
    /** Human-readable release notes. */
    notes: string;
    /** Installs the update and reports user-visible progress. */
    onInstall(report: (progress: AppUpdateProgress) => void): Promise<void>;
    /** Dismisses the update for the current session. */
    onLater(): void;
    /** Available application version. */
    version: string;
}

/** Presentation adapter used by update orchestration. */
export interface AppUpdateDialog {
    /** Shows one available update. */
    show(presentation: AppUpdateDialogPresentation): void;
}

/** Dependencies for the testable application-update controller. */
export interface AppUpdateControllerOptions {
    /** Queries the configured update provider. */
    checkForUpdate(): Promise<AppUpdateCandidate | null>;
    /** Presents available update actions. */
    dialog: AppUpdateDialog;
    /** Persists the latest state before installation. */
    flushPendingState(): Promise<boolean>;
    /** Restarts the application after installation. */
    relaunchApp(): Promise<void>;
    /** Records a recoverable updater error. */
    reportError(message: string, error: unknown): void;
}

/** Controller used to trigger update discovery. */
export interface AppUpdateController {
    /** Checks immediately unless a check or prompt is already active. */
    checkNow(): Promise<void>;
}

/** Minimal document surface used by the recurring update scheduler. */
export interface AppUpdateSchedulerDocument {
    /** Registers a foreground-state listener. */
    addEventListener(type: "visibilitychange", listener: () => void): void;
    /** Removes a foreground-state listener. */
    removeEventListener(type: "visibilitychange", listener: () => void): void;
    /** Current document foreground state. */
    visibilityState: "hidden" | "visible";
}

/** Scheduler environment used for launch, interval, and visibility checks. */
export interface AppUpdateSchedulerOptions {
    /** Update controller to invoke. */
    controller: AppUpdateController;
    /** Document-like visibility event source. */
    document: AppUpdateSchedulerDocument;
    /** Returns the current epoch time in milliseconds. */
    now(): number;
    /** Records a recoverable scheduler error. */
    reportError(message: string, error: unknown): void;
}

/** Disposable recurring update-check scheduler. */
export interface AppUpdateScheduler {
    /** Stops interval and visibility checks. */
    dispose(): void;
}
