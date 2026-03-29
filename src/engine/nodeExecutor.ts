import type { RuntimeState } from './runtime';

export interface NodeDef {
  id: string;
  type: string;
  label: string;
  category: 'event' | 'condition' | 'action' | 'variable';
  params: Record<string, string | number | boolean>;
}

export interface EdgeDef {
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface CompiledGraph {
  nodes: Map<string, NodeDef>;
  adjacency: Map<string, string[]>;
  conditionTrue: Map<string, string[]>;
  conditionFalse: Map<string, string[]>;
}

export function compileGraph(
  nodes: Array<{ id: string; data: { label: string; category: string; description?: string; params?: Record<string, string | number | boolean> } }>,
  edges: Array<{ source: string; target: string; sourceHandle?: string | null }>
): CompiledGraph {
  const nodeMap = new Map<string, NodeDef>();
  const adjacency = new Map<string, string[]>();
  const conditionTrue = new Map<string, string[]>();
  const conditionFalse = new Map<string, string[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, {
      id: n.id,
      type: n.data.label,
      label: n.data.label,
      category: n.data.category as NodeDef['category'],
      params: n.data.params || {},
    });
    adjacency.set(n.id, []);
    conditionTrue.set(n.id, []);
    conditionFalse.set(n.id, []);
  }

  for (const e of edges) {
    if (e.sourceHandle === 'false') {
      conditionFalse.get(e.source)?.push(e.target);
    } else if (e.sourceHandle === 'true') {
      conditionTrue.get(e.source)?.push(e.target);
    } else {
      adjacency.get(e.source)?.push(e.target);
    }
  }

  return { nodes: nodeMap, adjacency, conditionTrue, conditionFalse };
}

export function executeGraph(graph: CompiledGraph, trigger: string, state: RuntimeState): void {
  const eventNodes: string[] = [];
  for (const [id, node] of graph.nodes) {
    if (node.category === 'event' && matchTrigger(node, trigger)) {
      eventNodes.push(id);
    }
  }

  for (const startId of eventNodes) {
    executeFromNode(graph, startId, state, new Set());
  }
}

function matchTrigger(node: NodeDef, trigger: string): boolean {
  const label = node.label;
  switch (trigger) {
    case 'start': return label === '游戏开始';
    case 'update': return label === '每帧更新';
    case 'click': return label === '点击事件';
    case 'collision': return label === '碰撞发生';
    case 'key-press': return label === '按键按下';
    case 'variable-change': return label === '变量变化';
    case 'timer': return label === '定时器到期';
    default: return false;
  }
}

function executeFromNode(graph: CompiledGraph, nodeId: string, state: RuntimeState, visited: Set<string>) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = graph.nodes.get(nodeId);
  if (!node) return;

  if (node.category === 'condition') {
    const result = evaluateCondition(node, state);
    const targets = result
      ? graph.conditionTrue.get(nodeId) || []
      : graph.conditionFalse.get(nodeId) || [];

    // Also follow default adjacency
    const defaults = graph.adjacency.get(nodeId) || [];
    const allTargets = [...targets, ...defaults];

    for (const next of allTargets) {
      executeFromNode(graph, next, state, visited);
    }
  } else {
    if (node.category === 'action') {
      executeAction(node, state);
    }

    const next = graph.adjacency.get(nodeId) || [];
    for (const n of next) {
      executeFromNode(graph, n, state, visited);
    }
  }
}

function evaluateCondition(node: NodeDef, state: RuntimeState): boolean {
  const label = node.label;
  const p = node.params;

  switch (label) {
    case '条件判断': {
      const varName = (p.variable as string) || 'score';
      const op = (p.operator as string) || '>=';
      const val = (p.value as number) || 0;
      return state.variables.evaluate(varName, op, val);
    }
    case '数值比较': {
      const varName = (p.variable as string) || 'score';
      const op = (p.operator as string) || '>';
      const val = (p.value as number) || 0;
      return state.variables.evaluate(varName, op, val);
    }
    case '按键检测': {
      const key = (p.key as string) || ' ';
      return state.keys.has(key);
    }
    default:
      return true;
  }
}

function executeAction(node: NodeDef, state: RuntimeState): void {
  const label = node.label;
  const p = node.params;

  switch (label) {
    case '设置变量': {
      const name = (p.variable as string) || 'score';
      const val = p.value ?? 0;
      state.variables.setGlobal(name, val);
      syncGameState(state, name);
      break;
    }
    case '增加变量': {
      const name = (p.variable as string) || 'score';
      const amount = (p.amount as number) || 1;
      const cur = state.variables.getGlobal(name);
      if (typeof cur === 'number') {
        state.variables.setGlobal(name, cur + amount);
        syncGameState(state, name);
      }
      break;
    }
    case '设置位置': {
      const entityType = (p.entityType as string) || 'player';
      for (const e of state.entities.values()) {
        if (e.type === entityType && e.alive) {
          e.x = (p.x as number) || 0;
          e.y = (p.y as number) || 0;
          break;
        }
      }
      break;
    }
    case '施加力': {
      const entityType = (p.entityType as string) || 'player';
      for (const e of state.entities.values()) {
        if (e.type === entityType && e.alive && e.rigidBody) {
          e.rigidBody.velocityX += (p.forceX as number) || 0;
          e.rigidBody.velocityY += (p.forceY as number) || 0;
          break;
        }
      }
      break;
    }
    case '显示/隐藏': {
      const entityType = (p.entityType as string) || '';
      const visible = p.visible !== false;
      for (const e of state.entities.values()) {
        if (e.type === entityType) e.visible = visible;
      }
      break;
    }
    case '销毁实体': {
      const entityType = (p.entityType as string) || '';
      for (const e of state.entities.values()) {
        if (e.type === entityType && e.alive) {
          state.removeQueue.push(e.id);
          break;
        }
      }
      break;
    }
    case '生成实体': {
      const eType = (p.entityType as string) || 'coin';
      const x = (p.x as number) || 400;
      const y = (p.y as number) || 300;
      state.spawnQueue.push({ type: eType, x, y });
      break;
    }
    case '切换场景': {
      break;
    }
    case '显示对话': {
      state.overlay = (p.message as string) || '';
      break;
    }
    case '打印日志': {
      console.log('[NodeGraph]', p.message || node.label);
      break;
    }
    case '游戏胜利': {
      state.gameState.isWin = true;
      state.overlay = (p.message as string) || '恭喜通关！';
      break;
    }
    case '游戏失败': {
      state.gameState.isLose = true;
      state.overlay = (p.message as string) || '游戏结束';
      break;
    }
  }
}

function syncGameState(state: RuntimeState, varName: string) {
  const val = state.variables.getGlobal(varName);
  if (typeof val !== 'number') return;
  if (varName === 'score') state.gameState.score = val;
  if (varName === 'health') state.gameState.health = val;
}
