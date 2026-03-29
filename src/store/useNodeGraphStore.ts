import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

export interface LogicNodeData {
  label: string;
  category: 'event' | 'condition' | 'action' | 'variable';
  description?: string;
  params?: Record<string, string | number | boolean>;
  [key: string]: unknown;
}

const initialNodes: Node<LogicNodeData>[] = [
  {
    id: 'event-start',
    type: 'eventNode',
    position: { x: 50, y: 200 },
    data: { label: '游戏开始', category: 'event', description: '游戏启动时触发' },
  },
  {
    id: 'action-log',
    type: 'actionNode',
    position: { x: 400, y: 200 },
    data: { label: '打印日志', category: 'action', description: '输出到控制台', params: { message: '游戏开始！' } },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-start-log', source: 'event-start', target: 'action-log', animated: true },
];

interface NodeGraphState {
  nodes: Node<LogicNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<LogicNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node<LogicNodeData>) => void;
  removeNode: (id: string) => void;
  updateNodeParams: (nodeId: string, params: Record<string, string | number | boolean>) => void;
}

export const useNodeGraphStore = create<NodeGraphState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge({ ...connection, animated: true }, get().edges) });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      edges: get().edges.filter(e => e.source !== id && e.target !== id),
    });
  },

  updateNodeParams: (nodeId, params) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, params: { ...(n.data.params || {}), ...params } } } : n
      ),
    });
  },
}));
