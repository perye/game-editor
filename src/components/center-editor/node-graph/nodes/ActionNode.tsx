import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { LogicNodeData } from '@/store/useNodeGraphStore';

export function ActionNode({ data, selected }: NodeProps<Node<LogicNodeData>>) {
  return (
    <div
      className={`rounded-lg shadow-lg min-w-[150px] border ${
        selected ? 'border-success' : 'border-[#3a3a50]'
      }`}
      style={{ backgroundColor: '#2a2a3e' }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#4caf50', width: 8, height: 8 }} />
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[11px] font-semibold"
        style={{ backgroundColor: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}
      >
        <Play size={11} />
        Action
      </div>
      <div className="px-3 py-2">
        <div className="text-xs text-[#e4e4ef] font-medium">{data.label}</div>
        {data.description && (
          <div className="text-[10px] text-[#6a6a80] mt-0.5">{data.description}</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#4caf50', width: 8, height: 8 }} />
    </div>
  );
}
