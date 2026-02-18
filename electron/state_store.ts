import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "planner_state.json";

function statePath(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

function readState(userDataDir: string): any {
  try {
    const text = fs.readFileSync(statePath(userDataDir), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function writeState(userDataDir: string, data: unknown): { ok: true } | { ok: false; error: string } {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(statePath(userDataDir), JSON.stringify(data, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String((error as Error).message || error) };
  }
}

export { readState, writeState };
