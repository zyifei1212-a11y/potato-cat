import { describe, expect, it } from "vitest";
import { APP_RUNTIME_NAMESPACES } from "../config/runtimeNamespace";
import { localDateKey } from "../domain/stats";
import type { FocusSession, Todo } from "../domain/types";
import { STORAGE_KEY, useAppStore } from "./useAppStore";

const expiredTimer = (runId: string) => ({
  runId,
  mode: "focus" as const,
  status: "running" as const,
  durationSeconds: 1500,
  remainingSeconds: 1500,
  startedAt: new Date(Date.now() - 1_500_000).toISOString(),
  endAt: Date.now() - 1,
  completedFocusCount: 0,
});

describe("app store rewards and settlement", () => {
  it("persists development changes without touching production storage", () => {
    useAppStore.getState().addTodo({
      title: "开发版隔离验证",
      priority: "importantNotUrgent",
      scheduleType: "ordinary",
      estimatedPomodoros: 1,
    });

    const productionValue = localStorage.getItem(
      APP_RUNTIME_NAMESPACES.production.storageKey,
    );
    const developmentValue = localStorage.getItem(
      APP_RUNTIME_NAMESPACES.development.storageKey,
    );

    expect(productionValue).toBeNull();
    expect(developmentValue).not.toBeNull();
    expect(JSON.parse(developmentValue!).state.todos).toMatchObject([
      { title: "开发版隔离验证" },
    ]);
  });

  it("settles one run only once", () => {
    useAppStore.setState({ timer: expiredTimer("run-idempotent") });
    useAppStore.getState().completeCurrentTimer();
    useAppStore.getState().completeCurrentTimer();

    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.reward.coins).toBe(0.5);
    expect(state.reward.transactions).toHaveLength(1);
  });

  it("rewards a todo only on its first completion", () => {
    const todo: Todo = {
      id: "todo-1",
      title: "测试待办",
      priority: "importantNotUrgent",
      scheduleType: "ordinary",
      scheduledDate: localDateKey(),
      estimatedPomodoros: 1,
      completedPomodoros: 0,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    useAppStore.setState({ todos: [todo] });

    useAppStore.getState().toggleTodo(todo.id);
    useAppStore.getState().toggleTodo(todo.id);
    useAppStore.getState().toggleTodo(todo.id);

    expect(useAppStore.getState().reward.coins).toBe(1);
    expect(useAppStore.getState().reward.transactions).toHaveLength(1);
  });

  it("keeps a no-pomodoro todo out of timer binding while preserving its completion reward", () => {
    useAppStore.getState().addTodo({
      title: "直接完成的小事",
      priority: "notImportantNotUrgent",
      scheduleType: "ordinary",
      estimatedPomodoros: 1,
      requiresPomodoro: false,
    });

    const todo = useAppStore.getState().todos[0];
    expect(todo.requiresPomodoro).toBe(false);
    useAppStore.getState().selectTodo(todo.id);
    expect(useAppStore.getState().timer.selectedTodoId).toBeUndefined();

    useAppStore.getState().toggleTodo(todo.id);
    expect(useAppStore.getState().reward.coins).toBe(1);
  });

  it("grants the daily-four bonus exactly once", () => {
    const now = new Date();
    const previous: FocusSession[] = [1, 2, 3].map((index) => ({
      id: `session-${index}`,
      runId: `old-${index}`,
      startedAt: now.toISOString(),
      endedAt: now.toISOString(),
      plannedDurationMinutes: 25,
      actualDurationMinutes: 25,
      status: "completed",
      rewardCoins: 0.5,
    }));
    useAppStore.setState({ sessions: previous, timer: expiredTimer("run-four") });
    useAppStore.getState().completeCurrentTimer();

    const state = useAppStore.getState();
    expect(state.reward.coins).toBe(1.5);
    expect(state.reward.dailyBonusClaimedDate).toBe(localDateKey());
    expect(state.reward.transactions.map((item) => item.sourceKey)).toContain(
      `daily4:${localDateKey()}`,
    );
  });

  it("continues the break timer from the fullscreen reminder countdown", () => {
    const current = useAppStore.getState();
    useAppStore.setState({
      settings: { ...current.settings, shortBreakMinutes: 5, longBreakInterval: 4 },
      timer: {
        ...expiredTimer("run-break-sync"),
        status: "completed",
        remainingSeconds: 0,
        completedFocusCount: 1,
      },
      pendingBreakReminder: true,
    });

    const before = Date.now();
    useAppStore.getState().beginSuggestedBreak(173);
    const state = useAppStore.getState();

    expect(state.timer.mode).toBe("shortBreak");
    expect(state.timer.status).toBe("running");
    expect(state.timer.remainingSeconds).toBe(173);
    expect(state.timer.endAt).toBeGreaterThanOrEqual(before + 173_000);
    expect(state.pendingBreakReminder).toBe(false);
  });

  it("creates a recurring plan and today's independent occurrence", () => {
    const today = localDateKey();
    useAppStore.getState().addTodo({
      title: "每日复盘",
      priority: "importantNotUrgent",
      scheduleType: "recurring",
      estimatedPomodoros: 1,
      startDate: today,
      recurrence: { frequency: "daily" },
    });
    const state = useAppStore.getState();
    expect(state.todoPlans).toHaveLength(1);
    expect(state.todos).toHaveLength(1);
    expect(state.todos[0]).toMatchObject({ title: "每日复盘", scheduledDate: today });
  });

  it("propagates the no-pomodoro choice from a recurring plan to its occurrence", () => {
    const today = localDateKey();
    useAppStore.getState().addTodo({
      title: "每日喝水",
      priority: "notImportantNotUrgent",
      scheduleType: "recurring",
      estimatedPomodoros: 1,
      requiresPomodoro: false,
      startDate: today,
      recurrence: { frequency: "daily" },
    });

    const state = useAppStore.getState();
    expect(state.todoPlans[0].requiresPomodoro).toBe(false);
    expect(state.todos[0].requiresPomodoro).toBe(false);
  });

  it("drops version-one todos while preserving other settings", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      state: {
        todos: [{ id: "legacy", title: "旧待办", category: "工作" }],
        settings: { catName: "煤球" },
      },
    }));
    await useAppStore.persist.rehydrate();
    const state = useAppStore.getState();
    expect(state.todos).toEqual([]);
    expect(state.todoPlans).toEqual([]);
    expect(state.settings.catName).toBe("煤球");
  });
});
