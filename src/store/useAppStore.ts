import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_REWARD, DEFAULT_SETTINGS, DEFAULT_TIMER } from "../config/defaults";
import { STORAGE_KEY } from "../config/runtimeNamespace";
import { createIdleTimer, durationForMode, getRemainingSeconds } from "../domain/timer";
import { localDateKey } from "../domain/stats";
import { reconcileTodos } from "../domain/todo";
import type {
  AppSettings,
  FocusSession,
  RewardState,
  RewardTransaction,
  TimerSnapshot,
  Todo,
  TodoPlan,
  TodoPriority,
  TodoRecurrence,
  TodoScheduleType,
} from "../domain/types";
import { createId } from "../services/id";
import {
  mergePersistedAppState,
  migratePersistedAppState,
  PERSISTENCE_VERSION,
  type PersistedAppState,
} from "./persistence";

export { STORAGE_KEY } from "../config/runtimeNamespace";
export type { PersistedAppState } from "./persistence";

export interface TodoInput {
  title: string;
  priority: TodoPriority;
  scheduleType: TodoScheduleType;
  estimatedPomodoros: number;
  scheduledDate?: string;
  startDate?: string;
  endDate?: string;
  recurrence?: TodoRecurrence;
}

interface AppActions {
  addTodo: (input: TodoInput) => void;
  updateTodo: (id: string, input: TodoInput) => void;
  updateTodoPlan: (id: string, input: TodoInput) => void;
  deleteTodo: (id: string) => void;
  deleteTodoPlan: (id: string) => void;
  toggleTodo: (id: string) => void;
  refreshTodos: (now?: Date | number) => void;
  selectTodo: (id?: string) => void;
  startOrResumeTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  abandonTimer: () => void;
  completeCurrentTimer: (now?: number) => void;
  beginSuggestedBreak: (remainingSeconds?: number) => void;
  skipBreak: () => void;
  snoozeBreakReminder: (minutes?: number) => void;
  dismissBreakReminder: () => void;
  checkSnoozedReminder: (now?: number) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  replacePersistedState: (state: PersistedAppState) => void;
}

export type AppStore = PersistedAppState & AppActions;

const initialState: PersistedAppState = {
  todos: [],
  todoPlans: [],
  sessions: [],
  reward: DEFAULT_REWARD,
  settings: DEFAULT_SETTINGS,
  timer: DEFAULT_TIMER,
  pendingBreakReminder: false,
};

const clampPomodoros = (value: number) =>
  Math.min(20, Math.max(1, Math.round(value || 1)));

const hasRewardSource = (reward: RewardState, sourceKey: string) =>
  reward.transactions.some((transaction) => transaction.sourceKey === sourceKey);

const withReward = (
  reward: RewardState,
  transaction: Omit<RewardTransaction, "id" | "createdAt">,
  nowIso: string,
): RewardState => {
  if (hasRewardSource(reward, transaction.sourceKey)) return reward;
  const item: RewardTransaction = {
    ...transaction,
    id: createId("reward"),
    createdAt: nowIso,
  };
  return {
    ...reward,
    coins: Number((reward.coins + item.amount).toFixed(1)),
    transactions: [...reward.transactions, item],
  };
};

const startTimerSnapshot = (timer: TimerSnapshot, now: number): TimerSnapshot => {
  const remaining = getRemainingSeconds(timer, now);
  const isNewRun = timer.status === "idle" || timer.status === "completed" || !timer.runId;
  return {
    ...timer,
    runId: isNewRun ? createId("run") : timer.runId,
    status: "running",
    remainingSeconds: remaining,
    startedAt: isNewRun ? new Date(now).toISOString() : timer.startedAt,
    endAt: now + remaining * 1000,
  };
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTodo: (input) => {
        const title = input.title.trim();
        if (!title) return;
        const now = new Date();
        const nowIso = now.toISOString();
        const today = localDateKey(now);
        const safeTitle = title.slice(0, 80);
        const estimatedPomodoros = clampPomodoros(input.estimatedPomodoros);

        set((state) => {
          if (input.scheduleType === "recurring" || input.scheduleType === "dateRange") {
            const startDate = input.startDate || today;
            const plan: TodoPlan = {
              id: createId("plan"),
              title: safeTitle,
              priority: input.priority,
              scheduleType: input.scheduleType,
              estimatedPomodoros,
              startDate,
              endDate:
                input.scheduleType === "dateRange"
                  ? input.endDate && input.endDate >= startDate
                    ? input.endDate
                    : startDate
                  : undefined,
              recurrence: input.scheduleType === "recurring" ? input.recurrence : undefined,
              createdAt: nowIso,
            };
            const reconciled = reconcileTodos(state.todos, [plan, ...state.todoPlans], now);
            return { todos: reconciled.todos, todoPlans: reconciled.plans };
          }

          const todo: Todo = {
            id: createId("todo"),
            title: safeTitle,
            priority: input.priority,
            scheduleType: input.scheduleType,
            scheduledDate:
              input.scheduleType === "scheduled" ? input.scheduledDate || today : today,
            estimatedPomodoros,
            completedPomodoros: 0,
            isCompleted: false,
            createdAt: nowIso,
          };
          return { todos: [todo, ...state.todos] };
        });
      },

      updateTodo: (id, input) => {
        const title = input.title.trim();
        if (!title) return;
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? {
                  ...todo,
                  title: title.slice(0, 80),
                  priority: input.priority,
                  scheduleType:
                    input.scheduleType === "scheduled" ? "scheduled" : "ordinary",
                  scheduledDate:
                    input.scheduleType === "scheduled"
                      ? input.scheduledDate || todo.scheduledDate
                      : todo.scheduledDate,
                  estimatedPomodoros: clampPomodoros(input.estimatedPomodoros),
                }
              : todo,
          ),
        }));
      },

      updateTodoPlan: (id, input) => {
        const title = input.title.trim();
        if (!title) return;
        const now = new Date();
        const today = localDateKey(now);
        set((state) => {
          const current = state.todoPlans.find((plan) => plan.id === id);
          if (!current) return state;
          const startDate = input.startDate || current.startDate || today;
          const scheduleType =
            input.scheduleType === "dateRange" ? "dateRange" : "recurring";
          const nextPlan: TodoPlan = {
            ...current,
            title: title.slice(0, 80),
            priority: input.priority,
            scheduleType,
            estimatedPomodoros: clampPomodoros(input.estimatedPomodoros),
            startDate,
            endDate:
              scheduleType === "dateRange"
                ? input.endDate && input.endDate >= startDate
                  ? input.endDate
                  : startDate
                : undefined,
            recurrence: scheduleType === "recurring" ? input.recurrence : undefined,
          };
          const plans = state.todoPlans.map((plan) => plan.id === id ? nextPlan : plan);
          const todos = state.todos.map((todo) =>
            todo.planId === id && !todo.isCompleted
              ? {
                  ...todo,
                  title: nextPlan.title,
                  priority: nextPlan.priority,
                  scheduleType: nextPlan.scheduleType,
                  estimatedPomodoros: nextPlan.estimatedPomodoros,
                }
              : todo,
          );
          const reconciled = reconcileTodos(todos, plans, now);
          return { todos: reconciled.todos, todoPlans: reconciled.plans };
        });
      },

      deleteTodo: (id) => {
        set((state) => {
          const target = state.todos.find((item) => item.id === id);
          if (!target) return state;
          const selected = state.todos.find((item) => item.id === state.timer.selectedTodoId);
          const removesSelected =
            state.timer.selectedTodoId === id ||
            Boolean(target.planId && selected?.planId === target.planId);
          return {
            todos: target.planId
              ? state.todos.filter((todo) => todo.planId !== target.planId)
              : state.todos.filter((todo) => todo.id !== id),
            todoPlans: target.planId
              ? state.todoPlans.filter((plan) => plan.id !== target.planId)
              : state.todoPlans,
            timer: removesSelected
              ? { ...state.timer, selectedTodoId: undefined }
              : state.timer,
          };
        });
      },

      deleteTodoPlan: (id) => {
        set((state) => ({
          todoPlans: state.todoPlans.filter((plan) => plan.id !== id),
          todos: state.todos.filter((todo) => todo.planId !== id),
          timer:
            state.todos.find((todo) => todo.id === state.timer.selectedTodoId)?.planId === id
              ? { ...state.timer, selectedTodoId: undefined }
              : state.timer,
        }));
      },

      toggleTodo: (id) => {
        const nowIso = new Date().toISOString();
        set((state) => {
          const current = state.todos.find((todo) => todo.id === id);
          if (!current) return state;

          const completing = !current.isCompleted;
          let reward = state.reward;
          let completionRewardedAt = current.completionRewardedAt;
          if (completing && !completionRewardedAt) {
            reward = withReward(
              reward,
              { sourceKey: `todo:${id}`, type: "todo_completed", amount: 1 },
              nowIso,
            );
            completionRewardedAt = nowIso;
          }

          return {
            todos: state.todos.map((todo) =>
              todo.id === id
                ? {
                    ...todo,
                    isCompleted: completing,
                    completedAt: completing ? nowIso : undefined,
                    completionRewardedAt,
                  }
                : todo,
            ),
            reward,
          };
        });
      },

      refreshTodos: (now = new Date()) => {
        set((state) => {
          const reconciled = reconcileTodos(state.todos, state.todoPlans, now);
          if (!reconciled.changed) return state;
          const selected = state.timer.selectedTodoId
            ? reconciled.todos.find((todo) => todo.id === state.timer.selectedTodoId)
            : undefined;
          return {
            todos: reconciled.todos,
            todoPlans: reconciled.plans,
            timer:
              state.timer.selectedTodoId && (!selected || selected.archivedAt)
                ? { ...state.timer, selectedTodoId: undefined }
                : state.timer,
          };
        });
      },

      selectTodo: (id) => {
        set((state) => ({ timer: { ...state.timer, selectedTodoId: id } }));
      },

      startOrResumeTimer: () => {
        const now = Date.now();
        set((state) => {
          if (state.timer.status === "running") return state;
          let timer = state.timer;
          if (timer.status === "completed") {
            timer = createIdleTimer(
              "focus",
              state.settings,
              timer.completedFocusCount,
              timer.selectedTodoId,
            );
          }
          return {
            timer: startTimerSnapshot(timer, now),
            pendingBreakReminder: false,
            snoozedUntil: undefined,
          };
        });
      },

      pauseTimer: () => {
        const now = Date.now();
        set((state) => {
          if (state.timer.status !== "running") return state;
          return {
            timer: {
              ...state.timer,
              status: "paused",
              remainingSeconds: getRemainingSeconds(state.timer, now),
              endAt: undefined,
            },
          };
        });
      },

      resetTimer: () => {
        set((state) => ({
          timer: createIdleTimer(
            state.timer.mode,
            state.settings,
            state.timer.completedFocusCount,
            state.timer.selectedTodoId,
          ),
          pendingBreakReminder: false,
        }));
      },

      abandonTimer: () => {
        const state = get();
        if (state.timer.mode !== "focus" || !state.timer.runId || state.timer.status === "idle") {
          return;
        }
        const now = Date.now();
        const remaining = getRemainingSeconds(state.timer, now);
        const todo = state.todos.find((item) => item.id === state.timer.selectedTodoId);
        const session: FocusSession = {
          id: createId("session"),
          runId: state.timer.runId,
          todoId: todo?.id,
          todoTitle: todo?.title,
          startedAt: state.timer.startedAt ?? new Date(now).toISOString(),
          endedAt: new Date(now).toISOString(),
          plannedDurationMinutes: state.timer.durationSeconds / 60,
          actualDurationMinutes: Math.max(
            0,
            Math.round(((state.timer.durationSeconds - remaining) / 60) * 10) / 10,
          ),
          status: "abandoned",
          rewardCoins: 0,
        };
        set({
          sessions: [...state.sessions, session],
          timer: createIdleTimer(
            "focus",
            state.settings,
            state.timer.completedFocusCount,
            state.timer.selectedTodoId,
          ),
          pendingBreakReminder: false,
        });
      },

      completeCurrentTimer: (now = Date.now()) => {
        const state = get();
        const timer = state.timer;
        if (timer.status !== "running" || getRemainingSeconds(timer, now) > 0) return;

        if (timer.mode !== "focus") {
          set({
            timer: createIdleTimer(
              "focus",
              state.settings,
              timer.completedFocusCount,
              timer.selectedTodoId,
            ),
            pendingBreakReminder: false,
          });
          return;
        }

        if (!timer.runId || state.sessions.some((session) => session.runId === timer.runId)) return;

        const nowIso = new Date(now).toISOString();
        const todo = state.todos.find((item) => item.id === timer.selectedTodoId);
        const session: FocusSession = {
          id: createId("session"),
          runId: timer.runId,
          todoId: todo?.id,
          todoTitle: todo?.title,
          startedAt: timer.startedAt ?? new Date(now - timer.durationSeconds * 1000).toISOString(),
          endedAt: nowIso,
          plannedDurationMinutes: timer.durationSeconds / 60,
          actualDurationMinutes: timer.durationSeconds / 60,
          status: "completed",
          rewardCoins: 0.5,
        };

        let reward = withReward(
          state.reward,
          { sourceKey: `focus:${timer.runId}`, type: "focus_completed", amount: 0.5 },
          nowIso,
        );
        const today = localDateKey(now);
        const completedToday = [...state.sessions, session].filter(
          (item) =>
            item.status === "completed" &&
            item.endedAt !== undefined &&
            localDateKey(item.endedAt) === today,
        ).length;
        if (completedToday >= 4 && reward.dailyBonusClaimedDate !== today) {
          reward = withReward(
            reward,
            { sourceKey: `daily4:${today}`, type: "daily_four_bonus", amount: 1 },
            nowIso,
          );
          reward = { ...reward, dailyBonusClaimedDate: today };
        }

        set({
          sessions: [...state.sessions, session],
          todos: state.todos.map((item) =>
            item.id === timer.selectedTodoId
              ? { ...item, completedPomodoros: item.completedPomodoros + 1 }
              : item,
          ),
          reward,
          timer: {
            ...timer,
            status: "completed",
            remainingSeconds: 0,
            endAt: undefined,
            completedFocusCount: timer.completedFocusCount + 1,
          },
          pendingBreakReminder: true,
        });
      },

      beginSuggestedBreak: (remainingSeconds) => {
        const now = Date.now();
        set((state) => {
          const isLong =
            state.timer.completedFocusCount > 0 &&
            state.timer.completedFocusCount % state.settings.longBreakInterval === 0;
          const mode = isLong ? "longBreak" : "shortBreak";
          const idle = createIdleTimer(
            mode,
            state.settings,
            state.timer.completedFocusCount,
            state.timer.selectedTodoId,
          );
          const synchronizedRemaining = remainingSeconds === undefined
            ? idle.remainingSeconds
            : Math.min(
                idle.durationSeconds,
                Math.max(1, Math.ceil(remainingSeconds)),
              );
          return {
            timer: startTimerSnapshot(
              { ...idle, remainingSeconds: synchronizedRemaining },
              now,
            ),
            pendingBreakReminder: false,
            snoozedUntil: undefined,
          };
        });
      },

      skipBreak: () => {
        set((state) => ({
          timer: createIdleTimer(
            "focus",
            state.settings,
            state.timer.completedFocusCount,
            state.timer.selectedTodoId,
          ),
          pendingBreakReminder: false,
          snoozedUntil: undefined,
        }));
      },

      snoozeBreakReminder: (minutes = 5) => {
        set((state) => ({
          timer: createIdleTimer(
            "focus",
            state.settings,
            state.timer.completedFocusCount,
            state.timer.selectedTodoId,
          ),
          pendingBreakReminder: false,
          snoozedUntil: Date.now() + minutes * 60 * 1000,
        }));
      },

      dismissBreakReminder: () => set({ pendingBreakReminder: false }),

      checkSnoozedReminder: (now = Date.now()) => {
        const state = get();
        if (
          state.snoozedUntil &&
          state.snoozedUntil <= now &&
          state.timer.status !== "running"
        ) {
          set({ pendingBreakReminder: true, snoozedUntil: undefined });
        }
      },

      updateSettings: (patch) => {
        set((state) => {
          const settings = { ...state.settings, ...patch };
          const timer =
            state.timer.status === "idle"
              ? {
                  ...state.timer,
                  durationSeconds: durationForMode(state.timer.mode, settings),
                  remainingSeconds: durationForMode(state.timer.mode, settings),
                }
              : state.timer;
          return { settings, timer };
        });
      },

      replacePersistedState: (remote) => set({ ...remote, todoPlans: remote.todoPlans ?? [] }),
    }),
    {
      name: STORAGE_KEY,
      version: PERSISTENCE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        todos: state.todos,
        todoPlans: state.todoPlans,
        sessions: state.sessions,
        reward: state.reward,
        settings: state.settings,
        timer: state.timer,
        pendingBreakReminder: state.pendingBreakReminder,
        snoozedUntil: state.snoozedUntil,
      }),
      migrate: migratePersistedAppState,
      merge: mergePersistedAppState,
    },
  ),
);

export const selectPersistedState = (state: AppStore): PersistedAppState => ({
  todos: state.todos,
  todoPlans: state.todoPlans,
  sessions: state.sessions,
  reward: state.reward,
  settings: state.settings,
  timer: state.timer,
  pendingBreakReminder: state.pendingBreakReminder,
  snoozedUntil: state.snoozedUntil,
});
