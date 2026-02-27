import type { JsonValue } from "../types_json";

export interface PlannerApi {
  /** Downloads a remote cover image and stores it for the given book id. */
  downloadCover(
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  /** Saves a user-uploaded cover data URL for the given book id. */
  saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  /** Generates a plan from renderer-provided planner payload data. */
  generate(payload: JsonValue): Promise<JsonValue>;
  /** Loads persisted planner state from the main process. */
  loadState(): Promise<JsonValue>;
  /** Returns sample planner data for quick testing and onboarding flows. */
  sample(): Promise<JsonValue>;
  /** Saves planner state and returns a structured success/error payload. */
  saveState(payload: JsonValue): Promise<{ ok?: boolean; error?: string }>;
  /** Searches external book providers and returns raw search result rows. */
  searchBooks(query: string): Promise<JsonValue[]>;
  /** Increases renderer zoom level and returns the resulting zoom factor. */
  zoomIn(): Promise<number>;
  /** Decreases renderer zoom level and returns the resulting zoom factor. */
  zoomOut(): Promise<number>;
  /** Resets renderer zoom level and returns the resulting zoom factor. */
  zoomReset(): Promise<number>;
}
