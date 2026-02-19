import {
  AppStateSchemaV2,
  ErrorResponseSchema,
  GeneratePlanPayloadSchema,
  GeneratePlanResponseSchema,
  nowIso,
  type AppStateV2,
  type PlannerAdapter,
} from "@reading-schedule/contracts";
import { db } from "../offline/db";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const DOES_NOT_EXIST_ERROR = 404;

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsedError = ErrorResponseSchema.safeParse(data);
    if (parsedError.success) {
      throw new Error(parsedError.data.error.message);
    }
    throw new Error(`HTTP ${response.status}`);
  }
  return data;
}

export const httpAdapter: PlannerAdapter = {
  async generatePlan(payload) {
    const valid = GeneratePlanPayloadSchema.parse(payload);
    const response = await fetch(`${API_BASE}/v1/plan/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid),
    });
    const data = await parseJsonResponse(response);
    return GeneratePlanResponseSchema.parse(data);
  },

  async loadState() {
    try {
      const response = await fetch(`${API_BASE}/v1/state`, { method: "GET" });
      if (response.status === DOES_NOT_EXIST_ERROR) {
        return null;
      }
      const data = await parseJsonResponse(response);
      const parsed = AppStateSchemaV2.parse(data);
      await db.state.clear();
      await db.state.add(parsed);
      return parsed;
    } catch {
      const cached = await db.state.orderBy("updatedAt").last();
      return cached ?? null;
    }
  },

  async saveState(state: AppStateV2) {
    const valid = AppStateSchemaV2.parse(state);
    await db.transaction("rw", db.state, db.queue, async () => {
      await db.state.clear();
      await db.state.add(valid);
      await db.queue.add({
        kind: "save-state",
        payload: valid,
        createdAt: nowIso(),
      });
    });

    try {
      const response = await fetch(`${API_BASE}/v1/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valid),
      });
      await parseJsonResponse(response);
      await db.queue.where("kind").equals("save-state").delete();
    } catch {
      // Keep queued mutation for later replay.
    }
    return { ok: true as const };
  },

  async searchBooks(query: string) {
    const response = await fetch(`${API_BASE}/v1/books/search?q=${encodeURIComponent(query)}`, { method: "GET" });
    const data = await parseJsonResponse(response);
    if (Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  },

  async downloadCover() {
    return null;
  },
};
