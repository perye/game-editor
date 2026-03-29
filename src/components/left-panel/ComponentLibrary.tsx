import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  User, Ghost, MessageCircle,
  CircleDollarSign, Diamond, Heart, Key, Zap,
  Minus, Square, Triangle, Flame, MoveHorizontal,
  Trophy, HeartPulse, Clock, Type, MousePointerClick, BarChart, MessageSquare,
  Flag, Skull, Bookmark, PackagePlus, Target,
  Circle, ChevronDown, ChevronRight, Search,
  Box, Crosshair, ToggleLeft,
  Factory, ArrowUpCircle, CreditCard, Layers, SquareDashedBottomCode,
  MessageSquareText, List, UserCircle,
} from 'lucide-react';
import type { PrefabDefinition, PrefabCategory } from '@/types';
import { PREFABS } from '@/engine/prefabs';

const ICON_MAP: Record<string, React.ReactNode> = {
  'user': <User size={16} />, 'ghost': <Ghost size={16} />, 'message-circle': <MessageCircle size={16} />,
  'circle-dollar-sign': <CircleDollarSign size={16} />, 'diamond': <Diamond size={16} />,
  'heart': <Heart size={16} />, 'key': <Key size={16} />, 'zap': <Zap size={16} />,
  'minus': <Minus size={16} />, 'square': <Square size={16} />, 'triangle': <Triangle size={16} />,
  'flame': <Flame size={16} />, 'trophy': <Trophy size={16} />, 'heart-pulse': <HeartPulse size={16} />,
  'clock': <Clock size={16} />, 'type': <Type size={16} />, 'flag': <Flag size={16} />,
  'skull': <Skull size={16} />, 'bookmark': <Bookmark size={16} />, 'package-plus': <PackagePlus size={16} />,
  'circle': <Circle size={16} />, 'target': <Target size={16} />,
  'move-horizontal': <MoveHorizontal size={16} />,
  'mouse-pointer-click': <MousePointerClick size={16} />,
  'bar-chart': <BarChart size={16} />,
  'message-square': <MessageSquare size={16} />,
  'box': <Box size={16} />,
  'crosshair': <Crosshair size={16} />,
  'toggle-left': <ToggleLeft size={16} />,
  'factory': <Factory size={16} />,
  'arrow-up-circle': <ArrowUpCircle size={16} />,
  'credit-card': <CreditCard size={16} />,
  'layers': <Layers size={16} />,
  'square-dashed-bottom-code': <SquareDashedBottomCode size={16} />,
  'message-square-text': <MessageSquareText size={16} />,
  'list': <List size={16} />,
  'user-circle': <UserCircle size={16} />,
};

const CATEGORY_META: Record<PrefabCategory, { label: string; color: string }> = {
  characters:    { label: '角色', color: 'text-blue-400' },
  items:         { label: '物品 & 道具', color: 'text-yellow-400' },
  terrain:       { label: '地形 & 障碍', color: 'text-gray-400' },
  ui:            { label: '界面元素', color: 'text-green-400' },
  zones:         { label: '区域 & 触发器', color: 'text-purple-400' },
  shooter:       { label: '射击类', color: 'text-red-400' },
  puzzle:        { label: '解谜类', color: 'text-emerald-400' },
  clicker:       { label: '点击放置类', color: 'text-orange-400' },
  card:          { label: '卡牌类', color: 'text-amber-400' },
  'visual-novel': { label: '视觉小说类', color: 'text-pink-400' },
  basic:         { label: '基础形状', color: 'text-text-muted' },
};

const CATEGORY_ORDER: PrefabCategory[] = [
  'characters', 'items', 'terrain', 'ui', 'zones',
  'shooter', 'puzzle', 'clicker', 'card', 'visual-novel',
  'basic',
];

export function ComponentLibrary() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    basic: true, shooter: true, puzzle: true, clicker: true, card: true, 'visual-novel': true,
  });

  const filtered = search
    ? PREFABS.filter(p => p.label.includes(search) || p.description.includes(search))
    : PREFABS;

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: filtered.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-1">
      <div className="relative mb-2">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="搜索组件..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-7 text-xs" />
      </div>
      <p className="text-text-muted text-[10px] px-1 mb-1">将组件拖拽到中间场景即可添加</p>

      {grouped.map(({ category, items }) => {
        const meta = CATEGORY_META[category];
        const isCollapsed = collapsed[category];
        return (
          <div key={category}>
            <button onClick={() => setCollapsed(c => ({ ...c, [category]: !c[category] }))}
              className={`flex items-center gap-1.5 w-full px-1 py-1 text-[11px] font-semibold uppercase tracking-wider ${meta.color} hover:opacity-80`}>
              {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
              {meta.label}
              <span className="text-text-muted font-normal ml-auto">{items.length}</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5 mb-2">
                {items.map(item => <DraggableComponent key={item.type} item={item} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DraggableComponent({ item }: { item: PrefabDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${item.type}`,
    data: { type: item.type, label: item.label },
  });
  const behaviorCount = item.defaultBehaviors.length;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing
        border transition-all duration-150
        ${isDragging
          ? 'opacity-60 border-accent bg-accent/10 shadow-lg scale-95'
          : 'border-transparent hover:border-panel-border hover:bg-surface-hover hover:shadow-sm'}`}>
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
        style={{ backgroundColor: item.defaultSprite.color + '20', color: item.defaultSprite.color }}>
        {ICON_MAP[item.icon] || <Square size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-text-primary font-medium flex items-center gap-1.5">
          {item.label}
          {behaviorCount > 0 && (
            <span className="text-[8px] bg-accent/10 text-accent/80 px-1.5 py-0.5 rounded-md font-semibold">
              {behaviorCount}
            </span>
          )}
        </div>
        <div className="text-[10px] text-text-muted truncate leading-relaxed">{item.description}</div>
      </div>
    </div>
  );
}
