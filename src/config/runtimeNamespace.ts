export type AppRuntimeMode = "production" | "development";

export const APP_RUNTIME_NAMESPACES = {
  production: {
    tauriIdentifier: "com.catpomodoro.desktop",
    storageKey: "cat-pomodoro-v1",
    stateSyncChannel: "cat-pomodoro-state-v1",
  },
  development: {
    tauriIdentifier: "com.catpomodoro.desktop.dev",
    storageKey: "cat-pomodoro-v2-dev",
    stateSyncChannel: "cat-pomodoro-state-v2-dev",
  },
} as const satisfies Record<
  AppRuntimeMode,
  {
    tauriIdentifier: string;
    storageKey: string;
    stateSyncChannel: string;
  }
>;

export const runtimeNamespaceFor = (isDevelopment: boolean) =>
  APP_RUNTIME_NAMESPACES[isDevelopment ? "development" : "production"];

export const ACTIVE_RUNTIME_NAMESPACE = runtimeNamespaceFor(import.meta.env.DEV);
export const STORAGE_KEY = ACTIVE_RUNTIME_NAMESPACE.storageKey;
export const STATE_SYNC_CHANNEL_NAME = ACTIVE_RUNTIME_NAMESPACE.stateSyncChannel;
