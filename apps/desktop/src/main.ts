import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { AppStateV2, GeneratePlanPayload, GeneratePlanResponse } from "@reading-schedule/contracts";

const IPC = {
  generate: "planner:generate",
  loadState: "planner:load-state",
  saveState: "planner:save-state",
  searchBooks: "planner:search-books",
  downloadCover: "planner:download-cover",
} as const;

function repoRoot(): string {
  return path.resolve(__dirname, "../../..");
}

function statePath(): string {
  return path.join(app.getPath("userData"), "planner_state_v2.json");
}

function runPythonBridge(args: string[], payload?: unknown): Promise<unknown> {
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
        const json = JSON.parse(stdout || "{}");
        if (!json.ok) {
          reject(new Error(json.error || stderr || "Planner bridge failed"));
          return;
        }
        resolve(json.data);
      } catch {
        reject(new Error(stderr || stdout || "Invalid planner bridge response"));
      }
    });

    if (payload !== undefined) proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

async function searchBooks(query: string): Promise<Array<Record<string, unknown>>> {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) return [];

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=8`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = (await response.json()) as { docs?: Array<Record<string, unknown>> };

    return (json.docs || []).map((doc) => {
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
        title: String(doc.title || "Untitled"),
        author,
        year,
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

  if (process.env.CLIENT_DEV_URL) {
    await win.loadURL(process.env.CLIENT_DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(clientEntry());
  }
}

ipcMain.handle(IPC.generate, async (_event, payload: GeneratePlanPayload) => {
  const data = await runPythonBridge([], payload);
  return data as GeneratePlanResponse;
});

ipcMain.handle(IPC.loadState, () => loadState());
ipcMain.handle(IPC.saveState, (_event, state: AppStateV2) => saveState(state));
ipcMain.handle(IPC.searchBooks, (_event, query: string) => searchBooks(query));
ipcMain.handle(IPC.downloadCover, () => null);

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
