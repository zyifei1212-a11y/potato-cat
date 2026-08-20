import { describe, expect, it } from "vitest";
import { formatClock, getRemainingSeconds } from "./timer";
import type { TimerSnapshot } from "./types";

describe("timer domain", () => {
  it("formats the clock consistently", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(1500)).toBe("25:00");
  });

  it("derives remaining time from endAt instead of interval counts", () => {
    const timer: TimerSnapshot = {
      runId: "run-1",
      mode: "focus",
      status: "running",
      durationSeconds: 1500,
      remainingSeconds: 1500,
      endAt: 11_000,
      completedFocusCount: 0,
    };
    expect(getRemainingSeconds(timer, 1_000)).toBe(10);
    expect(getRemainingSeconds(timer, 11_500)).toBe(0);
  });
});
