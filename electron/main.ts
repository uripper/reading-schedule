import { spawn } from 'node:child_process';
import path from 'node:path';

import { app, BrowserWindow, ipcMain, type WebContents } from 'electron';

import { downloadCover, saveUploadedCover, searchBooks } from './book_lookup';
import { readState, type JsonValue, writeState } from './state_store';
import { findInPage, stopFindInPage, type WindowFindRequest } from './window_find';

const DEFAULT_UI_SCALE = 1.55;
const MIN_UI_SCALE = 0.7;
const MAX_UI_SCALE = 3;
const UI_SCALE_STEP = 0.1;
const ZOOM_PRECISION = 100;
const PLANNER_MODULE = 'reading_plan.gui_api';
const PYTHONPATH_SEGMENT = 'src';

type DownloadCoverPayload = {
  bookId?: string;
  url?: string;
};

type UploadCoverPayload = {
  bookId?: string;
  dataUrl?: string;
};

type BridgeResponse = {
  data?: JsonValue;
  error?: string;
  ok?: boolean;
};

function root(): string {
  return path.join(__dirname, '..', '..');
}

function pyEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONPATH: path.join(root(), PYTHONPATH_SEGMENT),
  };
}

function appendChunk(target: string, chunk: Buffer | string): string {
  return target + chunk.toString();
}

function parseBridgeOutput(stdout: string, stderr: string): JsonValue {
  try {
    const parsed = JSON.parse(stdout || '{}') as BridgeResponse;
    if (!parsed.ok) {
      throw new Error(parsed.error || stderr || 'Planner failed');
    }
    if (parsed.data === undefined) {
      return null;
    }
    return parsed.data;
  } catch {
    throw new Error(stderr || stdout || 'Invalid planner response');
  }
}

function runBridge(args: string[], payload?: JsonValue): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    const pythonBinary = process.env.PYTHON_BIN || 'python';
    const processHandle = spawn(pythonBinary, ['-m', PLANNER_MODULE, ...args], {
      cwd: root(),
      env: pyEnv(),
    });

    let stdout = '';
    let stderr = '';

    processHandle.stdout.on('data', (chunk: Buffer | string) => {
      stdout = appendChunk(stdout, chunk);
    });
    processHandle.stderr.on('data', (chunk: Buffer | string) => {
      stderr = appendChunk(stderr, chunk);
    });
    processHandle.on('error', reject);
    processHandle.on('close', () => {
      try {
        resolve(parseBridgeOutput(stdout, stderr));
      } catch (error) {
        reject(error);
      }
    });

    if (payload !== undefined) {
      processHandle.stdin.write(JSON.stringify(payload));
    }
    processHandle.stdin.end();
  });
}

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

function setZoomFactor(webContents: WebContents, value: number): number {
  const nextFactor = normalizedZoomFactor(value);
  webContents.setZoomFactor(nextFactor);
  return nextFactor;
}

function initialZoomFactor(): number {
  const requestedScale = Number(process.env.UI_SCALE || String(DEFAULT_UI_SCALE));
  return normalizedZoomFactor(requestedScale);
}

function shiftZoomFactor(webContents: WebContents, delta: number): number {
  return setZoomFactor(webContents, currentZoomFactor(webContents) + delta);
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1800,
    height: 1100,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  setZoomFactor(window.webContents, initialZoomFactor());
  window.loadFile(path.join(__dirname, 'index.html'));
}

function userData(): string {
  return app.getPath('userData');
}

function asDownloadCoverPayload(value: DownloadCoverPayload | null): DownloadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    url: value.url,
    bookId: value.bookId,
  };
}

function asUploadCoverPayload(value: UploadCoverPayload | null): UploadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    dataUrl: value.dataUrl,
    bookId: value.bookId,
  };
}

ipcMain.handle('plan:sample', () => runBridge(['--sample']));
ipcMain.handle('plan:generate', (_event, payload: JsonValue) => runBridge([], payload));
ipcMain.handle('book:search', (_event, query: string) => searchBooks(String(query || '')));
ipcMain.handle('book:downloadCover', (_event, payload: DownloadCoverPayload | null) => {
  const request = asDownloadCoverPayload(payload);
  return downloadCover(request.url, request.bookId, userData());
});
ipcMain.handle('book:saveUploadedCover', (_event, payload: UploadCoverPayload | null) => {
  const request = asUploadCoverPayload(payload);
  return saveUploadedCover(request.dataUrl, request.bookId, userData());
});
ipcMain.handle('state:load', () => readState(userData()));
ipcMain.handle('state:save', (_event, payload: JsonValue) => {
  const result = writeState(userData(), payload);
  if (result.ok === false) {
    throw new Error(result.error || 'Failed to save state');
  }
  return result;
});
ipcMain.handle('window:zoomIn', (event) => shiftZoomFactor(event.sender, UI_SCALE_STEP));
ipcMain.handle('window:zoomOut', (event) => shiftZoomFactor(event.sender, -UI_SCALE_STEP));
ipcMain.handle('window:zoomReset', (event) => setZoomFactor(event.sender, initialZoomFactor()));
ipcMain.handle('window:findInPage', (event, payload: WindowFindRequest | null) =>
  findInPage(event.sender, payload));
ipcMain.handle('window:stopFindInPage', (event) => stopFindInPage(event.sender));

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
