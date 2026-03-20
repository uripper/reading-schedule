declare module "electron-reloader" {
    interface ElectronReloaderOptions {
        readonly debug?: boolean;
        readonly ignore?: ReadonlyArray<string | RegExp>;
        readonly watchRenderer?: boolean;
    }

    /**
     * Initializes Electron module hot-reload support.
     * @param targetModule - Main process module reference.
     * @param options - Optional watcher behavior overrides.
     */
    function electronReloader(
        targetModule: NodeJS.Module,
        options?: ElectronReloaderOptions,
    ): void;

    export = electronReloader;
}
