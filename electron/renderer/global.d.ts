
import type { PlannerApi } from './app/types.js';

declare global {
  interface Window {
    plannerApi: PlannerApi;
  }
  let plannerApi: PlannerApi;
}

export {};
