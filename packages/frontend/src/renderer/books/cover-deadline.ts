/** Bounds background cover work so a stalled host or file read cannot prevent retries. */
export const COVER_JOB_TIMEOUT_MS = 30_000;
const COVER_TIMEOUT_MESSAGE =
    "Cover processing timed out. Select the cover again to retry.";

/** Releases the job even when its underlying worker cannot be cancelled. */
export async function withCoverDeadline<Cover>(
    operation: Promise<Cover>,
): Promise<Cover> {
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const TIMEOUT = new Promise<never>((_resolve, reject) => {
        timer = globalThis.setTimeout(
            () => reject(new Error(COVER_TIMEOUT_MESSAGE)),
            COVER_JOB_TIMEOUT_MS,
        );
    });
    try {
        return await Promise.race([operation, TIMEOUT]);
    } finally {
        globalThis.clearTimeout(timer);
    }
}
