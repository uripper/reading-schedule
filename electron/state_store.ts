import fs from 'node:fs';
import path from 'node:path';

const FILE_NAME = 'planner_state.json';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type SaveResult = { ok: true } | { ok: false; error: string };

function statePath(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

export function readState(userDataDir: string): JsonValue | null {
  try {
    const text = fs.readFileSync(statePath(userDataDir), 'utf8');
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

export function writeState(userDataDir: string, data: JsonValue): SaveResult {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(statePath(userDataDir), JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (error) {
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    return { ok: false, error: message };
  }
}
