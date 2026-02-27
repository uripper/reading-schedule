import type { PlannerApi } from "../types/types.js";

declare global {
  interface Window {
    plannerApi: PlannerApi;
  }
}

export {};
