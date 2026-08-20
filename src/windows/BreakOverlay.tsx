import { useEffect } from "react";
import { BreakReminderCard } from "./shared/BreakReminderCard";
import { useAppStore } from "../store/useAppStore";
import { hideCurrentWindow } from "../services/windowManager";

export function BreakOverlay() {
  const pending = useAppStore((state) => state.pendingBreakReminder);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useAppStore.getState().skipBreak();
        void hideCurrentWindow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!pending) return <main className="break-overlay break-overlay--empty" />;
  return <main className="break-overlay"><BreakReminderCard /></main>;
}
