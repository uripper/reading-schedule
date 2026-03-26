import type { PlannerApi } from "../types/types.ts";

declare global {
    interface Window {
        plannerApi: PlannerApi;
    }
}
