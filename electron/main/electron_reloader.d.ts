declare module "electron-reloader" {
	export interface ElectronReloaderOptions {
		readonly debug?: boolean;
		readonly ignore?: ReadonlyArray<string | RegExp>;
		readonly watchRenderer?: boolean;
	}

	/**
	 * Initializes Electron module hot-reload support.
	 * @param targetModule Main process module reference.
	 * @param options Optional watcher behavior overrides.
	 */
	export default function reload(
		targetModule: NodeJS.Module,
		options?: ElectronReloaderOptions,
	): void;
}
