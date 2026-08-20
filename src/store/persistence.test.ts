import { describe, expect, it } from "vitest";
import { DEFAULT_REWARD, DEFAULT_SETTINGS, DEFAULT_TIMER } from "../config/defaults";
import {
  mergePersistedAppState,
  migratePersistedAppState,
  type PersistedAppState,
} from "./persistence";

const currentState = (): PersistedAppState => ({
  todos: [],
  todoPlans: [],
  sessions: [],
  reward: { ...DEFAULT_REWARD, transactions: [] },
  settings: { ...DEFAULT_SETTINGS },
  timer: { ...DEFAULT_TIMER },
  pendingBreakReminder: false,
});

describe("persisted app state migrations", () => {
  it("isolates incompatible version-one todos while preserving unrelated data", () => {
    const migrated = migratePersistedAppState({
      todos: [{ id: "legacy-todo" }],
      sessions: [{ id: "kept-session" }],
      reward: { coins: 7 },
      settings: { catName: "煤球" },
      timer: { selectedTodoId: "legacy-todo" },
    }, 1);

    expect(migrated.todos).toEqual([]);
    expect(migrated.todoPlans).toEqual([]);
    expect(migrated.sessions).toEqual([{ id: "kept-session" }]);
    expect(migrated.reward).toEqual({ coins: 7 });
    expect(migrated.settings).toEqual({ catName: "煤球" });
    expect(migrated.timer.selectedTodoId).toBeUndefined();
  });

  it("passes the current schema through without rewriting its records", () => {
    const current = currentState();
    expect(migratePersistedAppState(current, 2)).toBe(current);
  });

  it("merges missing fields with safe defaults after migration", () => {
    const merged = mergePersistedAppState({
      settings: { catName: "煤球" },
      reward: { coins: 3.5 },
    }, currentState());

    expect(merged.settings).toMatchObject({ catName: "煤球", theme: "latte" });
    expect(merged.reward).toMatchObject({ coins: 3.5, ownedStickerIds: [] });
    expect(merged.reward.transactions).toEqual([]);
    expect(merged.todos).toEqual([]);
    expect(merged.todoPlans).toEqual([]);
    expect(merged.sessions).toEqual([]);
  });
});
