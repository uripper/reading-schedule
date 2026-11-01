/** Keeps upload files and preview URLs transient until a saved book starts cover work. */
const UPLOADS = new Map<string, File>();

/** Creates a lightweight preview without decoding or transporting the image. */
export function stageCoverUpload(file: File): string {
    const SOURCE = URL.createObjectURL(file);
    UPLOADS.set(SOURCE, file);
    return SOURCE;
}

/** Finds a file selected in this renderer session. */
export function stagedCoverUpload(source: string): File | undefined {
    return UPLOADS.get(source);
}

/** Releases previews on replacement, cancellation, or dialog reuse. */
export function releaseCoverUpload(source: string): void {
    if (!UPLOADS.delete(source)) {
        return;
    }
    URL.revokeObjectURL(source);
}

/** Reads transport data asynchronously only after the book has been committed. */
export async function coverUploadDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const READER = new FileReader();
        READER.onload = (): void => {
            if (typeof READER.result !== "string" || !READER.result) {
                reject(
                    new Error(
                        "Could not read this cover image. Select it again to retry.",
                    ),
                );
                return;
            }
            resolve(READER.result);
        };
        READER.onerror = (): void => {
            reject(
                new Error(
                    "Could not read this cover image. Select it again to retry.",
                ),
            );
        };
        READER.onabort = READER.onerror;
        READER.readAsDataURL(file);
    });
}
