const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

function root() {
  return path.join(__dirname, "..");
}

function pyEnv() {
  return { ...process.env, PYTHONPATH: path.join(root(), "src") };
}

function runBridge(args, payload) {
  return new Promise((resolve, reject) => {
    const py = process.env.PYTHON_BIN || "python";
    const proc = spawn(py, ["-m", "reading_plan.gui_api", ...args], { cwd: root(), env: pyEnv() });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", () => {
      try {
        const json = JSON.parse(out || "{}");
        if (!json.ok) return reject(new Error(json.error || err || "Planner failed"));
        resolve(json.data);
      } catch {
        reject(new Error(err || out || "Invalid planner response"));
      }
    });
    if (payload) proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1800,
    height: 1100,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  const zoom = Number(process.env.UI_SCALE || "1.35");
  win.webContents.setZoomFactor(Number.isFinite(zoom) ? zoom : 1.35);
  win.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.handle("plan:sample", () => runBridge(["--sample"]));
ipcMain.handle("plan:generate", (_event, payload) => runBridge([], payload));

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
