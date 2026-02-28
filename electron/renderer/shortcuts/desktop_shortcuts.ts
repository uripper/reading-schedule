import type { ShortcutBindings } from "../../types/types.js";
import { createZoomShortcutHandler } from "./desktop_shortcuts_zoom.js";

/**
 * Wires global desktop shortcut handlers for zoom commands.
 * @param root0 Shortcut dependencies.
 * @param root0.announce Live-region announcer for shortcut feedback messages.
 * @param root0.plannerApi Bridge API for zoom actions.
 */
export function bindDesktopShortcuts({
	announce,
	plannerApi,
}: ShortcutBindings): void {
	const handleZoomShortcut = createZoomShortcutHandler(plannerApi, announce);
	document.addEventListener("keydown", (event) => {
		if (event.defaultPrevented) {
			return;
		}
		handleZoomShortcut(event);
	});
}
