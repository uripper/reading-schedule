import type { PlannerApi } from "../app/types.js";

export type FindApi = Pick<PlannerApi, "findInPage" | "stopFindInPage">;

export interface FindControllerArgs {
  announce(message: string, politeness?: "polite" | "assertive"): void;
  findBar: HTMLElement;
  findCloseButton: HTMLButtonElement;
  findInput: HTMLInputElement;
  findNextButton: HTMLButtonElement;
  findPrevButton: HTMLButtonElement;
  findStatus: HTMLOutputElement;
  plannerApi: FindApi;
}

export interface FindController {
  bind(): void;
  handleFindBarEscape(event: KeyboardEvent): boolean;
  handleFindShortcut(event: KeyboardEvent): boolean;
}
