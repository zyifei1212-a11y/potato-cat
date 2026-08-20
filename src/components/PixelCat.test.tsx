import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PixelCat, resolvePixelCatState } from "./PixelCat";

describe("PixelCat", () => {
  it("uses today's completed todos only for the idle replacement state", () => {
    expect(resolvePixelCatState("focus", "idle", false, 0)).toBe("idle");
    expect(resolvePixelCatState("focus", "idle", false, 1)).toBe("happy");
    expect(resolvePixelCatState("focus", "running", false, 2)).toBe("typing");
    expect(resolvePixelCatState("shortBreak", "running", false, 2)).toBe("sleep");
    expect(resolvePixelCatState("focus", "completed", true, 2)).toBe("attention");
  });

  it("renders one static star for every todo completed today", () => {
    const markup = renderToStaticMarkup(
      <PixelCat mode="focus" status="idle" completedTodosToday={2} />,
    );
    expect(markup).toContain("pixel-cat--happy");
    expect(markup.match(/class="pixel-cat__star"/g)).toHaveLength(2);
    expect(markup).toContain("今天完成了 2 个待办");
  });
});
