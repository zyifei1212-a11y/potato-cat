import { describe, expect, it } from "vitest";
import {
  desktopPointerToClient,
  mainWindowSizeForPreset,
  petWindowSizeForScale,
} from "./windowManager";

describe("pet window geometry", () => {
  it("shrinks the native window together with the cat", () => {
    expect(petWindowSizeForScale(1)).toEqual({ width: 370, height: 372 });
    expect(petWindowSizeForScale(0.45)).toEqual({ width: 167, height: 168 });
    expect(petWindowSizeForScale(1.3)).toEqual({ width: 481, height: 484 });
  });

  it("maps a desktop-wide physical cursor into CSS coordinates", () => {
    expect(
      desktopPointerToClient(
        { x: 2150, y: 650 },
        { x: 1900, y: 400 },
        1.25,
      ),
    ).toEqual({ x: 200, y: 200 });

    expect(
      desktopPointerToClient(
        { x: -900, y: 200 },
        { x: -1100, y: 100 },
        2,
      ),
    ).toEqual({ x: 100, y: 50 });

    expect(
      desktopPointerToClient(
        { x: 2075, y: 475 },
        { x: 2000, y: 400 },
        1,
        0.5,
      ),
    ).toEqual({ x: 150, y: 150 });
  });
});


describe("main window presets", () => {
  it("uses fixed phone and small-window sizes", () => {
    expect(mainWindowSizeForPreset("compact")).toEqual({ width: 390, height: 844 });
    expect(mainWindowSizeForPreset("medium")).toEqual({ width: 860, height: 620 });
  });

  it("lets fullscreen use the current display instead of a fixed size", () => {
    expect(mainWindowSizeForPreset("fullscreen")).toBeNull();
  });
});
