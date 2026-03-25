import type { PlannerApi, PlannerApiGlobal } from "../../types/types.ts";

/**
 * Reads the typed planner API bridge installed by the active desktop host.
 * @returns Planner API adapter for host-backed operations.
 */
export function getPlannerApi(): PlannerApi {
    const { plannerApi } = globalThis as PlannerApiGlobal;
    if (!plannerApi) {
        throw new Error("Desktop planner API bridge not found.");
    }
    return plannerApi;
}
