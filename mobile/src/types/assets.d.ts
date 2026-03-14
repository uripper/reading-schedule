declare module "*.png" {
    const VALUE: number;
    // biome-ignore lint/style/noDefaultExport: Metro asset modules are imported as default values.
    export default VALUE;
}

declare module "*.jpg" {
    const VALUE: number;
    // biome-ignore lint/style/noDefaultExport: Metro asset modules are imported as default values.
    export default VALUE;
}
