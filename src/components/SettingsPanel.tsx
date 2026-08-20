import { useAppStore } from "../store/useAppStore";
import type { AppTheme } from "../domain/types";
import { APP_ICON_OPTIONS } from "../config/appIcons";
import { quitApplication, setPetAlwaysOnTop } from "../services/windowManager";

const THEME_OPTIONS: Array<{ value: AppTheme; label: string }> = [
  { value: "latte", label: "奶咖" },
  { value: "matcha", label: "抹茶" },
  { value: "mistBlue", label: "雾蓝" },
  { value: "warmBerry", label: "暖莓" },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const update = useAppStore((state) => state.updateSettings);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="settings-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="panel__header">
          <div><p className="section-kicker">PREFERENCES</p><h2>偏好设置</h2></div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-group">
          <h3>主界面主题</h3>
          <div className="theme-picker" role="group" aria-label="主界面主题配色">
            {THEME_OPTIONS.map((option) => (
              <button
                type="button"
                className={`theme-option${settings.theme === option.value ? " theme-option--active" : ""}`}
                aria-pressed={settings.theme === option.value}
                onClick={() => update({ theme: option.value })}
                key={option.value}
              >
                <span className={`theme-swatch theme-swatch--${option.value}`} aria-hidden="true">
                  <i /><i /><i />
                </span>
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>
          <p className="theme-note">只改变界面配色，不会改变煤煤图片的颜色。</p>
        </div>

        <div className="settings-group">
          <h3>应用图标</h3>
          <div className="app-icon-picker" role="group" aria-label="应用与快捷方式图标">
            {APP_ICON_OPTIONS.map((option) => (
              <button
                type="button"
                className={`app-icon-option${settings.appIconStyle === option.value ? " app-icon-option--active" : ""}`}
                aria-pressed={settings.appIconStyle === option.value}
                onClick={() => update({ appIconStyle: option.value })}
                key={option.value}
              >
                <img src={option.src} alt="" aria-hidden="true" />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </button>
            ))}
          </div>
          <p className="theme-note">同步更改主界面、任务栏和已安装的桌面快捷方式；经典图标不会被删除。</p>
        </div>

        <div className="settings-group">
          <h3>计时时长</h3>
          {([
            ["focusMinutes", "专注", 1, 180],
            ["shortBreakMinutes", "短休息", 1, 60],
            ["longBreakMinutes", "长休息", 1, 60],
          ] as const).map(([key, label, min, max]) => (
            <label className="setting-row" key={key}>
              <span>{label}</span>
              <span className="number-setting">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(event) => update({ [key]: Math.min(max, Math.max(min, Number(event.target.value))) })}
                /> 分钟
              </span>
            </label>
          ))}
        </div>

        <div className="settings-group">
          <h3>桌宠与提醒</h3>
          <label className="setting-row setting-row--name">
            <span>猫咪名字<small>主界面会用这个名字和你打招呼</small></span>
            <input
              className="setting-name-input"
              type="text"
              maxLength={12}
              value={settings.catName}
              placeholder="煤煤"
              onChange={(event) => update({ catName: event.target.value.slice(0, 12) })}
              onBlur={() => {
                if (!settings.catName.trim()) update({ catName: "煤煤" });
                else if (settings.catName !== settings.catName.trim()) update({ catName: settings.catName.trim() });
              }}
            />
          </label>
          <label className="setting-row">
            <span>霸屏休息提醒<small>猫会走到屏幕中央卧躺</small></span>
            <input type="checkbox" checked={settings.enableFullscreenBreakReminder} onChange={(e) => update({ enableFullscreenBreakReminder: e.target.checked })} />
          </label>
          <label className="setting-row">
            <span>悬浮窗始终置顶</span>
            <input
              type="checkbox"
              checked={settings.enableAlwaysOnTop}
              onChange={(e) => {
                update({ enableAlwaysOnTop: e.target.checked });
                void setPetAlwaysOnTop(e.target.checked);
              }}
            />
          </label>
          <label className="setting-row">
            <span>钻袋子彩蛋<small>待机时偶尔触发</small></span>
            <input type="checkbox" checked={settings.enableBagEasterEgg} onChange={(e) => update({ enableBagEasterEgg: e.target.checked })} />
          </label>
          <label className="setting-range">
            <span>悬浮猫大小 <b>{Math.round(settings.floatingScale * 100)}%</b></span>
            <input type="range" min="0.45" max="1.3" step="0.05" value={settings.floatingScale} onChange={(e) => update({ floatingScale: Number(e.target.value) })} />
          </label>
        </div>

        <p className="settings-note">所有数据仅保存在本机。正式猫咪素材可在后续直接替换，不影响计时和状态逻辑。</p>
        <button className="button button--danger-outline" onClick={() => void quitApplication()}>退出应用</button>
      </aside>
    </div>
  );
}
