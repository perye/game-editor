import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNodeGraphStore, type LogicNodeData } from '@/store/useNodeGraphStore';
import { EventNode } from './nodes/EventNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { NodePalette } from './NodePalette';
import { generateId } from '@/utils/id';

const nodeTypes = {
  eventNode: EventNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
};

export function NodeGraphEditor() {
  const nodes = useNodeGraphStore(s => s.nodes);
  const edges = useNodeGraphStore(s => s.edges);
  const onNodesChange = useNodeGraphStore(s => s.onNodesChange);
  const onEdgesChange = useNodeGraphStore(s => s.onEdgesChange);
  const onConnect = useNodeGraphStore(s => s.onConnect);
  const addNode = useNodeGraphStore(s => s.addNode);

  const handleAddNode = useCallback(
    (template: { type: string; data: LogicNodeData }) => {
      const newNode: Node<LogicNodeData> = {
        id: generateId('node'),
        type: template.type,
        position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 },
        data: { ...template.data },
      };
      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div className="w-full h-full flex">
      <NodePalette onAddNode={handleAddNode} />
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true, style: { stroke: '#7c5cfc', strokeWidth: 2 } }}
          style={{ backgroundColor: '#12121e' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a3e" />
          <Controls
            showInteractive={false}
            style={{ backgroundColor: '#1e1e2e', borderColor: '#3a3a50', borderRadius: 8 }}
          />
          <MiniMap
            nodeColor={(n) => {
              const data = n.data as LogicNodeData;
              if (data.category === 'event') return '#ffc107';
              if (data.category === 'condition') return '#2196f3';
              if (data.category === 'action') return '#4caf50';
              return '#7c5cfc';
            }}
            maskColor="rgba(0,0,0,0.6)"
            style={{ backgroundColor: '#1e1e2e', borderColor: '#3a3a50', borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
