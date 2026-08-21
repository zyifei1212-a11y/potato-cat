import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { TodoPanel } from "./TodoPanel";
import { useAppStore } from "../store/useAppStore";

const mounted: Array<() => void> = [];

afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

describe("TodoPanel interactions", () => {
  it("keeps the add form interactive while typing and changing its selects", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    mounted.push(() => {
      act(() => root.unmount());
      host.remove();
    });

    await act(async () => root.render(<TodoPanel />));
    const addButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("新增待办"),
    );
    expect(addButton).toBeTruthy();

    await act(async () => addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const title = host.querySelector<HTMLInputElement>('input[placeholder="例如：完成项目方案"]');
    const selects = host.querySelectorAll<HTMLSelectElement>(".todo-form select");
    expect(title).toBeTruthy();
    expect(selects).toHaveLength(3);

    await act(async () => {
      if (!title) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(title, "写一条测试待办");
      title.dispatchEvent(new Event("input", { bubbles: true }));
      selects[0].value = "importantUrgent";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
      selects[1].value = "recurring";
      selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(host.querySelector(".todo-form")).toBeTruthy();
    expect(host.querySelector('select option[value="weekly"]')).toBeTruthy();
    expect(host.querySelector('select option[value="none"]')).toBeTruthy();
    expect(document.body.textContent).not.toBe("");
  });

  it("creates a todo that does not require a pomodoro", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    mounted.push(() => {
      act(() => root.unmount());
      host.remove();
    });

    await act(async () => root.render(<TodoPanel />));
    const addButton = Array.from(host.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("新增待办"),
    );
    await act(async () => addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const title = host.querySelector<HTMLInputElement>('input[placeholder="例如：完成项目方案"]');
    const focusMode = host.querySelector<HTMLSelectElement>('select[aria-label="专注方式"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(title, "无需专注的任务");
      title?.dispatchEvent(new Event("input", { bubbles: true }));
      if (focusMode) {
        focusMode.value = "none";
        focusMode.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const submit = Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "添加",
    );
    await act(async () => submit?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(useAppStore.getState().todos[0]).toMatchObject({
      title: "无需专注的任务",
      requiresPomodoro: false,
    });
    expect(host.textContent).toContain("无需番茄钟");
  });
});
