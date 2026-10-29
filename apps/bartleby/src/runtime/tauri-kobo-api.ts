/** Validates native Kobo progress before passing it to the shared renderer. */
import type { KoboSnapshot } from "@reading-schedule/contracts";
import { parseKoboSnapshot } from "@reading-schedule/contracts";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { TAURI_COMMANDS } from "./tauri-commands.ts";

/** Reads an explicitly configured local database through the native adapter. */
export async function readKoboProgress(
    databasePath: string,
): Promise<KoboSnapshot> {
    const RESULT = await invoke<unknown>(TAURI_COMMANDS.koboReadProgress, {
        databasePath,
    });
    return parseKoboSnapshot(RESULT);
}

/** Selects a database with the system picker, preserving cancellation as null. */
export async function pickKoboDatabase(
    databasePath?: string,
): Promise<string | null> {
    return await open({
        defaultPath: databasePath,
        directory: false,
        filters: [
            { extensions: ["sqlite", "sqlite3", "db"], name: "Kobo database" },
        ],
        multiple: false,
        title: "Select KoboReader.sqlite",
    });
}
