/**
 * Plan controller that follows what the renderer shows.
 *
 * With one workspace open it is the regular controller. In the All Workspaces view
 * every usable workspace plans separately (see `init-plan-scope.ts`), so budgets,
 * settings, and schedules never pool; each workspace's controller is created on
 * first use. Invalidation always reaches every controller, so a plan started before
 * a switch is never applied after it.
 */
import type {
    AppBootstrapContext,
    PlanController,
    WorkspaceId,
    WorkspacePlanScope,
} from "../../types/types.ts";
import { buildScopedPlanController } from "../app/init/init-plan-scope.ts";
import { collectSettings } from "../settings.ts";
import {
    bookWorkspaceId,
    combinedWorkspaceSettings,
    isViewingAllWorkspaces,
    usableWorkspaces,
} from "./workspace-store.ts";

/** Describes one workspace's share of the All Workspaces view. */
function planScope(workspaceId: WorkspaceId): WorkspacePlanScope {
    return {
        ownsBook: (bookId) => bookWorkspaceId(bookId) === workspaceId,
        settings: () =>
            combinedWorkspaceSettings(workspaceId) ?? collectSettings(),
        workspaceId,
    };
}

/** Returns (creating on first use) the controller of every usable workspace. */
function scopedControllers(
    context: AppBootstrapContext,
    cache: Map<WorkspaceId, PlanController>,
): PlanController[] {
    return usableWorkspaces().map((workspace) => {
        let controller = cache.get(workspace.id);
        if (controller === undefined) {
            controller = buildScopedPlanController(
                context,
                planScope(workspace.id),
            );
            cache.set(workspace.id, controller);
        }
        return controller;
    });
}

/**
 * Wraps the regular plan controller with per-workspace planning for All Workspaces.
 * @param context - Shared renderer context.
 * @param base - Controller used while one workspace is open.
 * @returns Controller to hand to the runtime.
 */
export function createWorkspacePlanController(
    context: AppBootstrapContext,
    base: PlanController,
): PlanController {
    const CACHE = new Map<WorkspaceId, PlanController>();
    const SHOWN = (): PlanController[] => {
        if (!isViewingAllWorkspaces()) {
            return [base];
        }
        return scopedControllers(context, CACHE);
    };
    return {
        applyLoadedResult: (savedResult): void => {
            base.applyLoadedResult(savedResult);
        },
        invalidatePendingRuns: (): void => {
            for (const CONTROLLER of [base, ...CACHE.values()]) {
                CONTROLLER.invalidatePendingRuns();
            }
        },
        queueAutoPlan: (): void => {
            for (const CONTROLLER of SHOWN()) {
                CONTROLLER.queueAutoPlan();
            }
        },
        replanToday: (): void => {
            for (const CONTROLLER of SHOWN()) {
                CONTROLLER.replanToday();
            }
        },
    };
}
