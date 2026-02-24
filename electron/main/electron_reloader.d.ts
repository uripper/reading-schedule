declare module "electron-reloader" {
  /**
   * Initializes Electron module hot-reload support.
   * @param targetModule Main process module reference.
   */
  export default function reload(targetModule: NodeJS.Module): void;
}
