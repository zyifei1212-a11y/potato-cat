import { localDateKey } from "./stats";
import type { Todo, TodoPlan, TodoPriority } from "./types";

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const addLocalDays = (key: string, amount: number) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
};

const daysInMonth = (key: string) => {
  const date = parseDateKey(key);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const PRIORITY_ORDER: Record<TodoPriority, number> = {
  importantUrgent: 0,
  importantNotUrgent: 1,
  urgentNotImportant: 2,
  notImportantNotUrgent: 3,
};

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  importantUrgent: "重要且紧急",
  importantNotUrgent: "重要不紧急",
  urgentNotImportant: "紧急不重要",
  notImportantNotUrgent: "不重要不紧急",
};

export const occursOnDate = (plan: TodoPlan, dateKey: string) => {
  if (dateKey < plan.startDate || plan.archivedAt) return false;
  if (plan.scheduleType === "dateRange") {
    return Boolean(plan.endDate && dateKey <= plan.endDate);
  }
  const recurrence = plan.recurrence;
  if (!recurrence) return false;
  if (recurrence.frequency === "daily") return true;
  const date = parseDateKey(dateKey);
  if (recurrence.frequency === "weekly") {
    return (recurrence.weekdays ?? []).includes(date.getDay());
  }
  const targetDay = Math.min(recurrence.monthDay ?? 1, daysInMonth(dateKey));
  return date.getDate() === targetDay;
};

export const occurrenceId = (planId: string, dateKey: string) =>
  `occurrence-${planId}-${dateKey}`;

const makeOccurrence = (plan: TodoPlan, dateKey: string, nowIso: string): Todo => ({
  id: occurrenceId(plan.id, dateKey),
  planId: plan.id,
  title: plan.title,
  priority: plan.priority,
  scheduleType: plan.scheduleType,
  scheduledDate: dateKey,
  estimatedPomodoros: plan.estimatedPomodoros,
  completedPomodoros: 0,
  isCompleted: false,
  createdAt: nowIso,
});

export interface ReconciledTodos {
  todos: Todo[];
  plans: TodoPlan[];
  changed: boolean;
}

export const reconcileTodos = (
  todos: Todo[],
  plans: TodoPlan[],
  now: Date | number = new Date(),
): ReconciledTodos => {
  const nowDate = now instanceof Date ? now : new Date(now);
  const today = localDateKey(nowDate);
  const nowIso = nowDate.toISOString();
  let changed = false;
  let nextPlans = plans.map((plan) => ({ ...plan }));

  nextPlans = nextPlans.map((plan) => {
    if (
      plan.scheduleType === "dateRange" &&
      plan.endDate &&
      today > plan.endDate &&
      !plan.archivedAt
    ) {
      changed = true;
      return { ...plan, archivedAt: nowIso };
    }
    return plan;
  });

  const planById = new Map(nextPlans.map((plan) => [plan.id, plan]));
  let nextTodos = todos.map((todo) => {
    if (todo.archivedAt) return todo;
    const completionDay = todo.completedAt ? localDateKey(todo.completedAt) : undefined;
    const plan = todo.planId ? planById.get(todo.planId) : undefined;
    const rangeExpired = plan?.scheduleType === "dateRange" && Boolean(plan.archivedAt);
    const oldRangeCheckIn =
      plan?.scheduleType === "dateRange" && !todo.isCompleted && todo.scheduledDate < today;
    if ((todo.isCompleted && completionDay && completionDay < today) || oldRangeCheckIn || rangeExpired) {
      changed = true;
      return { ...todo, archivedAt: nowIso };
    }
    return todo;
  });

  const existingIds = new Set(nextTodos.map((todo) => todo.id));
  nextPlans = nextPlans.map((plan) => {
    if (plan.archivedAt || today < plan.startDate) return plan;

    if (plan.scheduleType === "dateRange") {
      if (!plan.endDate || today > plan.endDate) return plan;
      const id = occurrenceId(plan.id, today);
      if (!existingIds.has(id)) {
        nextTodos = [makeOccurrence(plan, today, nowIso), ...nextTodos];
        existingIds.add(id);
        changed = true;
      }
      if (plan.lastGeneratedDate !== today) {
        changed = true;
        return { ...plan, lastGeneratedDate: today };
      }
      return plan;
    }

    const firstDate = plan.lastGeneratedDate
      ? addLocalDays(plan.lastGeneratedDate, 1)
      : plan.startDate;
    let cursor = firstDate;
    let generatedThrough = plan.lastGeneratedDate;
    while (cursor <= today) {
      if (occursOnDate(plan, cursor)) {
        const id = occurrenceId(plan.id, cursor);
        if (!existingIds.has(id)) {
          nextTodos = [makeOccurrence(plan, cursor, nowIso), ...nextTodos];
          existingIds.add(id);
          changed = true;
        }
      }
      generatedThrough = cursor;
      cursor = addLocalDays(cursor, 1);
    }
    if (generatedThrough && generatedThrough !== plan.lastGeneratedDate) {
      changed = true;
      return { ...plan, lastGeneratedDate: generatedThrough };
    }
    return plan;
  });

  return { todos: nextTodos, plans: nextPlans, changed };
};

export const isTodoOverdue = (todo: Todo, today = localDateKey()) =>
  !todo.isCompleted && !todo.archivedAt && todo.scheduledDate < today;

export const isTodoVisibleToday = (todo: Todo, today = localDateKey()) =>
  !todo.archivedAt && todo.scheduledDate <= today;

export const formatShortDate = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export const countPlanCompletions = (planId: string, todos: Todo[]) =>
  todos.filter((todo) => todo.planId === planId && todo.isCompleted).length;

export const describeRecurrence = (plan: TodoPlan) => {
  if (plan.scheduleType === "dateRange") {
    return `${formatShortDate(plan.startDate)}–${formatShortDate(plan.endDate ?? plan.startDate)}`;
  }
  if (plan.recurrence?.frequency === "daily") return "每天";
  if (plan.recurrence?.frequency === "monthly") {
    return `每月 ${plan.recurrence.monthDay ?? 1} 日`;
  }
  const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const days = (plan.recurrence?.weekdays ?? []).map((day) => weekdayNames[day]).join("、");
  return `每周 ${days}`;
};
