import { useEffect, useState } from "react";
import type { WindowSizePreset } from "../domain/types";
import { TimerPanel } from "../components/TimerPanel";
import { TodoPanel } from "../components/TodoPanel";
import { StatsPanel } from "../components/StatsPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { PetCat } from "../components/PetCat";
import { useAppStore } from "../store/useAppStore";
import {
  hideCurrentWindow,
  minimizeCurrentWindow,
  showWindow,
  startWindowDragging,
  switchMainWindowPreset,
  applyAppIcon,
} from "../services/windowManager";
import { BreakReminderCard } from "./shared/BreakReminderCard";
import { APP_ICON_SOURCES } from "../config/appIcons";

const WINDOW_SIZE_OPTIONS: Array<{ value: WindowSizePreset; label: string; glyph: string }> = [
  { value: "compact", label: "最小", glyph: "▯" },
  { value: "medium", label: "中等", glyph: "▢" },
  { value: "fullscreen", label: "全屏", glyph: "□" },
];

export function MainWindow() {
  const coins = useAppStore((state) => state.reward.coins);
  const timer = useAppStore((state) => state.timer);
  const theme = useAppStore((state) => state.settings.theme);
  const appIconStyle = useAppStore((state) => state.settings.appIconStyle);
  const windowSizePreset = useAppStore((state) => state.settings.windowSizePreset);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const catName = useAppStore((state) => state.settings.catName || "煤煤");
  const pendingReminder = useAppStore((state) => state.pendingBreakReminder);
  const fullscreenReminder = useAppStore((state) => state.settings.enableFullscreenBreakReminder);
  const [showSettings, setShowSettings] = useState(false);
  const [browserReminder, setBrowserReminder] = useState(false);
  const [compactModule, setCompactModule] = useState<"timer" | "todo">("timer");

  useEffect(() => {
    if (!pendingReminder) {
      setBrowserReminder(false);
      return;
    }
    if (!fullscreenReminder) {
      setBrowserReminder(true);
      return;
    }
    void showWindow("break-overlay").then((shown) => setBrowserReminder(!shown));
  }, [fullscreenReminder, pendingReminder]);

  useEffect(() => {
    void applyAppIcon(appIconStyle);
  }, [appIconStyle]);

  useEffect(() => {
    void switchMainWindowPreset(windowSizePreset);
  }, [windowSizePreset]);

  const openPet = async () => {
    const shown = await showWindow("pet");
    if (!shown) {
      window.open(`${window.location.pathname}?window=pet`, "cat-pet-preview", "width=350,height=352");
    }
  };

  return (
    <main className="app-shell" data-theme={theme} data-window-preset={windowSizePreset}>
      <div className="window-titlebar">
        <button
          type="button"
          className="window-titlebar__drag-region"
          aria-label="拖动主窗口"
          onPointerDown={(event) => {
            if (event.button === 0) void startWindowDragging();
          }}
        >
          <img className="window-titlebar__icon" src={APP_ICON_SOURCES[appIconStyle]} alt="" aria-hidden="true" />
          <span>猫咪桌宠番茄钟</span>
        </button>
        <div className="window-titlebar__controls">
          <button type="button" aria-label="最小化" onClick={() => void minimizeCurrentWindow()}>—</button>
          <button type="button" className="window-titlebar__close" aria-label="关闭主界面" onClick={() => void hideCurrentWindow()}>×</button>
        </div>
      </div>

      <header className="app-header">
        <div className="brand">
          <span className="brand__mark"><img src={APP_ICON_SOURCES[appIconStyle]} alt="煤煤应用图标" /></span>
          <div><strong>猫咪桌宠番茄钟</strong><small>FOCUS WITH YOUR CAT</small></div>
        </div>
        <div className="header-actions">
          <div className="window-size-switcher" role="group" aria-label="主界面大小">
            {WINDOW_SIZE_OPTIONS.map((option) => (
              <button
                type="button"
                className={windowSizePreset === option.value ? "window-size-button window-size-button--active" : "window-size-button"}
                aria-pressed={windowSizePreset === option.value}
                title={`切换为${option.label}界面`}
                onClick={() => updateSettings({ windowSizePreset: option.value })}
                key={option.value}
              >
                <span aria-hidden="true">{option.glyph}</span><small>{option.label}</small>
              </button>
            ))}
          </div>
          <div className="coin-pill" title="当前专注币"><span>✦</span><b>{coins.toFixed(1)}</b><small>专注币</small></div>
          <button className="header-button" onClick={() => void openPet()}>🐾 桌宠</button>
          <button className="icon-button" aria-label="设置" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </header>

      <div className="content-wrap">
        <section className="welcome-row">
          <div>
            <p className="section-kicker">GOOD DAY</p>
            <h1>今天，也和{catName}一起专注吧。</h1>
            <p>把任务拆小一点，完成一个番茄就很好。</p>
          </div>
          <div className="mini-pet-preview" onClick={() => void openPet()}>
            <PetCat timer={timer} />
            <span>打开悬浮桌宠 →</span>
          </div>
        </section>

        <StatsPanel />

        <nav className="compact-module-tabs" aria-label="最小界面功能面板">
          <button type="button" className={compactModule === "timer" ? "compact-module-tab compact-module-tab--active" : "compact-module-tab"} onClick={() => setCompactModule("timer")}>番茄钟</button>
          <button type="button" className={compactModule === "todo" ? "compact-module-tab compact-module-tab--active" : "compact-module-tab"} onClick={() => setCompactModule("todo")}>待办事项</button>
        </nav>

        <div className="workspace-grid">
          <div className={windowSizePreset === "compact" && compactModule !== "timer" ? "workspace-pane workspace-pane--hidden" : "workspace-pane"}><TimerPanel /></div>
          <div className={windowSizePreset === "compact" && compactModule !== "todo" ? "workspace-pane workspace-pane--hidden" : "workspace-pane"}><TodoPanel /></div>
          <aside className="future-module-reserve" aria-label="后续功能预留区">
            <span>＋</span>
            <strong>功能扩展位</strong>
            <p>为背景板、商店与后续模块预留</p>
          </aside>
        </div>
      </div>

      <footer className="app-footer">
        <span>数据仅保存在本机</span>
        <span>{catName}正在陪你 · V1 Prototype</span>
      </footer>

      {showSettings ? <SettingsPanel onClose={() => setShowSettings(false)} /> : null}
      {browserReminder ? (
        <div className="reminder-modal-backdrop">
          <BreakReminderCard onDone={() => setBrowserReminder(false)} />
        </div>
      ) : null}
    </main>
  );
}

