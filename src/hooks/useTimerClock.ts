import { useEffect, useState } from "react";
import { getRemainingSeconds } from "../domain/timer";
import { useAppStore } from "../store/useAppStore";

export const useTimerClock = (authoritative = false) => {
  const timer = useAppStore((state) => state.timer);
  const complete = useAppStore((state) => state.completeCurrentTimer);
  const checkSnooze = useAppStore((state) => state.checkSnoozedReminder);
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(timer));

  useEffect(() => {
    const update = () => {
      const next = getRemainingSeconds(timer);
      setRemaining(next);
      if (authoritative && timer.status === "running" && next <= 0) {
        complete();
      }
      if (authoritative) checkSnooze();
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [authoritative, checkSnooze, complete, timer]);

  return remaining;
};
