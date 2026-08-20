import { describe, expect, it } from "vitest";
import { calculateTodayStats } from "./stats";
import type { FocusSession, RewardTransaction, Todo } from "./types";

describe("today stats", () => {
  it("derives statistics from source records", () => {
    const now = new Date("2026-08-05T12:00:00");
    const sessions: FocusSession[] = [
      {
        id: "1", runId: "1", startedAt: now.toISOString(), endedAt: now.toISOString(),
        plannedDurationMinutes: 25, actualDurationMinutes: 25, status: "completed", rewardCoins: .5,
      },
      {
        id: "2", runId: "2", startedAt: now.toISOString(), endedAt: now.toISOString(),
        plannedDurationMinutes: 25, actualDurationMinutes: 7, status: "abandoned", rewardCoins: 0,
      },
    ];
    const todos: Todo[] = [{
      id: "t", title: "完成", priority: "importantNotUrgent", scheduleType: "ordinary",
      scheduledDate: "2026-08-05", estimatedPomodoros: 1,
      completedPomodoros: 1, isCompleted: true, createdAt: now.toISOString(), completedAt: now.toISOString(),
    }];
    const transactions: RewardTransaction[] = [{
      id: "r", sourceKey: "focus:1", type: "focus_completed", amount: .5, createdAt: now.toISOString(),
    }];
    expect(calculateTodayStats(sessions, todos, transactions, now)).toEqual({
      focusMinutes: 25,
      completedPomodoros: 1,
      completedTodos: 1,
      abandonedSessions: 1,
      earnedCoins: .5,
    });
  });
});
