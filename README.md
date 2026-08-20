# 猫咪桌宠番茄钟 V1

一个 Windows 优先的桌面番茄钟原型：主界面管理待办和专注，真实猫占位桌宠悬浮陪伴，番茄完成后进行休息提醒、奖励结算和今日统计。

## 已实现

- 待办新增、编辑、删除、完成和绑定当前专注。
- 25/5/15 分钟番茄流程，可在设置中调整。
- 开始、暂停、继续、重置、放弃和跳过休息。
- 使用绝对结束时间校准计时，窗口最小化/短暂休眠后不会按渲染次数漂移。
- 完成番茄写入记录，待办番茄进度 +1。
- 专注币：番茄 +0.5、首次完成待办 +1、当日第 4 个番茄额外 +1。
- 奖励来源与番茄 `runId` 幂等保护。
- 主界面像素猫状态：待机、打字、提醒、闭眼睡觉。
- 透明置顶桌宠窗口及 CSS 真实猫占位：卧趴、打字、悬停、睡觉、双手托起。
- 全屏休息覆盖窗口：开始休息、5 分钟后提醒、跳过、Esc 关闭。
- 今日专注时长、番茄、待办和奖励统计。
- localStorage 本地持久化和多窗口 BroadcastChannel 同步。
- 核心领域规则自动化测试。

## 环境要求

浏览器原型：

- Node.js 20 或更高版本。
- npm 10+ 或 pnpm 9+。

Windows 桌面端还需要：

- Rust stable MSVC 工具链。
- Microsoft C++ Build Tools，勾选“使用 C++ 的桌面开发”。
- Microsoft Edge WebView2（现代 Windows 10/11 通常已包含）。

## 安装与运行

使用 npm：

```bash
npm install
npm run dev
```

或使用 pnpm：

```bash
pnpm install
pnpm dev
```

浏览器打开 `http://localhost:1420`。点击顶部“桌宠”可打开桌宠预览窗口。

运行原生桌面窗口：

```bash
npm run desktop:dev
```

构建前端：

```bash
npm run build
```

运行测试：

```bash
npm test
```

构建 Windows NSIS 安装包：

```bash
npm run desktop:build
```

安装包由 Tauri 输出到 `src-tauri/target/release/bundle/nsis/`。

## 窗口结构

- `main`：主工作台和权威计时结算控制器。
- `pet`：透明置顶桌宠，通过 `/?window=pet` 渲染。
- `break-overlay`：默认隐藏的全屏休息提醒，通过 `/?window=break-overlay` 渲染。

三窗口共享 localStorage，并通过 BroadcastChannel 即时同步业务状态。剩余时间根据持久化的 `endAt` 在每个窗口独立计算，不依赖每秒跨窗口广播。

## 替换正式猫咪素材

当前猫咪由 `src/components/PetCat.tsx` 的语义结构和 `src/styles/global.css` 的 CSS 占位动画绘制。业务层只使用以下状态键：

```ts
type PetVisualState =
  | "idleLoaf"
  | "focusTyping"
  | "hoverLook"
  | "sleepBreathing"
  | "dragLift"
  | "breakOverlay"
  | "bagEasterEgg";
```

替换建议：

1. 在 `src/assets/pet/` 下按状态建立文件夹，例如 `focusTyping/`。
2. 优先使用透明背景 WebP、PNG 序列帧或体积受控的 WebM。
3. 在 `PetCat.tsx` 内新增资源映射，保持组件接收的 `PetVisualState` 不变。
4. 每个循环动作建议 2–5 秒，打字和呼吸动作应缓慢；悬停动画建议 2–4 秒。
5. `dragLift` 素材必须表现为两只手托住猫的胳肢窝；`focusTyping` 只出现键盘，不出现电脑屏幕。
6. 正式素材应提供全身安全边距，避免透明窗口裁切尾巴、爱心和四肢。

替换素材时无需修改计时、待办、奖励或统计逻辑。

## 本地数据

浏览器模式保存在当前站点的 localStorage，键名为 `cat-pomodoro-v1`。Tauri WebView 使用相同的前端存储机制。V1 不上传任何用户数据。

数据模型集中在 `src/domain/types.ts`，状态与业务动作集中在 `src/store/useAppStore.ts`。未来切换 SQLite 时，应实现统一存储适配层，并保留当前领域类型和动作接口。

## 当前 V1 边界

- 正式真实猫照片/序列帧尚未接入，目前是可演示状态的 CSS 占位猫。
- 钻袋子仅保留视觉状态，尚未加入随机待机调度。
- 眼睛精确跟随鼠标、多显示器主动迁移、系统托盘和开机自启留待后续版本。
- 浏览器模式无法模拟系统级透明置顶；需运行 Tauri 桌面模式验证这些窗口能力。
