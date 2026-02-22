import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));

function cleanedEnvironment() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function electronBinaryPath() {
  const binary = require("electron");
  if (typeof binary !== "string" || !binary) {
    throw new TypeError("Could not resolve Electron binary path.");
  }
  return binary;
}

function spawnElectron() {
  const child = spawn(electronBinaryPath(), ["."], {
    cwd: ROOT,
    env: cleanedEnvironment(),
    stdio: "inherit",
  });
  child.on("error", (error) => {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = Number(code || 0);
  });
}

spawnElectron();
