import type { PlannerApi } from "../../types/types.js";

type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

/**
 * Reads the typed planner API bridge exposed by Electron preload.
 * @returns Planner API adapter for IPC-backed operations.
 */
export function getPlannerApi(): PlannerApi {
  const { plannerApi } = globalThis as PlannerApiGlobal;
  if (!plannerApi) {
    throw new Error("Desktop planner API bridge not found.");
  }
  return plannerApi;
}
