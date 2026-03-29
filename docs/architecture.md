# GameForge 架构文档

本文档描述 GameForge 游戏编辑器的核心架构设计，为开发者理解和扩展系统提供参考。

---

## 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                      工具栏 (Toolbar)                      │
├──────────┬─────────────────────────┬─────────────────────┤
│          │                         │                     │
│  组件库   │      场景编辑器          │    实时预览          │
│  层级面板 │      节点图编辑器        │    (PixiJS Canvas)  │
│  属性面板 │      代码编辑器          │                     │
│  素材库   │      动画时间轴          │                     │
│          │                         │                     │
├──────────┴─────────────────────────┴─────────────────────┤
│                   状态管理 (Zustand)                       │
├──────────────────────────────────────────────────────────┤
│                   游戏引擎 (Engine)                        │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ Runtime │ │ Physics │ │ EventBus │ │ NodeExecutor  │ │
│  │         │ │         │ │          │ │               │ │
│  └─────────┘ └─────────┘ └──────────┘ └───────────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ Input   │ │Variable │ │  Audio   │ │   Prefabs     │ │
│  │ Manager │ │ System  │ │ Manager  │ │               │ │
│  └─────────┘ └─────────┘ └──────────┘ └───────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 数据模型

### 核心类型

```typescript
GameProject
├── id: string
├── name: string
├── settings: GameSettings (width, height, fps, backgroundColor)
├── scenes: Scene[]
├── activeSceneId: string
├── globalVariables: GameVariable[]
└── assets: AssetItem[]

Scene
├── id, name
├── entities: Record<string, Entity>
├── rootEntities: string[]  (渲染顺序)
├── backgroundColor: string
├── gravity: number
├── gameState: GameState
└── variables: GameVariable[]

Entity
├── id, name, type
├── components: ComponentData[]  (transform, sprite, text, rigidbody)
├── behaviors: BehaviorConfig[]
├── variables: GameVariable[]
├── children: string[]
├── visible, locked
```

### 组件系统 (Components)

每个实体由多个组件组成：

| 组件 | 数据 | 用途 |
|------|------|------|
| `transform` | x, y, rotation, scaleX, scaleY | 空间变换 |
| `sprite` | color, width, height, shape | 视觉外观 |
| `text` | content, fontSize, color, fontFamily | 文字渲染 |
| `rigidbody` | mass, velocity, gravity, friction, ... | 物理模拟 |

### 行为系统 (Behaviors)

行为是附加到实体上的逻辑模块：

```typescript
BehaviorConfig {
  type: BehaviorType      // 行为类型标识
  enabled: boolean        // 是否启用
  params: Record<string, unknown>  // 运行时参数
}
```

行为在每一帧的 `processBehavior()` 函数中执行，通过 `switch-case` 分发到具体实现。

---

## 状态管理

### useEditorStore

主编辑器状态，管理项目数据和编辑操作：

```
EditorState
├── project: GameProject
├── selectedEntityId
├── editorTab, leftPanelTab
├── isPlaying
├── 实体 CRUD 操作
├── 组件/行为/变量操作
├── 项目导入/导出/模板加载
└── localStorage 自动恢复
```

### useHistoryStore

撤销/重做历史管理：
- `past: GameProject[]` — 历史快照栈
- `future: GameProject[]` — 重做栈
- `record()` — 记录当前状态
- `undo()` / `redo()` — 撤销/重做

### useNodeGraphStore

节点图编辑器状态，基于 @xyflow/react 的节点和边数据。

---

## 引擎架构

### 运行时循环 (runtime.ts)

```
每帧循环 (tickRuntime):
  1. 重置 onGround 标记
  2. 物理步进 (physicsStep)
     - 应用重力
     - 积分速度到位置
     - 碰撞检测 (AABB / Circle)
     - 碰撞分离和响应
  3. 处理碰撞事件
  4. 更新冷却计时
  5. 遍历实体行为 (processBehavior)
  6. 处理生成队列 (spawnQueue)
  7. 处理销毁队列 (removeQueue)
```

### 物理引擎 (physics.ts)

独立的 2D 物理模块：

- **碰撞检测**：AABB 矩形碰撞、圆-圆碰撞
- **碰撞响应**：基于质量的分离和速度反弹
- **碰撞层/掩码**：控制哪些实体之间可以碰撞
- **触发器模式**：只检测重叠不产生物理响应

### 事件总线 (eventBus.ts)

发布-订阅模式的事件系统：

```typescript
EventBus.on(event, callback)   // 订阅
EventBus.off(event, callback)  // 取消订阅
EventBus.emit(event, data)     // 发布
```

预定义事件包括：碰撞进入、触发器进入、实体点击、实体销毁、对话结束等。

### 变量系统 (variableSystem.ts)

管理游戏运行时的数据存储：

- 全局变量（score, health 等）
- 实体变量（每个实体独立的 hp 等）
- 条件评估（支持 ==, !=, >, <, >=, <= 运算）

### 输入管理器 (inputManager.ts)

集中处理键盘和鼠标输入：

- 按键按下/释放状态
- `justPressed` / `justReleased` 边沿检测
- 鼠标位置（屏幕坐标和世界坐标）
- 点击检测
- 动作映射

### 节点图执行器 (nodeExecutor.ts)

将可视化节点图编译并执行：

```
编译阶段 (compileGraph):
  ReactFlow nodes/edges → CompiledGraph 数据结构

执行阶段 (executeGraph):
  1. 匹配触发节点 (start/update/click)
  2. 按连接遍历图
  3. 条件节点评估 → 决定走 true/false 分支
  4. 动作节点执行 → 修改运行时状态
```

---

## 渲染系统

### 场景编辑器 (useSceneCanvas)

- 使用 PixiJS 在编辑模式下渲染所有实体
- 支持实体选择、拖拽移动
- 选中实体显示边框高亮
- 自动缩放适配容器大小

### 预览画布 (usePreviewCanvas)

- 独立的 PixiJS Application 实例
- 播放模式下运行完整的 tickRuntime 循环
- 实时更新图形位置、缩放、旋转、透明度
- 支持动态生成/销毁实体的图形
- 覆盖层显示游戏结束/胜利信息

---

## 导出系统 (exporter.ts)

将编辑器项目导出为自包含的 HTML5 游戏文件：

1. 提取所有实体数据（组件、行为、位置、变量）
2. 序列化为 JSON 嵌入 HTML
3. 内嵌简化版运行时（PixiJS CDN + 游戏循环）
4. 生成的文件可独立运行，无需服务器

---

## 扩展指南

### 添加新的行为类型

1. 在 `src/types/index.ts` 的 `BehaviorType` 中添加新类型
2. 在 `BEHAVIOR_DEFAULTS` 中定义默认参数
3. 在 `src/engine/runtime.ts` 的 `processBehavior` 中添加 case 实现
4. 在 `PropertiesPanel.tsx` 的 `BEHAVIOR_LABELS` 和 `PARAM_LABELS` 中添加中文标签
5. 在 `src/utils/exporter.ts` 的导出逻辑中同步

### 添加新的实体预制件

1. 在 `src/engine/prefabs.ts` 中添加 `PrefabDefinition`
2. 指定类别、默认外观、默认行为
3. 在 `ComponentLibrary.tsx` 的 `ICON_MAP` 中添加图标映射

### 添加新的引擎系统

1. 在 `src/engine/` 中创建新模块
2. 在 `RuntimeState` 接口中添加状态字段
3. 在 `tickRuntime` 中集成系统调用
4. 在 `usePreviewCanvas.ts` 的 `resetRuntime` 中初始化
