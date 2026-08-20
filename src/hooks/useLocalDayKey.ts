import { useEffect, useState } from "react";
import { localDateKey } from "../domain/stats";

export const useLocalDayKey = () => {
  const [dayKey, setDayKey] = useState(() => localDateKey());
  useEffect(() => {
    const update = () => setDayKey((current) => {
      const next = localDateKey();
      return next === current ? current : next;
    });
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);
  return dayKey;
};
