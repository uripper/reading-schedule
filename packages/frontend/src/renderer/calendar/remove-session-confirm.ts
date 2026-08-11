import type { CalendarRowWithFinish } from "../../types/types.ts";
import { confirmDestructiveAction } from "../confirm/action-confirm.ts";

export function confirmRemoveSession(
    row: CalendarRowWithFinish,
): Promise<boolean> {
    return confirmDestructiveAction({
        confirmLabel: "Remove Session",
        message: `Remove "${row.title}" from ${row.date}?`,
        title: "Remove Session",
    });
}
