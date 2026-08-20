import { useEffect, useState } from "react";
import { formatClock } from "../domain/timer";
import { useTimerClock } from "../hooks/useTimerClock";
import {
  hideCurrentWindow,
  quitApplication,
  resizePetWindow,
  showWindow,
} from "../services/windowManager";
import { useAppStore } from "../store/useAppStore";
import { PetCat } from "../components/PetCat";

const PET_CONTENT_SAFE_SCALE = 0.96;

export function PetWindow() {
  const timer = useAppStore((state) => state.timer);
  const settings = useAppStore((state) => state.settings);
  const start = useAppStore((state) => state.startOrResumeTimer);
  const pause = useAppStore((state) => state.pauseTimer);
  const abandon = useAppStore((state) => state.abandonTimer);
  const skipBreak = useAppStore((state) => state.skipBreak);
  const remaining = useTimerClock(false);
  const [menu, setMenu] = useState(false);
  const running = timer.status === "running";
  const canStop = timer.status !== "idle";
  const contentScale = settings.floatingScale * PET_CONTENT_SAFE_SCALE;
  const controlScale = Math.min(1, Math.max(0.68, settings.floatingScale / 0.75));

  const stopTimer = () => {
    if (!canStop) return;
    if (timer.mode === "focus") abandon();
    else skipBreak();
  };

  const runAndCloseMenu = (action: () => void | Promise<unknown>) => {
    setMenu(false);
    void action();
  };

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    void resizePetWindow(settings.floatingScale);
  }, [settings.floatingScale]);

  return (
    <main
      className="pet-window"
      onContextMenu={(event) => { event.preventDefault(); setMenu(true); }}
    >
      <div
        className="pet-window__stage"
        style={{ opacity: settings.floatingOpacity }}
      >
        <div
          className="pet-bubble"
          style={{ transform: `scale(${controlScale})` }}
        >
          <span>{timer.mode === "focus" ? "FOCUS" : "REST"}</span>
          <strong>{formatClock(remaining)}</strong>
          <button onClick={running ? pause : start} aria-label={running ? "暂停" : "开始"}>{running ? "Ⅱ" : "▶"}</button>
          <button
            className="pet-bubble__stop"
            disabled={!canStop}
            onClick={stopTimer}
            aria-label="终止当前计时"
            title="终止当前计时"
          >
            ■
          </button>
        </div>
        <div
          className="pet-window__cat-scale"
          style={{ transform: `scale(${contentScale})` }}
        >
          <PetCat
            timer={timer}
            draggable
          />
        </div>

        {menu ? (
          <div className="pet-context-menu" onClick={(event) => event.stopPropagation()}>
            <div className="pet-context-menu__header">
              <strong>{settings.catName || "煤煤"}的菜单</strong>
              <button
                className="pet-context-menu__close"
                onClick={() => setMenu(false)}
                aria-label="关闭菜单"
              >
                ×
              </button>
            </div>
            <button onClick={() => runAndCloseMenu(() => showWindow("main"))}>打开主界面</button>
            <button onClick={() => runAndCloseMenu(running ? pause : start)}>{running ? "暂停计时" : "开始 / 继续"}</button>
            <button disabled={!canStop} onClick={() => runAndCloseMenu(stopTimer)}>终止当前计时</button>
            <button onClick={() => runAndCloseMenu(hideCurrentWindow)}>隐藏桌宠</button>
            <button className="danger" onClick={() => runAndCloseMenu(quitApplication)}>退出应用</button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
