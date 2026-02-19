

export function createSessionRefs() {
  return {
    input: document.getElementById("sessionBookInput"),
    results: document.getElementById("sessionBookResults"),
    meta: document.getElementById("sessionBookMeta"),
    timerDisplay: document.getElementById("sessionTimerDisplay"),
    startBtn: document.getElementById("sessionStartBtn"),
    pauseBtn: document.getElementById("sessionPauseBtn"),
    stopBtn: document.getElementById("sessionStopBtn"),
    history: document.getElementById("sessionHistory"),
    manualMinutes: document.getElementById("manualMinutesInput"),
    manualPages: document.getElementById("manualPagesInput"),
    manualNotes: document.getElementById("manualNotesInput"),
    manualSaveBtn: document.getElementById("manualSessionBtn"),
  };
}
