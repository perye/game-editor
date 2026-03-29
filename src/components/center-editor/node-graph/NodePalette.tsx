import { Zap, GitBranch, Play, Database } from 'lucide-react';
import type { LogicNodeData } from '@/store/useNodeGraphStore';

interface NodeTemplate {
  type: string;
  data: LogicNodeData;
  icon: React.ReactNode;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  // Events
  { type: 'eventNode', data: { label: '游戏开始', category: 'event', description: '游戏启动时触发' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '每帧更新', category: 'event', description: '每帧执行一次' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '点击事件', category: 'event', description: '鼠标点击时触发' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '碰撞发生', category: 'event', description: '实体碰撞时触发' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '按键按下', category: 'event', description: '键盘按下时触发' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '变量变化', category: 'event', description: '变量改变时触发' }, icon: <Zap size={12} /> },
  { type: 'eventNode', data: { label: '定时器到期', category: 'event', description: '定时器结束时触发' }, icon: <Zap size={12} /> },

  // Conditions
  { type: 'conditionNode', data: { label: '条件判断', category: 'condition', description: '如果/否则分支', params: { variable: 'score', operator: '>=', value: 10 } }, icon: <GitBranch size={12} /> },
  { type: 'conditionNode', data: { label: '数值比较', category: 'condition', description: '比较变量与数值', params: { variable: 'health', operator: '>', value: 0 } }, icon: <GitBranch size={12} /> },
  { type: 'conditionNode', data: { label: '按键检测', category: 'condition', description: '检测按键是否按下', params: { key: ' ' } }, icon: <GitBranch size={12} /> },

  // Actions
  { type: 'actionNode', data: { label: '设置变量', category: 'action', description: '设置变量的值', params: { variable: 'score', value: 0 } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '增加变量', category: 'action', description: '增加变量的值', params: { variable: 'score', amount: 1 } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '设置位置', category: 'action', description: '移动实体位置', params: { entityType: 'player', x: 400, y: 300 } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '施加力', category: 'action', description: '给实体施加力', params: { entityType: 'player', forceX: 0, forceY: -10 } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '显示/隐藏', category: 'action', description: '控制实体可见性', params: { entityType: '', visible: true } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '销毁实体', category: 'action', description: '移除实体', params: { entityType: '' } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '生成实体', category: 'action', description: '在指定位置创建实体', params: { entityType: 'coin', x: 400, y: 300 } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '显示对话', category: 'action', description: '显示覆盖文字', params: { message: '你好！' } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '游戏胜利', category: 'action', description: '触发胜利', params: { message: '恭喜通关！' } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '游戏失败', category: 'action', description: '触发失败', params: { message: '游戏结束' } }, icon: <Play size={12} /> },
  { type: 'actionNode', data: { label: '打印日志', category: 'action', description: '输出到控制台', params: { message: 'Hello' } }, icon: <Play size={12} /> },

  // Variables (displayed as data nodes)
  { type: 'actionNode', data: { label: '读取变量', category: 'variable', description: '获取变量的值', params: { variable: 'score' } }, icon: <Database size={12} /> },
];

const CATEGORY_COLORS: Record<string, string> = {
  event: 'text-warning',
  condition: 'text-blue-400',
  action: 'text-success',
  variable: 'text-accent',
};
const CATEGORY_LABELS: Record<string, string> = {
  event: '事件',
  condition: '条件',
  action: '动作',
  variable: '数据',
};

interface NodePaletteProps { onAddNode: (template: { type: string; data: LogicNodeData }) => void; }

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const grouped = NODE_TEMPLATES.reduce<Record<string, NodeTemplate[]>>((acc, t) => {
    const cat = t.data.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="w-44 bg-panel border-r border-panel-border overflow-y-auto shrink-0">
      <div className="px-2 py-2 text-xs text-text-secondary font-medium border-b border-panel-border">
        节点库
        <span className="text-[9px] text-text-muted ml-1">可执行</span>
      </div>
      {(['event', 'condition', 'action', 'variable'] as const).map(category => {
        const templates = grouped[category];
        if (!templates) return null;
        return (
          <div key={category} className="p-1.5">
            <div className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 mb-1 ${CATEGORY_COLORS[category] || 'text-text-muted'}`}>
              {CATEGORY_LABELS[category] || category}
            </div>
            {templates.map((t, i) => (
              <button key={`${t.data.label}-${i}`} onClick={() => onAddNode({ type: t.type, data: { ...t.data, params: { ...(t.data.params || {}) } } })}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left">
                <span className={CATEGORY_COLORS[category]}>{t.icon}</span>
                {t.data.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
