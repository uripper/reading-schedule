const fs = require("fs");
const path = require("path");

const FILE_NAME = "planner_state.json";

function statePath(userDataDir) {
  return path.join(userDataDir, FILE_NAME);
}

function readState(userDataDir) {
  try {
    const text = fs.readFileSync(statePath(userDataDir), "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function writeState(userDataDir, data) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(statePath(userDataDir), JSON.stringify(data, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

module.exports = { readState, writeState };
