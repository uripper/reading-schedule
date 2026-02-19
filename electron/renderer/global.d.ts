
import type { PlannerApi } from './app/types.js';

declare global {
  interface Window {
    plannerApi: PlannerApi;
  }
  var plannerApi: PlannerApi;
}

export {};
