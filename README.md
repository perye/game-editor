# GameForge（游戏编辑器）

**GameForge** 是一款面向独立开发者的开源 **Web 端可视化游戏编辑平台**。在浏览器中即可完成场景搭建、逻辑编排、资源管理与预览，并导出为可独立运行的 HTML5 游戏，降低 2D 小游戏从创意到发布的门槛。

---

## ✨ 功能亮点

| 能力 | 说明 |
|------|------|
| 🎨 **三栏可调整布局** | 左侧组件库、中间场景与逻辑编辑、右侧实时预览，面板宽度可拖拽调节 |
| 🧩 **拖拽式实体编排** | 从组件库将游戏实体拖入场景，所见即所得 |
| ⚙️ **2D 物理引擎** | 刚体、重力、碰撞检测，支持 AABB 与圆形等碰撞形状 |
| 🔗 **可视化节点图逻辑** | 基于节点图的事件—条件—动作流程，无需手写全部胶水代码 |
| 📦 **多种游戏模板** | 平台、射击、解谜、点击、卡牌、视觉小说等起点工程 |
| 🎭 **丰富行为系统** | 30+ 内置行为：键盘移动、巡逻、追逐、射击、可拖拽、对话框、补间动画等 |
| 🏗️ **ECS 架构** | 实体—组件—系统分离，便于扩展与性能优化 |
| 📊 **变量系统** | 全局变量与实体级变量，统一驱动游戏状态 |
| 📡 **事件总线** | 发布—订阅模式解耦模块通信 |
| 🎮 **输入管理** | 键盘与鼠标输入集中处理，便于绑定与回放 |
| 🖼️ **资源管理** | 图片、音频等资源的导入与引用 |
| 📤 **导出 HTML5** | 一键导出独立可玩的网页游戏包 |
| 💾 **项目 JSON** | 支持工程导出与导入，便于版本管理与协作 |
| ↩️ **撤销 / 重做** | 完整编辑历史，降低误操作成本 |
| 🇨🇳 **中文界面** | 编辑器 UI 全面中文化，上手更顺畅 |

---

## 📷 截图

> 建议在仓库根目录添加 `docs/screenshots/` 并放入以下示意图片后，将下方占位路径替换为实际文件。

| 主界面 | 节点图 | 预览 |
|--------|--------|------|
| `docs/screenshots/main.png` | `docs/screenshots/node-graph.png` | `docs/screenshots/preview.png` |

```markdown
<!-- 示例：取消注释并指向真实文件 -->
<!-- ![主界面](./docs/screenshots/main.png) -->
```

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18+（推荐 LTS）
- 包管理器：npm（亦兼容 pnpm / yarn）

### 安装与启动

```bash
git clone <你的仓库地址> game-forge
cd game-forge
npm install
npm run dev
```

在浏览器中打开终端提示的本地地址（默认一般为 `http://localhost:5173`）。

### 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Vite HMR） |
| `npm run build` | TypeScript 检查并构建生产包 |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | 运行 ESLint |

---

## 📁 项目结构概览

```
game-editor/
├── index.html
├── package.json
├── vite.config.ts          # Vite 构建配置
├── src/
│   ├── main.tsx            # 应用入口
│   ├── App.tsx             # 根组件
│   ├── index.css           # 全局样式（含 Tailwind）
│   ├── types/              # TypeScript 类型定义
│   ├── store/              # Zustand 状态（编辑器、历史、节点图、动画等）
│   ├── hooks/              # 通用 Hooks（如快捷键）
│   ├── utils/              # 工具（导出器、颜色、ID 等）
│   ├── engine/             # 运行时与核心系统
│   │   ├── runtime.ts      # 游戏运行时
│   │   ├── physics.ts      # 2D 物理
│   │   ├── eventBus.ts     # 事件总线
│   │   ├── inputManager.ts # 输入管理
│   │   ├── variableSystem.ts
│   │   ├── audioManager.ts
│   │   ├── nodeExecutor.ts # 节点图执行
│   │   ├── prefabs.ts
│   │   ├── demoProject.ts
│   │   └── templates/      # 各游戏模板数据
│   ├── components/
│   │   ├── layout/         # 工具栏、可调整面板、模板选择等
│   │   ├── left-panel/     # 组件库、层级、属性、资源
│   │   ├── center-editor/  # 场景、节点图、代码、时间轴
│   │   └── right-preview/  # 实时预览画布
│   └── assets/             # 静态资源
└── public/                 # 公共静态文件（若存在）
```

---

## 🛠 技术栈

| 类别 | 技术选型 |
|------|----------|
| 前端框架 | **React 19** + **TypeScript** |
| 构建工具 | **Vite 8** |
| 2D 渲染 | **PixiJS 8** |
| 状态管理 | **Zustand** |
| 布局 | 自定义 **ResizablePanels**（可调整分栏） |
| 拖拽 | **@dnd-kit**（core / sortable / utilities） |
| 节点图 | **@xyflow/react**（可视化逻辑编辑） |
| 代码编辑 | **Monaco Editor**（`@monaco-editor/react`） |
| UI 组件 | **Radix UI**（Tabs、Select、Slider、Tooltip 等） |
| 样式 | **Tailwind CSS v4**（`@tailwindcss/vite`） |
| 图标 | **Lucide React** |

---

## 🎮 可用游戏模板

以下为新建工程时可选择的模板类型，用于快速匹配常见玩法范式（具体实体与行为以模板定义为准）：

| 模板 | 适用场景 |
|------|----------|
| **平台跳跃（Platformer）** | 横版平台、跳跃、关卡障碍 |
| **射击（Shooter）** | 弹幕、朝向射击、敌人生成 |
| **解谜（Puzzle）** | 机关、逻辑组合、回合或步进解谜 |
| **点击（Clicker）** | 增量、点击反馈、简单数值循环 |
| **卡牌（Card）** | 手牌、出牌区、回合结构 |
| **视觉小说（Visual Novel）** | 立绘、对话分支、选项 |

可在编辑器内通过 **模板选择器** 切换或基于模板扩展自定义内容。

---

## 👨‍💻 开发指南

### 目录职责

- **`src/engine/`**：游戏循环、物理、事件、变量、音频及节点执行等与「运行」相关的逻辑；新增系统级能力时优先在此扩展并保持与编辑器数据模型一致。
- **`src/store/`**：编辑器侧状态与历史记录；涉及撤销/重做的修改需接入 `useHistoryStore` 等既有模式。
- **`src/components/`**：纯 UI 与画布交互；复杂业务委托给 store 与 engine。

### 代码规范

- 使用 TypeScript 严格类型，避免滥用 `any`。
- 新增组件时与现有 **Radix + Tailwind** 风格保持一致。
- 提交前执行 `npm run lint` 与 `npm run build`，确保无报错。

### 本地调试建议

- 开发时使用 `npm run dev` 利用热更新迭代 UI 与逻辑。
- 对导出与发布流程有疑问时，可结合 `src/utils/exporter.ts` 与构建产物目录进行验证。

---

## 📦 构建与部署

### 生产构建

```bash
npm run build
```

产物默认输出到 `dist/` 目录，为静态文件，可部署到任意静态托管服务。

### 预览构建结果

```bash
npm run preview
```

### 部署提示

- **静态托管**：将 `dist/` 上传至 Netlify、Vercel、Cloudflare Pages、GitHub Pages 或自有 Nginx / OSS。
- **路由**：若为单页应用且使用 History 模式路由，需在服务端配置 **fallback 到 `index.html`**（本项目以 Vite 默认 SPA 为主时通常适用）。
- **资源路径**：若部署在子路径下，请在 `vite.config` 中配置 `base` 为相对路径或子目录前缀。

---

## 📄 许可证

本项目采用 **MIT License** 开源。使用、修改与再发布时请保留原始许可证声明。完整条款见仓库中的 `LICENSE` 文件（若尚未添加，可自行补充标准 MIT 全文）。

---

## 🤝 贡献

欢迎通过 Issue 讨论想法、通过 Pull Request 提交改进。参与前请先阅读 [**贡献指南**](./CONTRIBUTING.md)（若仓库中尚未创建该文件，可补充约定：分支策略、代码风格、提交流程等）。

---

<p align="center">
  <b>GameForge</b> — 在浏览器中锻造你的下一款小游戏
</p>
