import type { FocusSession, RewardTransaction, TodayStats, Todo } from "./types";

export const localDateKey = (value: string | number | Date = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateTodayStats = (
  sessions: FocusSession[],
  todos: Todo[],
  transactions: RewardTransaction[],
  now = new Date(),
): TodayStats => {
  const today = localDateKey(now);
  const todaySessions = sessions.filter(
    (session) => session.endedAt && localDateKey(session.endedAt) === today,
  );
  const completed = todaySessions.filter((session) => session.status === "completed");

  return {
    focusMinutes: Math.round(
      completed.reduce((sum, session) => sum + session.actualDurationMinutes, 0),
    ),
    completedPomodoros: completed.length,
    completedTodos: todos.filter(
      (todo) => todo.completedAt && localDateKey(todo.completedAt) === today,
    ).length,
    abandonedSessions: todaySessions.filter((session) => session.status === "abandoned").length,
    earnedCoins: transactions
      .filter(
        (transaction) =>
          transaction.amount > 0 && localDateKey(transaction.createdAt) === today,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  };
};
