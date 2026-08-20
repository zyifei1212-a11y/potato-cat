import { describe, expect, it } from "vitest";
import { countPlanCompletions, isTodoOverdue, occurrenceId, reconcileTodos } from "./todo";
import type { TodoPlan } from "./types";

const dailyPlan = (overrides: Partial<TodoPlan> = {}): TodoPlan => ({
  id: "daily-plan",
  title: "每日复盘",
  priority: "importantNotUrgent",
  scheduleType: "recurring",
  estimatedPomodoros: 1,
  startDate: "2026-08-15",
  recurrence: { frequency: "daily" },
  createdAt: "2026-08-15T08:00:00.000Z",
  ...overrides,
});

describe("todo schedule reconciliation", () => {
  it("keeps an overdue recurring occurrence and creates today's same-name occurrence", () => {
    const first = reconcileTodos([], [dailyPlan()], new Date(2026, 7, 16, 12));
    expect(first.todos.map((todo) => todo.scheduledDate).sort()).toEqual(["2026-08-15", "2026-08-16"]);

    const second = reconcileTodos(first.todos, first.plans, new Date(2026, 7, 17, 12));
    expect(second.todos.map((todo) => todo.scheduledDate).sort()).toEqual([
      "2026-08-15", "2026-08-16", "2026-08-17",
    ]);
    expect(isTodoOverdue(second.todos.find((todo) => todo.scheduledDate === "2026-08-16")!, "2026-08-17")).toBe(true);
    expect(new Set(second.todos.map((todo) => todo.id)).size).toBe(3);
  });

  it("archives yesterday's completed item but leaves an incomplete ordinary item overdue", () => {
    const generated = reconcileTodos([], [dailyPlan({ startDate: "2026-08-16" })], new Date(2026, 7, 16, 12));
    const completed = generated.todos.map((todo) => ({
      ...todo,
      isCompleted: true,
      completedAt: "2026-08-16T12:00:00.000Z",
    }));
    const next = reconcileTodos(completed, generated.plans, new Date(2026, 7, 17, 12));
    expect(next.todos.find((todo) => todo.scheduledDate === "2026-08-16")?.archivedAt).toBeTruthy();
    expect(next.todos.find((todo) => todo.scheduledDate === "2026-08-17")?.archivedAt).toBeUndefined();
  });

  it("creates one daily range check-in and archives the plan after its end date", () => {
    const plan = dailyPlan({
      id: "range-plan",
      title: "晨间拉伸",
      scheduleType: "dateRange",
      startDate: "2026-08-16",
      endDate: "2026-08-17",
      recurrence: undefined,
    });
    const first = reconcileTodos([], [plan], new Date(2026, 7, 16, 12));
    const completed = first.todos.map((todo) => ({ ...todo, isCompleted: true, completedAt: "2026-08-16T12:00:00.000Z" }));
    const second = reconcileTodos(completed, first.plans, new Date(2026, 7, 17, 12));
    expect(second.todos.find((todo) => todo.id === occurrenceId(plan.id, "2026-08-17"))).toBeTruthy();
    expect(countPlanCompletions(plan.id, second.todos)).toBe(1);

    const ended = reconcileTodos(second.todos, second.plans, new Date(2026, 7, 18, 12));
    expect(ended.plans[0].archivedAt).toBeTruthy();
    expect(ended.todos.every((todo) => todo.archivedAt)).toBe(true);
  });

  it("uses the last day of shorter months for a monthly day 31 plan", () => {
    const plan = dailyPlan({
      id: "monthly-plan",
      startDate: "2027-01-31",
      recurrence: { frequency: "monthly", monthDay: 31 },
    });
    const result = reconcileTodos([], [plan], new Date(2027, 1, 28, 12));
    expect(result.todos.map((todo) => todo.scheduledDate).sort()).toEqual(["2027-01-31", "2027-02-28"]);
  });
});
