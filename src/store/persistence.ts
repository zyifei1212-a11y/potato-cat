import { DEFAULT_REWARD, DEFAULT_SETTINGS, DEFAULT_TIMER } from "../config/defaults";
import type {
  AppSettings,
  FocusSession,
  RewardState,
  TimerSnapshot,
  Todo,
  TodoPlan,
} from "../domain/types";

export const PERSISTENCE_VERSION = 2;

export interface PersistedAppState {
  todos: Todo[];
  todoPlans: TodoPlan[];
  sessions: FocusSession[];
  reward: RewardState;
  settings: AppSettings;
  timer: TimerSnapshot;
  pendingBreakReminder: boolean;
  snoozedUntil?: number;
}

export const migratePersistedAppState = (
  persisted: unknown,
  version: number,
): PersistedAppState => {
  const saved = (persisted ?? {}) as Partial<PersistedAppState>;
  if (version < 2) {
    return {
      ...saved,
      todos: [],
      todoPlans: [],
      timer: {
        ...DEFAULT_TIMER,
        ...(saved.timer ?? {}),
        selectedTodoId: undefined,
      },
    } as PersistedAppState;
  }
  return saved as PersistedAppState;
};

export const mergePersistedAppState = <T extends PersistedAppState>(
  persisted: unknown,
  current: T,
): T => {
  const saved = (persisted ?? {}) as Partial<PersistedAppState>;
  return {
    ...current,
    ...saved,
    settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
    reward: {
      ...DEFAULT_REWARD,
      ...(saved.reward ?? {}),
      transactions: saved.reward?.transactions ?? [],
    },
    todos: Array.isArray(saved.todos) ? saved.todos : [],
    todoPlans: Array.isArray(saved.todoPlans) ? saved.todoPlans : [],
    sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
    timer: { ...DEFAULT_TIMER, ...(saved.timer ?? {}) },
  } as T;
};
