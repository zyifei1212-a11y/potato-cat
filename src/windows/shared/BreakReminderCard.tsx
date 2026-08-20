import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "../../domain/timer";
import { useAppStore } from "../../store/useAppStore";
import {
  hideCurrentWindow,
} from "../../services/windowManager";
import { BreakCatVideo } from "./BreakCatVideo";

export function BreakReminderCard({
  onDone,
}: {
  onDone?: () => void;
}) {
  const timer = useAppStore((state) => state.timer);
  const settings = useAppStore((state) => state.settings);
  const skip = useAppStore((state) => state.skipBreak);
  const beginBreak = useAppStore((state) => state.beginSuggestedBreak);
  const [catHidden, setCatHidden] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoSettled, setVideoSettled] = useState(false);
  const [showNextFocusPrompt, setShowNextFocusPrompt] = useState(false);
  const finishedRef = useRef(false);
  const promptShownRef = useRef(false);

  const durationSeconds = useMemo(() => {
    const isLongBreak =
      timer.completedFocusCount > 0 &&
      timer.completedFocusCount % settings.longBreakInterval === 0;
    const minutes = isLongBreak ? settings.longBreakMinutes : settings.shortBreakMinutes;
    return Math.max(1, Math.round(minutes * 60));
  }, [settings.longBreakInterval, settings.longBreakMinutes, settings.shortBreakMinutes, timer.completedFocusCount]);

  const deadlineRef = useRef(Date.now() + durationSeconds * 1000);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  const finish = async (startNextFocus: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    skip();
    if (startNextFocus) useAppStore.getState().startOrResumeTimer();
    onDone?.();
    await hideCurrentWindow();
  };

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && !promptShownRef.current) {
        promptShownRef.current = true;
        setCatHidden(true);
        setShowNextFocusPrompt(true);
      }
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(interval);
  }, []);

  const hideCatAndContinueBreak = async () => {
    beginBreak(remainingSeconds);
    onDone?.();
    if (!onDone) await hideCurrentWindow();
  };

  return (
    <section className={`break-reminder${catHidden ? " break-reminder--cat-hidden" : ""}`}>
      {!catHidden ? (
        <div className="break-reminder__cat-stage">
          <div className={`break-reminder__cat-motion${videoStarted ? " break-reminder__cat-motion--playing" : ""}${videoSettled ? " break-reminder__cat-motion--settled" : ""}`}>
            <BreakCatVideo
              onPlaybackStart={() => setVideoStarted(true)}
              onSettled={() => setVideoSettled(true)}
            />
          </div>
          <div className="break-reminder__speech" role="status">
            <p>喵喵喵喵～喵喵，喵！<span>（起来休息啦）</span></p>
          </div>
        </div>
      ) : null}

      <aside className={`break-timer-panel${catHidden ? " break-timer-panel--compact" : ""}`}>
        <span>{catHidden ? "休息" : "休息时间"}</span>
        <strong aria-label={`剩余休息时间 ${formatClock(remainingSeconds)}`}>
          {formatClock(remainingSeconds)}
        </strong>
        {!catHidden ? (
          <button type="button" onClick={() => void hideCatAndContinueBreak()}>隐藏猫霸屏</button>
        ) : null}
      </aside>

      {showNextFocusPrompt ? (
        <div className="break-next-focus" role="dialog" aria-modal="true" aria-labelledby="next-focus-title">
          <span className="break-next-focus__paw" aria-hidden="true">🐾</span>
          <p>休息结束</p>
          <h2 id="next-focus-title">要开始下一个番茄钟吗？</h2>
          <div>
            <button type="button" className="button button--primary" onClick={() => void finish(true)}>开始专注</button>
            <button type="button" className="button button--soft" onClick={() => void finish(false)}>稍后再说</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
