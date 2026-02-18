import { createContext, useContext } from "react";
import type { PlannerAdapter } from "@reading-schedule/contracts";

const AdapterContext = createContext<PlannerAdapter | null>(null);

export function AdapterProvider(props: { adapter: PlannerAdapter; children: React.ReactNode }) {
  return <AdapterContext.Provider value={props.adapter}>{props.children}</AdapterContext.Provider>;
}

export function usePlannerAdapter(): PlannerAdapter {
  const adapter = useContext(AdapterContext);
  if (!adapter) throw new Error("Planner adapter not provided");
  return adapter;
}
