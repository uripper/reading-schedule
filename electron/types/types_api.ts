import type {
  BookLookupItem,
  LoadedPlannerState,
  PlanGeneratePayload,
  PlannerResult,
  PlannerSaveResult,
  PlannerStateSnapshot,
} from "./types_base.js";

export interface PlannerApi {
  loadState(): Promise<LoadedPlannerState | null | undefined>;
  sample(): Promise<Pick<PlannerStateSnapshot, "settings" | "books">>;
  saveState(state: PlannerStateSnapshot): Promise<PlannerSaveResult>;
  generate(
    payload: PlanGeneratePayload,
  ): Promise<Pick<PlannerResult, "schedule" | "summary">>;
  searchBooks(query: string): Promise<BookLookupItem[]>;
  downloadCover(
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  zoomIn(): Promise<number>;
  zoomOut(): Promise<number>;
  zoomReset(): Promise<number>;
}
