/**
 * @file Main-process zoom factor helpers for renderer web contents.
 */
import type { WebContents } from "electron";

const DEFAULT_UI_SCALE = 1.55;
const MIN_UI_SCALE = 0.7;
const MAX_UI_SCALE = 3;
export const UI_SCALE_STEP = 0.1;
const ZOOM_PRECISION = 100;

function clampZoomFactor(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_UI_SCALE;
  }
  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, value));
}

function normalizedZoomFactor(value: number): number {
  return Math.round(clampZoomFactor(value) * ZOOM_PRECISION) / ZOOM_PRECISION;
}

function currentZoomFactor(webContents: WebContents): number {
  return normalizedZoomFactor(webContents.getZoomFactor());
}

/**
 * Applies and returns a normalized zoom factor for the target web contents.
 */
export function setZoomFactor(webContents: WebContents, value: number): number {
  const nextFactor = normalizedZoomFactor(value);
  webContents.setZoomFactor(nextFactor);
  return nextFactor;
}

/**
 * Reads the initial zoom factor from environment or default settings.
 */
export function initialZoomFactor(): number {
  const requestedScale = Number(process.env.UI_SCALE || String(DEFAULT_UI_SCALE));
  return normalizedZoomFactor(requestedScale);
}

/**
 * Moves the current zoom factor by a delta and returns the applied value.
 */
export function shiftZoomFactor(webContents: WebContents, delta: number): number {
  return setZoomFactor(webContents, currentZoomFactor(webContents) + delta);
}
