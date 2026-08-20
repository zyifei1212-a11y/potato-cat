import type { AppSettings, TimerMode, TimerSnapshot } from "./types";

export const durationForMode = (mode: TimerMode, settings: AppSettings) => {
  const minutes =
    mode === "focus"
      ? settings.focusMinutes
      : mode === "shortBreak"
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return Math.max(1, Math.round(minutes * 60));
};

export const getRemainingSeconds = (timer: TimerSnapshot, now = Date.now()) => {
  if (timer.status !== "running" || timer.endAt === undefined) {
    return Math.max(0, timer.remainingSeconds);
  }
  return Math.max(0, Math.ceil((timer.endAt - now) / 1000));
};

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

export const modeLabel = (mode: TimerMode) => {
  if (mode === "focus") return "专注时间";
  if (mode === "shortBreak") return "短休息";
  return "长休息";
};

export const createIdleTimer = (
  mode: TimerMode,
  settings: AppSettings,
  completedFocusCount = 0,
  selectedTodoId?: string,
): TimerSnapshot => {
  const durationSeconds = durationForMode(mode, settings);
  return {
    mode,
    status: "idle",
    durationSeconds,
    remainingSeconds: durationSeconds,
    selectedTodoId,
    completedFocusCount,
  };
};
