import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { AppStateV2, BookLookupItem, GeneratePlanPayload, GeneratePlanResponse } from "@reading-schedule/contracts";

const IPC = {
  generate: "planner:generate",
  loadState: "planner:load-state",
  saveState: "planner:save-state",
  searchBooks: "planner:search-books",
  downloadCover: "planner:download-cover",
} as const;
const DEV_SERVER_PING_TIMEOUT_MS = 1500;

function repoRoot(): string {
  return path.resolve(__dirname, "../../..");
}

function statePath(): string {
  return path.join(app.getPath("userData"), "planner_state_v2.json");
}

type PlannerBridgeResponse = {
  ok?: boolean;
  error?: string;
  data?: GeneratePlanResponse;
};

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

function runPythonBridge(args: string[], payload?: GeneratePlanPayload): Promise<GeneratePlanResponse> {
  return new Promise((resolve, reject) => {
    const pythonBin = process.env.PYTHON_BIN || "python";
    const proc = spawn(pythonBin, ["-m", "reading_plan.gui_api", ...args], {
      cwd: repoRoot(),
      env: {
        ...process.env,
        PYTHONPATH: path.join(repoRoot(), "src"),
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", () => {
      try {
        const json = JSON.parse(stdout || "{}") as PlannerBridgeResponse;
        if (!json.ok) {
          reject(new Error(json.error || stderr || "Planner bridge failed"));
          return;
        }
        if (!json.data) {
          reject(new Error("Planner bridge response missing data"));
          return;
        }
        resolve(json.data);
      } catch {
        reject(new Error(stderr || stdout || "Invalid planner bridge response"));
      }
    });

    if (payload !== undefined) {
      proc.stdin.write(JSON.stringify(payload));
    }
    proc.stdin.end();
  });
}

async function searchBooks(query: string): Promise<BookLookupItem[]> {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) {
    return [];
  }

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=8`;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as OpenLibraryResponse;

    return (json.docs || []).map((doc): BookLookupItem => {
      let author = "";
      if (Array.isArray(doc.author_name)) {
        author = String(doc.author_name[0] || "");
      }

      let year = "";
      if (doc.first_publish_year) {
        year = String(doc.first_publish_year);
      }

      let pagesEstimate: number | null = null;
      if (typeof doc.number_of_pages_median === "number") {
        pagesEstimate = Math.round(doc.number_of_pages_median);
      }

      let coverUrl = "";
      if (typeof doc.cover_i === "number") {
        coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }

      return {
        author,
        year,
        title: String(doc.title || "Untitled"),
        pages_estimate: pagesEstimate,
        cover_url: coverUrl,
        source: "Open Library",
      };
    });
  } catch {
    return [];
  }
}

function loadState(): AppStateV2 | null {
  try {
    const data = fs.readFileSync(statePath(), "utf8");
    return JSON.parse(data) as AppStateV2;
  } catch {
    return null;
  }
}

function saveState(state: AppStateV2): { ok: true } {
  fs.mkdirSync(path.dirname(statePath()), { recursive: true });
  fs.writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return { ok: true };
}

function clientEntry(): string {
  return path.join(repoRoot(), "apps", "client", "dist", "index.html");
}

function configuredClientDevUrl(): string | null {
  const raw = String(process.env.CLIENT_DEV_URL || "").trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).toString();
  } catch {
    console.info(`Ignoring invalid CLIENT_DEV_URL: ${raw}`);
    return null;
  }
}

async function isDevServerReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, DEV_SERVER_PING_TIMEOUT_MS);
  try {
    await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadClientContent(win: BrowserWindow): Promise<void> {
  const devUrl = configuredClientDevUrl();
  if (devUrl) {
    const reachable = await isDevServerReachable(devUrl);
    if (reachable) {
      await win.loadURL(devUrl);
      win.webContents.openDevTools({ mode: "detach" });
      return;
    }
    console.info(`Dev server unavailable at ${devUrl}; loading built client.`);
  }
  const entry = clientEntry();
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Client bundle not found at ${entry}. Start the client dev server or run: pnpm --filter @reading-schedule/client build`,
    );
  }
  await win.loadFile(entry);
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 980,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await loadClientContent(win);
}

ipcMain.handle(IPC.generate, (_event, payload: GeneratePlanPayload) => {
  return runPythonBridge([], payload);
});

ipcMain.handle(IPC.loadState, () => loadState());
ipcMain.handle(IPC.saveState, (_event, state: AppStateV2) => saveState(state));
ipcMain.handle(IPC.searchBooks, (_event, query: string) => searchBooks(query));
ipcMain.handle(IPC.downloadCover, () => null);

function openDesktopWindowOnReady(): void {
  void createWindow().catch((error) => {
    console.info("Failed to create desktop window", error);
    app.quit();
  });
}

app.on("ready", openDesktopWindowOnReady);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
