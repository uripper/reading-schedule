import type { ShortcutBindings } from "../../types/types.ts";
import { createZoomShortcutHandler } from "./desktop-shortcuts-zoom.ts";

/**
 * Wires global desktop shortcut handlers for zoom commands.
 * @param root0 - Shortcut dependencies.
 * @param announce - Live-region announcer for shortcut feedback messages.
 * @param plannerApi - Bridge API for zoom actions.
 */
export function bindDesktopShortcuts({
    announce,
    plannerApi,
}: ShortcutBindings): void {
    const HANDLE_ZOOM_SHORTCUT = createZoomShortcutHandler(
        plannerApi,
        announce,
    );
    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented) {
            return;
        }
        HANDLE_ZOOM_SHORTCUT(event);
    });
}
