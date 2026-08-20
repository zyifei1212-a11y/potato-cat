import { selectPersistedState, useAppStore, type PersistedAppState } from "../store/useAppStore";

const CHANNEL_NAME = "cat-pomodoro-state-v1";

export const startStateSync = () => {
  if (!("BroadcastChannel" in window)) return () => undefined;

  const channel = new BroadcastChannel(CHANNEL_NAME);
  const source = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let applyingRemote = false;

  channel.onmessage = (event: MessageEvent<{ source: string; state: PersistedAppState }>) => {
    if (!event.data || event.data.source === source) return;
    applyingRemote = true;
    useAppStore.getState().replacePersistedState(event.data.state);
    applyingRemote = false;
  };

  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (applyingRemote) return;
    if (
      state.todos === previous.todos &&
      state.todoPlans === previous.todoPlans &&
      state.sessions === previous.sessions &&
      state.reward === previous.reward &&
      state.settings === previous.settings &&
      state.timer === previous.timer &&
      state.pendingBreakReminder === previous.pendingBreakReminder &&
      state.snoozedUntil === previous.snoozedUntil
    ) {
      return;
    }
    channel.postMessage({ source, state: selectPersistedState(state) });
  });

  return () => {
    unsubscribe();
    channel.close();
  };
};
