import type { PlannerAdapter } from "@reading-schedule/contracts";
import { desktopAdapter } from "./desktopAdapter";
import { httpAdapter } from "./httpAdapter";

function hasDesktopPlannerApi(): boolean {
  const scope = globalThis as typeof globalThis & { plannerApi?: PlannerAdapter };
  return Boolean(scope.plannerApi);
}

export function getDefaultAdapter(): PlannerAdapter {
  if (hasDesktopPlannerApi()) {
    return desktopAdapter;
  }
  return httpAdapter;
}
