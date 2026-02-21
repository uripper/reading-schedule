import type { PlannerApi } from "./types.js";

type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

export function getPlannerApi(): PlannerApi {
  const { plannerApi } = globalThis as PlannerApiGlobal;
  if (!plannerApi) {
    throw new Error("Desktop planner API bridge not found.");
  }
  return plannerApi;
}
