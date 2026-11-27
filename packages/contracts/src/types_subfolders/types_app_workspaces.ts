/**
 * Renderer-runtime contracts for workspaces: switching dependencies, the shared
 * workspace runtime used by feature views, and transfer conflict resolution.
 */

import type { BookDialogSubmitPayload } from "./types-books-ui.ts";
import type {
    PlanController,
    RunAutoPlanFactoryArgs,
} from "./types_app_planning.ts";
import type { AppBootstrapContext } from "./types_app_runtime.ts";
import type { CalendarHandlers } from "./types_calendar.ts";
import type { LoadedPlannerState, PlannerSettings } from "./types_planner.ts";
import type {
    WorkspaceApi,
    WorkspaceCatalog,
    WorkspaceDependencyPolicy,
    WorkspaceId,
} from "./types_workspaces.ts";

/** Renderer wiring needed to switch workspaces safely. */
export interface WorkspaceSwitchDeps {
    api: WorkspaceApi;
    /** Applies a planner snapshot through the startup loader. */
    applyState(this: void, state: LoadedPlannerState): Promise<void>;
    context: AppBootstrapContext;
    planController: PlanController;
    /** Clears transient UI state (drafts, editors, selections) tied to the old data. */
    resetTransientUi(this: void): void;
}

/** Workspace operations shared by the selector, settings, dialog, and overview. */
export interface WorkspaceRuntime {
    /** Schedule handlers of the active workspace; other workspaces use `deps.api`. */
    calendarHandlers: CalendarHandlers;
    deps: WorkspaceSwitchDeps;
    moveBooks(
        this: void,
        bookIds: string[],
        workspaceId: WorkspaceId,
    ): Promise<void>;
    /** Re-reads the catalog from the host, e.g. after the first save of a fresh install. */
    refreshCatalog(this: void): Promise<void>;
    /** Re-applies the active workspace after a native change to it. */
    reloadActive(this: void): Promise<void>;
    switchTo(this: void, workspaceId: WorkspaceId): Promise<boolean>;
}

/** The user's choice for links a transfer would split; null cancels. */
export interface WorkspaceConflictResolution {
    bookIds: string[];
    dependencyPolicy: WorkspaceDependencyPolicy;
}

/** Notified whenever the renderer's cached workspace catalog changes. */
export type WorkspaceCatalogListener = (catalog: WorkspaceCatalog) => void;

/** Runs after the book dialog commits a save, e.g. to move the saved books. */
export type BookSaveHook = (payload: BookDialogSubmitPayload) => void;

/** One workspace's share of the All Workspaces view, planned on its own. */
export interface WorkspacePlanScope {
    ownsBook(this: void, bookId: string): boolean;
    /** The workspace's own planner settings. */
    settings(this: void): PlannerSettings;
    workspaceId: WorkspaceId;
}

/** Host command bridge, parameterized by the host's command-name union. */
export type HostInvoke<Command extends string> = <T>(
    command: Command,
    args?: Record<string, unknown>,
) => Promise<T>;

/** Debounced auto-plan scheduler whose pending run can be cancelled. */
export interface AutoPlanScheduler {
    cancel(this: void): void;
    schedule: RunAutoPlanFactoryArgs["scheduleAutoPlan"];
}
