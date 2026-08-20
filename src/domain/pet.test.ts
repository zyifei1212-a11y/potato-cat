import { describe, expect, it } from "vitest";
import { resolvePetState } from "./pet";
import type { TimerSnapshot } from "./types";

const timer = (mode: TimerSnapshot["mode"], status: TimerSnapshot["status"]): TimerSnapshot => ({
  mode,
  status,
  durationSeconds: 60,
  remainingSeconds: 60,
  completedFocusCount: 0,
});

describe("pet state priority", () => {
  it("maps focus and break to their base animations", () => {
    expect(resolvePetState(timer("focus", "running"))).toBe("focusTyping");
    expect(resolvePetState(timer("shortBreak", "running"))).toBe("sleepBreathing");
    expect(resolvePetState(timer("focus", "idle"))).toBe("idleLoaf");
  });

  it("lets drag and hover temporarily override the timer animation", () => {
    const focusing = timer("focus", "running");
    expect(resolvePetState(focusing, "hover")).toBe("hoverLook");
    expect(resolvePetState(focusing, "drag")).toBe("dragLift");
    expect(resolvePetState(focusing)).toBe("focusTyping");
  });
});
