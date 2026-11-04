# bb-studio

**Buckyball Studio** —— 面向 [Buckyball](https://github.com/DangoSys/buckyball)（DSA 硬件框架）的 AI agent 桌面工作台（Electron 壳）。

> 二次开发自 [AionUi](https://github.com/iOfficeAI/AionUi)（Apache-2.0），配套 runtime 为
> `bb-agent-core`（二次开发自 [AionCore](https://github.com/imagist13/bb-agent-core)）。

## 是什么

bb-studio 是 Buckyball 芯片开发 AI 工作台的**桌面壳**（Electron + TypeScript），负责聊天界面与工具渲染，
并规划 EDA 面板（chip viewer / 波形 / mesh 拓扑）；agent 请求转发给本地 runtime。

| 组件    | 仓库                  | 职责                                                      |
| ------- | --------------------- | --------------------------------------------------------- |
| 壳      | `bb-studio`（本仓库） | 桌面 UI · chat · ACP host                                 |
| runtime | `bb-agent-core`       | agent loop · MCP · skills · assistants（`bbcore` 二进制） |

## 架构

```text
┌───────────────────────────────┐
│  bb-studio (Electron, TS)      │  chat UI · 工具渲染 · EDA 面板 · ACP host
└──────────────┬────────────────┘
               │ REST + WebSocket（spawn bbcore 子进程）
┌──────────────▼────────────────┐
│  bb-agent-core (bbcore, Rust)  │  agent loop · MCP · skills · assistants
└──────────────┬────────────────┘
               │ 子进程
        ┌──────▼───────┐
        │  bbdev (CLI)  │  verilator / bebop-verilator 仿真
        └──────────────┘
```

## 现状

本地开发中，分阶段推进（详见 Buckyball 仓库的 `bb-agent-module-plan.md`）：

- ✅ **Phase 0**：骨架跑通 —— 壳启动时 spawn 自建 `bb-agent-core` 二进制。
- ✅ **Phase 1 知识半边**：内置 `buckyball` 助手（中/英规则）+ 17 个 bb 技能。
- ⏸ **Phase 1 执行半边**：`bbdev verilator` 仿真闭环，待 bbdev 工具链（Nix / WSL）就位。
- 🔜 **Phase 2/3**：Verilator 日志 / 断言解析、EDA 面板。

## 已具备的 bb 能力

- **Buckyball 助手**：`buckyball` assistant，内置中/英文领域规则（ball / chip / mesh_shm），默认启用。
- **17 个 bb 技能**：`ball-align` · `check` · `chip-designer` · `ip-designer` · `model-port` ·
  `model-optimize` · `debug-compiler` · `debug-bemu` · `debug-verilator` · `debug-p2e` ·
  `debug-performance` · `waveform` · `workload-tests` · `domain-modeling` · `graph-contract` ·
  `programming-principles` · `repo-install`（移植自 `.agents/skills`）。
- **MCP**：`bbdev` + `waveform`（移植自 `.agents/mcps`，运行时注册）。
- **多 agent**：内置 agent + 外部 CLI agent（Claude Code / Codex 等）经 ACP 接入。

## 开发

两个仓库本地开发，壳启动时会自动 spawn `bb-agent-core` 的 `bbcore` 二进制。

```bash
bun install     # 安装依赖
bun run dev     # 启动开发模式（electron-vite dev）
```

打包：`bun run dist:win` / `dist:mac` / `dist:linux`。开发细节见 [docs/contributing/development.md](docs/contributing/development.md)。

## License

[Apache-2.0](LICENSE)（沿用上游）。基于 [iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi) 二次开发。
