import type { PlannerApi } from "./planner_api.js";

export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };
