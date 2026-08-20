# V2 阶段 2.0：第一版基线与开发隔离

## 版本管理基线

- 稳定分支：`main`
- 第二版整合分支：`develop-v2`
- 第一版基线标签：`v1-baseline-meimei-v0.4.1`
- 标签对应的用户发布名为“煤煤v0.4.1”，源码版本仍为 `0.1.0`。
- 当前仅初始化本地 Git；没有配置远程仓库，也没有向外部推送。

后续功能从 `develop-v2` 分出短期分支，并在自动化测试通过后合回：

- `feature/shop`
- `feature/fridge-board`
- `feature/accessories`

## 数据命名空间

| 用途 | Tauri identifier | localStorage key | BroadcastChannel |
| --- | --- | --- | --- |
| 正式版 | `com.catpomodoro.desktop` | `cat-pomodoro-v1` | `cat-pomodoro-state-v1` |
| 第二版开发模式 | `com.catpomodoro.desktop.dev` | `cat-pomodoro-v2-dev` | `cat-pomodoro-state-v2-dev` |

`pnpm desktop:dev` 会加载 `src-tauri/tauri.dev.conf.json`，并由 Vite 开发环境自动选择开发版前端命名空间。正式版的 identifier、storage key 和 BroadcastChannel 名称均未修改。

`pnpm build` 和 `pnpm desktop:build` 仍是生产构建路径，不应作为日常开发启动命令。第二版开发日常统一使用：

```powershell
pnpm desktop:dev
```

## 数据迁移测试入口

- 持久化版本常量、状态结构、迁移函数和默认值合并函数位于 `src/store/persistence.ts`。
- `src/store/persistence.test.ts` 直接覆盖旧版本迁移、当前版本直通和缺失字段默认值合并。
- `src/config/runtimeNamespace.test.ts` 覆盖正式/开发命名空间隔离，以及 Tauri 配置和前端配置的一致性。
- `src/store/useAppStore.test.ts` 覆盖开发操作不会写入正式 localStorage key。

不得通过删除或清空 `C:\Users\24639\AppData\Local\com.catpomodoro.desktop` 来测试迁移或隔离。
