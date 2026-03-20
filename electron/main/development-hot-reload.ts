/**
 * Shared hot-reload wiring for the Electron main process.
 */

const HOT_RELOAD_IGNORED_OUTPUTS = ["dist/main.js", "dist/main/**"] as const;

export interface ElectronReloaderOptions {
    readonly debug?: boolean;
    readonly ignore?: ReadonlyArray<string | RegExp>;
    readonly watchRenderer?: boolean;
}

type ElectronReloaderCallable = (
    targetModule: NodeJS.Module,
    options: ElectronReloaderOptions,
) => void;

export interface ElectronReloaderModule {
    readonly default?: ElectronReloaderCallable;
}

export interface DevelopmentHotReloadArgs {
    importElectronReloader(): Promise<
        ElectronReloaderCallable | ElectronReloaderModule
    >;
    isPackaged: boolean;
    targetModule: NodeJS.Module;
}

function resolveElectronReloader(
    moduleExport: ElectronReloaderCallable | ElectronReloaderModule,
): ElectronReloaderCallable {
    if (typeof moduleExport === "function") {
        return moduleExport;
    }
    if (moduleExport && typeof moduleExport.default === "function") {
        return moduleExport.default;
    }
    throw new TypeError("Electron reloader export is not callable.");
}

/**
 * Enables main-process hot reload during development.
 * @param args - Development-state flags and Electron reloader import hook.
 */
export async function enableDevelopmentHotReload(
    args: DevelopmentHotReloadArgs,
): Promise<void> {
    if (args.isPackaged) {
        return;
    }
    const MODULE_EXPORT = await args.importElectronReloader();
    const RELOAD_MAIN_PROCESS = resolveElectronReloader(MODULE_EXPORT);
    RELOAD_MAIN_PROCESS(args.targetModule, {
        ignore: HOT_RELOAD_IGNORED_OUTPUTS,
        watchRenderer: true,
    });
}

export { HOT_RELOAD_IGNORED_OUTPUTS };
