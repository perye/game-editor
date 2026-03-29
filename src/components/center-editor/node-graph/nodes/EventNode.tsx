import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { LogicNodeData } from '@/store/useNodeGraphStore';

export function EventNode({ data, selected }: NodeProps<Node<LogicNodeData>>) {
  return (
    <div
      className={`rounded-lg shadow-lg min-w-[150px] border ${
        selected ? 'border-warning' : 'border-[#3a3a50]'
      }`}
      style={{ backgroundColor: '#2a2a3e' }}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[11px] font-semibold"
        style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#ffc107' }}
      >
        <Zap size={11} />
        Event
      </div>
      <div className="px-3 py-2">
        <div className="text-xs text-[#e4e4ef] font-medium">{data.label}</div>
        {data.description && (
          <div className="text-[10px] text-[#6a6a80] mt-0.5">{data.description}</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#ffc107', width: 8, height: 8 }} />
    </div>
  );
}
