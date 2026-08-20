import { beforeEach } from "vitest";
import { DEFAULT_REWARD, DEFAULT_SETTINGS, DEFAULT_TIMER } from "../config/defaults";
import { useAppStore } from "../store/useAppStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({
    todos: [],
    todoPlans: [],
    sessions: [],
    reward: { ...DEFAULT_REWARD, transactions: [] },
    settings: { ...DEFAULT_SETTINGS },
    timer: { ...DEFAULT_TIMER },
    pendingBreakReminder: false,
    snoozedUntil: undefined,
  });
});
