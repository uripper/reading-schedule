import type { PlannerApi } from './types.js';

type PlannerApiGlobal = typeof globalThis & {
  plannerApi: PlannerApi;
};

export function getPlannerApi(): PlannerApi {
  return (globalThis as PlannerApiGlobal).plannerApi;
}
