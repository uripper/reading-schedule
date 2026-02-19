import { useState } from "react";
import { Button, Card } from "@reading-schedule/ui";
import { nowIso, type GeneratePlanResponse } from "@reading-schedule/contracts";
import { usePlannerAdapter } from "../components/AdapterProvider";
import { sampleBooks, sampleSettings } from "./sampleData";

export function SchedulePage() {
  const adapter = usePlannerAdapter();
  const [result, setResult] = useState<GeneratePlanResponse | null>(null);
  const [status, setStatus] = useState("Idle");

  async function generate() {
    setStatus("Generating plan...");
    try {
      const plan = await adapter.generatePlan({
        planner: "mip",
        books: sampleBooks,
        settings: sampleSettings,
      });
      setResult(plan);

      await adapter.saveState({
        schemaVersion: 2,
        books: sampleBooks,
        settings: sampleSettings,
        sessions: [],
        preferences: {
          theme: "system",
          reduceMotion: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          dailyGoalMinutes: 30,
          reminderEnabled: false,
          reminderTime: "20:00",
        },
        featureFlags: {
          gamificationEnabled: false,
          socialEnabled: false,
          recommendationsEnabled: false,
        },
        lastResult: plan,
        updatedAt: nowIso(),
      });

      setStatus("Plan generated and state saved.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <Card title="Schedule">
      <p>This route exercises the shared planner adapter contract.</p>
      <Button onClick={() => void generate()}>Generate with sample data</Button>
      <p>{status}</p>
      {result && <p>Generated rows: {result.schedule.length}</p>}
    </Card>
  );
}
