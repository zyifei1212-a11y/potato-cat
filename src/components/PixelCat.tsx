import attentionSrc from "../assets/pixel-cat/attention.png";
import happySrc from "../assets/pixel-cat/happy.png";
import idleSrc from "../assets/pixel-cat/idle.png";
import sleepSrc from "../assets/pixel-cat/sleep.png";
import typingSrc from "../assets/pixel-cat/typing.png";
import type { TimerMode, TimerStatus } from "../domain/types";

export type PixelCatState = "idle" | "typing" | "sleep" | "attention" | "happy";

interface PixelCatProps {
  mode: TimerMode;
  status: TimerStatus;
  attention?: boolean;
  completedTodosToday?: number;
}

const PIXEL_CAT_ASSETS: Record<PixelCatState, string> = {
  idle: idleSrc,
  typing: typingSrc,
  sleep: sleepSrc,
  attention: attentionSrc,
  happy: happySrc,
};

export const resolvePixelCatState = (
  mode: TimerMode,
  status: TimerStatus,
  attention: boolean,
  completedTodosToday: number,
): PixelCatState => {
  if (attention) return "attention";
  if (mode !== "focus" && status === "running") return "sleep";
  if (mode === "focus" && status === "running") return "typing";
  return completedTodosToday > 0 ? "happy" : "idle";
};

const stateLabel: Record<PixelCatState, string> = {
  idle: "煤煤卧趴待机",
  typing: "煤煤压在键盘前专注",
  sleep: "煤煤蜷缩睡觉",
  attention: "煤煤抬头提醒",
  happy: "煤煤为今日完成的待办开心",
};

export function PixelCat({
  mode,
  status,
  attention = false,
  completedTodosToday = 0,
}: PixelCatProps) {
  const safeCompletedCount = Math.max(0, Math.floor(completedTodosToday));
  const state = resolvePixelCatState(mode, status, attention, safeCompletedCount);

  return (
    <div className={`pixel-cat pixel-cat--${state}`} aria-label={stateLabel[state]}>
      <img
        className="pixel-cat__image"
        src={PIXEL_CAT_ASSETS[state]}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      {state === "happy" ? (
        <div
          className="pixel-cat__stars"
          aria-label={`今天完成了 ${safeCompletedCount} 个待办`}
        >
          {Array.from({ length: safeCompletedCount }, (_, index) => (
            <span className="pixel-cat__star" aria-hidden="true" key={index}>✦</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
