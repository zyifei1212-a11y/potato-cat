import { useEffect, useState } from "react";
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
} from "../services/windowManager";
import { BreakReminderCard } from "./shared/BreakReminderCard";
import { APP_ICON_SOURCES } from "../config/appIcons";
import { applyAppIcon } from "../services/windowManager";

export function MainWindow() {
  const coins = useAppStore((state) => state.reward.coins);
  const timer = useAppStore((state) => state.timer);
  const theme = useAppStore((state) => state.settings.theme);
  const appIconStyle = useAppStore((state) => state.settings.appIconStyle);
  const catName = useAppStore((state) => state.settings.catName || "煤煤");
  const pendingReminder = useAppStore((state) => state.pendingBreakReminder);
  const fullscreenReminder = useAppStore((state) => state.settings.enableFullscreenBreakReminder);
  const [showSettings, setShowSettings] = useState(false);
  const [browserReminder, setBrowserReminder] = useState(false);

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

  const openPet = async () => {
    const shown = await showWindow("pet");
    if (!shown) {
      window.open(`${window.location.pathname}?window=pet`, "cat-pet-preview", "width=350,height=352");
    }
  };

  return (
    <main className="app-shell" data-theme={theme}>
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

        <div className="workspace-grid">
          <TimerPanel />
          <TodoPanel />
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
