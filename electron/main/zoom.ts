/**
 * @file Main-process zoom factor helpers for renderer web contents.
 */
import type { WebContents } from "electron";

const DEFAULT_UI_SCALE = 1.55;
const MIN_UI_SCALE = 0.7;
const MAX_UI_SCALE = 3;
export const UI_SCALE_STEP = 0.1;
const ZOOM_PRECISION = 100;

/**
 * Clamps a zoom factor to supported bounds and handles invalid numbers.
 * @param value Candidate zoom factor.
 * @returns Clamped zoom factor within configured limits.
 */
function clampZoomFactor(value: number): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_UI_SCALE;
    }
    return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, value));
}

/**
 * Normalizes zoom factor precision after clamping.
 * @param value Candidate zoom factor.
 * @returns Rounded zoom factor using configured precision.
 */
function normalizedZoomFactor(value: number): number {
    return Math.round(clampZoomFactor(value) * ZOOM_PRECISION) / ZOOM_PRECISION;
}

/**
 * Reads and normalizes the current zoom factor from web contents.
 * @param webContents Electron web contents whose zoom is read.
 * @returns Normalized current zoom factor.
 */
function currentZoomFactor(webContents: WebContents): number {
    return normalizedZoomFactor(webContents.getZoomFactor());
}

/**
 * Applies and returns a normalized zoom factor for the target web contents.
 * @param webContents Electron web contents receiving the zoom update.
 * @param value Requested zoom factor.
 * @returns Applied normalized zoom factor.
 */
export function setZoomFactor(webContents: WebContents, value: number): number {
    const NEXT_FACTOR = normalizedZoomFactor(value);
    webContents.setZoomFactor(NEXT_FACTOR);
    return NEXT_FACTOR;
}

/**
 * Reads the initial zoom factor from environment or default settings.
 * @returns Initial normalized zoom factor.
 */
export function initialZoomFactor(): number {
    const REQUESTED_SCALE_RAW =
        process.env.UI_SCALE ?? String(DEFAULT_UI_SCALE);
    const REQUESTED_SCALE = Number(REQUESTED_SCALE_RAW);
    return normalizedZoomFactor(REQUESTED_SCALE);
}

/**
 * Moves the current zoom factor by a delta and returns the applied value.
 * @param webContents Electron web contents receiving the zoom update.
 * @param delta Relative zoom delta to apply.
 * @returns Applied normalized zoom factor.
 */
export function shiftZoomFactor(
    webContents: WebContents,
    delta: number,
): number {
    return setZoomFactor(webContents, currentZoomFactor(webContents) + delta);
}
