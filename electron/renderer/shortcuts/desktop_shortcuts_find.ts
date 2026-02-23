import { createFindControllerImpl } from "./desktop_shortcuts_find_controller.js";
import type {
  FindApi,
  FindController,
  FindControllerArgs,
} from "./desktop_shortcuts_find_types.js";

export type { FindApi, FindController, FindControllerArgs };

/**
 * Creates handlers for find-bar lifecycle, keyboard shortcuts, and navigation.
 * @param args Find controller dependencies and DOM bindings.
 * @returns Controller object for binding and shortcut handling.
 */
export function createFindController(args: FindControllerArgs): FindController {
  return createFindControllerImpl(args);
}
