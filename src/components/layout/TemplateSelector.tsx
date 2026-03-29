import { useState } from 'react';
import { X, Gamepad2, Crosshair, Puzzle, MousePointerClick, Spade, BookOpen } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { createDemoProject } from '@/engine/demoProject';
import { createShooterTemplate } from '@/engine/templates/shooterTemplate';
import { createPuzzleTemplate } from '@/engine/templates/puzzleTemplate';
import { createClickerTemplate } from '@/engine/templates/clickerTemplate';
import { createCardTemplate } from '@/engine/templates/cardTemplate';
import { createVisualNovelTemplate } from '@/engine/templates/visualNovelTemplate';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  create: () => ReturnType<typeof createDemoProject>;
}

const TEMPLATES: Template[] = [
  {
    id: 'platformer',
    name: '平台跳跃',
    description: '经典横版跳跃，含金币、敌人、平台、胜利区',
    icon: <Gamepad2 size={28} />,
    color: '#4fc3f7',
    create: createDemoProject,
  },
  {
    id: 'shooter',
    name: '太空射击',
    description: '射击敌机，子弹发射，刷怪系统，得分统计',
    icon: <Crosshair size={28} />,
    color: '#ef5350',
    create: createShooterTemplate,
  },
  {
    id: 'puzzle',
    name: '解谜拼图',
    description: '拖拽方块到目标区域，开关机关，条件触发',
    icon: <Puzzle size={28} />,
    color: '#66bb6a',
    create: createPuzzleTemplate,
  },
  {
    id: 'clicker',
    name: '点击大亨',
    description: '点击获取资源，自动生产器，升级系统',
    icon: <MousePointerClick size={28} />,
    color: '#ff9800',
    create: createClickerTemplate,
  },
  {
    id: 'card',
    name: '卡牌对战',
    description: '手牌拖拽，牌堆抽牌，卡槽系统，回合制',
    icon: <Spade size={28} />,
    color: '#ffd54f',
    create: createCardTemplate,
  },
  {
    id: 'visual-novel',
    name: '视觉小说',
    description: '逐字对话，角色立绘，分支选项，剧情变量',
    icon: <BookOpen size={28} />,
    color: '#ce93d8',
    create: createVisualNovelTemplate,
  },
];

export function TemplateSelector({ onClose }: { onClose: () => void }) {
  const loadTemplate = useEditorStore(s => s.loadTemplate);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (template: Template) => {
    loadTemplate(template.create());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-panel rounded-xl border border-panel-border shadow-2xl w-[680px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-panel-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">新建项目</h2>
            <p className="text-xs text-text-muted mt-0.5">选择一个模板快速开始</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`text-left rounded-lg border p-4 transition-all duration-200 ${
                  hoveredId === t.id
                    ? 'border-accent bg-accent-muted shadow-lg scale-[1.02]'
                    : 'border-panel-border bg-surface hover:border-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: t.color + '20', color: t.color }}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary">{t.name}</h3>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{t.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-panel-border text-[10px] text-text-muted text-center">
          选择模板后会替换当前项目 · 记得先导出保存
        </div>
      </div>
    </div>
  );
}
