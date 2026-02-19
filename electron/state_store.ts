import fs from 'node:fs';
import path from 'node:path';

const FILE_NAME = 'planner_state.json';

type SaveResult = { ok: true } | { ok: false; error: string };

function statePath(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

export function readState(userDataDir: string): unknown | null {
  try {
    const text = fs.readFileSync(statePath(userDataDir), 'utf8');
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function writeState(userDataDir: string, data: unknown): SaveResult {
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
