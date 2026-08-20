import type { PetVisualState, TimerSnapshot } from "./types";

export const getBasePetState = (timer: TimerSnapshot): PetVisualState => {
  if (timer.mode !== "focus" && timer.status === "running") return "sleepBreathing";
  if (timer.mode === "focus" && timer.status === "running") return "focusTyping";
  return "idleLoaf";
};

export const resolvePetState = (
  timer: TimerSnapshot,
  override?: "hover" | "drag" | "overlay" | "easterEgg",
): PetVisualState => {
  if (override === "overlay") return "breakOverlay";
  if (override === "drag") return "dragLift";
  if (override === "hover") return "hoverLook";
  if (override === "easterEgg") return "bagEasterEgg";
  return getBasePetState(timer);
};
