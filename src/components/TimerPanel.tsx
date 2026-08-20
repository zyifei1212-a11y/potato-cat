import { useMemo } from "react";
import { localDateKey } from "../domain/stats";
import { formatClock, modeLabel } from "../domain/timer";
import { useTimerClock } from "../hooks/useTimerClock";
import { useLocalDayKey } from "../hooks/useLocalDayKey";
import { useAppStore } from "../store/useAppStore";
import { PixelCat } from "./PixelCat";

export function TimerPanel() {
  const timer = useAppStore((state) => state.timer);
  const todos = useAppStore((state) => state.todos);
  const start = useAppStore((state) => state.startOrResumeTimer);
  const pause = useAppStore((state) => state.pauseTimer);
  const reset = useAppStore((state) => state.resetTimer);
  const abandon = useAppStore((state) => state.abandonTimer);
  const skipBreak = useAppStore((state) => state.skipBreak);
  const remaining = useTimerClock(true);
  const today = useLocalDayKey();
  const currentTodo = todos.find((todo) => todo.id === timer.selectedTodoId);
  const completedTodosToday = useMemo(
    () => todos.filter(
      (todo) => todo.completedAt && localDateKey(todo.completedAt) === today,
    ).length,
    [today, todos],
  );
  const running = timer.status === "running";
  const isBreak = timer.mode !== "focus";

  return (
    <section className="timer-card" aria-label="番茄钟">
      <div className="timer-card__topline">
        <span className="status-pill">
          <i className={running ? "status-dot status-dot--active" : "status-dot"} />
          {modeLabel(timer.mode)}
        </span>
        <span className="cycle-count">第 {timer.completedFocusCount + 1} 轮</span>
      </div>

      <div className="timer-screen">
        <div>
          <p className="timer-screen__eyebrow">{running ? "保持节奏，慢慢来" : "准备好了就开始"}</p>
          <strong className="timer-screen__clock">{formatClock(remaining)}</strong>
          <p className="timer-screen__task">
            {isBreak ? "让肩膀和眼睛休息一下" : currentTodo?.title ?? "未绑定待办 · 自由专注"}
          </p>
        </div>
        <PixelCat
          mode={timer.mode}
          status={timer.status}
          attention={timer.status === "completed"}
          completedTodosToday={completedTodosToday}
        />
      </div>

      <div className="timer-controls">
        <button
          className={`button button--primary ${running ? "button--pause" : ""}`}
          onClick={running ? pause : start}
        >
          <span>{running ? "Ⅱ" : "▶"}</span>
          {running ? "暂停" : timer.status === "paused" ? "继续" : isBreak ? "开始休息" : "开始专注"}
        </button>
        <button className="button button--soft" onClick={reset}>↻ 重置</button>
        {isBreak ? (
          <button className="button button--ghost" onClick={skipBreak}>跳过休息</button>
        ) : (
          <button
            className="button button--ghost"
            disabled={timer.status === "idle"}
            onClick={() => {
              if (window.confirm("确定放弃本轮专注吗？本轮不会获得专注币。")) abandon();
            }}
          >
            放弃本轮
          </button>
        )}
      </div>
    </section>
  );
}
