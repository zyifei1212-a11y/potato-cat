import { useAppStore } from "../store/useAppStore";

export const startTodoMaintenance = () => {
  const refresh = () => useAppStore.getState().refreshTodos();
  refresh();
  const interval = window.setInterval(refresh, 30_000);
  const onVisibility = () => {
    if (document.visibilityState === "visible") refresh();
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};
