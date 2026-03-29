# 贡献指南

感谢你对 **GameForge** 的关注！我们欢迎任何形式的贡献：Bug 报告、功能建议、代码改进、文档完善等。

---

## 开始之前

1. **查看 Issue 列表**：确认你要做的事情是否已有相关讨论
2. **新建 Issue**：如果是新功能或 Bug，先创建 Issue 描述清楚需求/问题

## 开发流程

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/game-forge.git
cd game-forge
npm install
npm run dev
```

### 2. 创建分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

**分支命名规范**：
- `feature/xxx` — 新功能
- `fix/xxx` — Bug 修复
- `docs/xxx` — 文档更新
- `refactor/xxx` — 重构
- `perf/xxx` — 性能优化

### 3. 编码规范

- **TypeScript 严格模式**：避免 `any`，充分利用类型推导
- **组件风格**：使用函数组件 + Hooks，保持与现有 Radix + Tailwind 风格一致
- **命名**：组件 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE
- **文件组织**：
  - 引擎逻辑 → `src/engine/`
  - 状态管理 → `src/store/`
  - UI 组件 → `src/components/`
  - 类型定义 → `src/types/`
- **注释**：仅在逻辑复杂或非显而易见处添加注释，避免冗余说明

### 4. 测试与检查

提交前请确保：

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 代码风格检查
npm run lint

# 构建测试
npm run build
```

### 5. 提交信息

使用 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 格式：

```
<类型>(可选作用域): <描述>

[可选正文]
```

**类型**：
| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链变更 |

**示例**：
```
feat(engine): 添加粒子系统支持
fix(runtime): 修复子弹碰撞后未正确销毁的问题
docs: 更新 README 快速开始部分
```

### 6. 发起 Pull Request

- PR 标题清晰描述变更内容
- PR 描述中关联相关 Issue（`Closes #123`）
- 确保 CI 检查通过
- 等待代码审查

## 项目架构简要

```
src/
├── engine/          # 游戏运行时核心（物理、事件、输入、变量、节点执行）
├── store/           # Zustand 状态管理（编辑器、历史、节点图）
├── components/      # React UI 组件
│   ├── layout/      # 布局（工具栏、面板、模板选择器）
│   ├── left-panel/  # 左侧面板（组件库、层级、属性）
│   ├── center-editor/ # 中间编辑区（场景、节点图、代码、时间轴）
│   └── right-preview/ # 右侧预览
├── types/           # TypeScript 类型定义
├── hooks/           # 自定义 Hooks
└── utils/           # 工具函数
```

## 行为准则

- 尊重所有参与者
- 建设性地提出反馈
- 保持讨论聚焦在技术话题

---

再次感谢你的贡献！
