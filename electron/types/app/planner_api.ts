import type { PlannerApi } from "../types.js";

export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };
