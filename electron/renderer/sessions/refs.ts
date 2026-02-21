import { el } from "../dom.js";

export type SessionRefs = {
  input: HTMLInputElement;
  results: HTMLElement;
  meta: HTMLElement;
  timerDisplay: HTMLElement;
  startBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  history: HTMLElement;
  manualMinutes: HTMLInputElement;
  manualPages: HTMLInputElement;
  manualNotes: HTMLTextAreaElement;
  manualSaveBtn: HTMLButtonElement;
};

export function createSessionRefs(): SessionRefs {
  return {
    input: el<HTMLInputElement>("sessionBookInput"),
    results: el("sessionBookResults"),
    meta: el("sessionBookMeta"),
    timerDisplay: el("sessionTimerDisplay"),
    startBtn: el<HTMLButtonElement>("sessionStartBtn"),
    pauseBtn: el<HTMLButtonElement>("sessionPauseBtn"),
    stopBtn: el<HTMLButtonElement>("sessionStopBtn"),
    history: el("sessionHistory"),
    manualMinutes: el<HTMLInputElement>("manualMinutesInput"),
    manualPages: el<HTMLInputElement>("manualPagesInput"),
    manualNotes: el<HTMLTextAreaElement>("manualNotesInput"),
    manualSaveBtn: el<HTMLButtonElement>("manualSessionBtn"),
  };
}
