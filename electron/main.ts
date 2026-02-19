import { spawn } from 'node:child_process';
import path from 'node:path';

import { app, BrowserWindow, ipcMain } from 'electron';

import { downloadCover, searchBooks } from './book_lookup';
import { readState, writeState } from './state_store';

const DEFAULT_UI_SCALE = 1.55;
const PLANNER_MODULE = 'reading_plan.gui_api';
const PYTHONPATH_SEGMENT = 'src';

type DownloadCoverPayload = {
  bookId?: string;
  url?: string;
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

function parseBridgeOutput(stdout: string, stderr: string): unknown {
  try {
    const parsed = JSON.parse(stdout || '{}') as { data?: unknown; error?: string; ok?: boolean };
    if (!parsed.ok) {
      throw new Error(parsed.error || stderr || 'Planner failed');
    }
    return parsed.data;
  } catch {
    throw new Error(stderr || stdout || 'Invalid planner response');
  }
}

function runBridge(args: string[], payload?: unknown): Promise<unknown> {
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

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1800,
    height: 1100,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const requestedScale = Number(process.env.UI_SCALE || String(DEFAULT_UI_SCALE));
  let zoomFactor = DEFAULT_UI_SCALE;
  if (Number.isFinite(requestedScale)) {
    zoomFactor = requestedScale;
  }

  window.webContents.setZoomFactor(zoomFactor);
  window.loadFile(path.join(__dirname, 'index.html'));
}

function userData(): string {
  return app.getPath('userData');
}

function asDownloadCoverPayload(value: unknown): DownloadCoverPayload {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const payload = value as DownloadCoverPayload;
  return {
    url: payload.url,
    bookId: payload.bookId,
  };
}

ipcMain.handle('plan:sample', () => runBridge(['--sample']));
ipcMain.handle('plan:generate', (_event, payload: unknown) => runBridge([], payload));
ipcMain.handle('book:search', (_event, query: unknown) => searchBooks(String(query ?? '')));
ipcMain.handle('book:downloadCover', (_event, payload: unknown) => {
  const request = asDownloadCoverPayload(payload);
  return downloadCover(request.url, request.bookId, userData());
});
ipcMain.handle('state:load', () => readState(userData()));
ipcMain.handle('state:save', (_event, payload: unknown) => {
  const result = writeState(userData(), payload);
  if (result.ok === false) {
    throw new Error(result.error || 'Failed to save state');
  }
  return result;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
