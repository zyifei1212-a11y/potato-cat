import { describe, expect, it } from "vitest";
import type { PetVisualState } from "../domain/types";
import { PET_ASSETS } from "./PetCat";

const states: PetVisualState[] = [
  "idleLoaf",
  "focusTyping",
  "hoverLook",
  "sleepBreathing",
  "dragLift",
  "breakOverlay",
  "bagEasterEgg",
];

describe("PET_ASSETS", () => {
  it("maps every existing visual state to a real asset with CSS fallback", () => {
    expect(Object.keys(PET_ASSETS)).toEqual(states);
    for (const state of states) {
      expect(PET_ASSETS[state]?.src).toMatch(/\.(png|webp)$/);
      expect(PET_ASSETS[state]?.fallback).toBe("css");
    }
  });

  it("keeps each visual-only behavior attached to the intended state", () => {
    for (const state of states) {
      expect(PET_ASSETS[state]).not.toHaveProperty("eyeTracking");
    }
    expect(PET_ASSETS.focusTyping).toMatchObject({ keyboard: false });
    expect(PET_ASSETS.focusTyping?.frames).toHaveLength(3);
    expect(PET_ASSETS.hoverLook).toMatchObject({ hearts: true });
    expect(PET_ASSETS.dragLift?.loop).toBe(true);
    expect(PET_ASSETS.breakOverlay?.frames).toHaveLength(3);
  });
});
