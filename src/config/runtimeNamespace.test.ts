import { describe, expect, it } from "vitest";
import developmentTauriConfig from "../../src-tauri/tauri.dev.conf.json";
import productionTauriConfig from "../../src-tauri/tauri.conf.json";
import {
  ACTIVE_RUNTIME_NAMESPACE,
  APP_RUNTIME_NAMESPACES,
  runtimeNamespaceFor,
} from "./runtimeNamespace";

describe("runtime data namespaces", () => {
  it("keeps every development identifier separate from production", () => {
    const production = APP_RUNTIME_NAMESPACES.production;
    const development = APP_RUNTIME_NAMESPACES.development;

    expect(development.tauriIdentifier).not.toBe(production.tauriIdentifier);
    expect(development.storageKey).not.toBe(production.storageKey);
    expect(development.stateSyncChannel).not.toBe(production.stateSyncChannel);
  });

  it("preserves the confirmed first-version production namespace", () => {
    expect(runtimeNamespaceFor(false)).toEqual({
      tauriIdentifier: "com.catpomodoro.desktop",
      storageKey: "cat-pomodoro-v1",
      stateSyncChannel: "cat-pomodoro-state-v1",
    });
  });

  it("keeps Tauri's production and development identifiers aligned with the frontend", () => {
    expect(productionTauriConfig.identifier).toBe(
      APP_RUNTIME_NAMESPACES.production.tauriIdentifier,
    );
    expect(developmentTauriConfig.identifier).toBe(
      APP_RUNTIME_NAMESPACES.development.tauriIdentifier,
    );
  });

  it("uses the development namespace under the Vite dev/test runtime", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(ACTIVE_RUNTIME_NAMESPACE).toBe(APP_RUNTIME_NAMESPACES.development);
  });
});
