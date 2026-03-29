import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Columns3, Rows3,
} from 'lucide-react';
import type { Entity, ComponentData } from '@/types';

type TransformComponent = Extract<ComponentData, { type: 'transform' }>;

function getTransform(entity: Entity): TransformComponent | undefined {
  return entity.components.find(c => c.type === 'transform') as TransformComponent | undefined;
}

function getSize(entity: Entity): { w: number; h: number } {
  const sprite = entity.components.find(c => c.type === 'sprite') as Extract<ComponentData, { type: 'sprite' }> | undefined;
  return { w: sprite?.data.width ?? 80, h: sprite?.data.height ?? 80 };
}

export function AlignmentToolbar() {
  const selectedIds = useEditorStore(s => s.selectedEntityIds);
  const scene = useEditorStore(s => s.project.scenes.find(sc => sc.id === s.project.activeSceneId) || s.project.scenes[0]);

  if (selectedIds.length < 2) return null;

  const entities = selectedIds.map(id => scene.entities[id]).filter(Boolean);
  if (entities.length < 2) return null;

  const align = (mode: string) => {
    useHistoryStore.getState().saveSnapshot();
    const transforms = entities.map(e => ({ entity: e, t: getTransform(e)!, s: getSize(e) })).filter(x => x.t);

    let updateFn: (t: TransformComponent['data'], s: { w: number; h: number }) => TransformComponent['data'];

    switch (mode) {
      case 'left': {
        const minX = Math.min(...transforms.map(x => x.t.data.x - x.s.w / 2));
        updateFn = (d, s) => ({ ...d, x: minX + s.w / 2 });
        break;
      }
      case 'center-h': {
        const avgX = transforms.reduce((sum, x) => sum + x.t.data.x, 0) / transforms.length;
        updateFn = (d) => ({ ...d, x: Math.round(avgX) });
        break;
      }
      case 'right': {
        const maxX = Math.max(...transforms.map(x => x.t.data.x + x.s.w / 2));
        updateFn = (d, s) => ({ ...d, x: maxX - s.w / 2 });
        break;
      }
      case 'top': {
        const minY = Math.min(...transforms.map(x => x.t.data.y - x.s.h / 2));
        updateFn = (d, s) => ({ ...d, y: minY + s.h / 2 });
        break;
      }
      case 'center-v': {
        const avgY = transforms.reduce((sum, x) => sum + x.t.data.y, 0) / transforms.length;
        updateFn = (d) => ({ ...d, y: Math.round(avgY) });
        break;
      }
      case 'bottom': {
        const maxY = Math.max(...transforms.map(x => x.t.data.y + x.s.h / 2));
        updateFn = (d, s) => ({ ...d, y: maxY - s.h / 2 });
        break;
      }
      case 'distribute-h': {
        const sorted = [...transforms].sort((a, b) => a.t.data.x - b.t.data.x);
        const minX = sorted[0].t.data.x;
        const maxX = sorted[sorted.length - 1].t.data.x;
        const step = (maxX - minX) / (sorted.length - 1);
        sorted.forEach((item, i) => {
          useEditorStore.getState().updateComponent(item.entity.id, {
            type: 'transform', data: { ...item.t.data, x: Math.round(minX + step * i) },
          });
        });
        return;
      }
      case 'distribute-v': {
        const sorted = [...transforms].sort((a, b) => a.t.data.y - b.t.data.y);
        const minY = sorted[0].t.data.y;
        const maxY = sorted[sorted.length - 1].t.data.y;
        const step = (maxY - minY) / (sorted.length - 1);
        sorted.forEach((item, i) => {
          useEditorStore.getState().updateComponent(item.entity.id, {
            type: 'transform', data: { ...item.t.data, y: Math.round(minY + step * i) },
          });
        });
        return;
      }
      default: return;
    }

    for (const item of transforms) {
      useEditorStore.getState().updateComponent(item.entity.id, {
        type: 'transform', data: updateFn(item.t.data, item.s),
      });
    }
  };

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-panel/90 backdrop-blur-sm rounded-lg border border-panel-border/60 px-1 py-0.5 shadow-lg z-10">
      <span className="text-[10px] text-text-muted px-1.5 select-none">
        已选 {selectedIds.length} 个
      </span>
      <div className="w-px h-4 bg-panel-border/50 mx-0.5" />
      <AlignBtn icon={<AlignStartVertical size={13} />} tip="左对齐" onClick={() => align('left')} />
      <AlignBtn icon={<AlignCenterVertical size={13} />} tip="水平居中" onClick={() => align('center-h')} />
      <AlignBtn icon={<AlignEndVertical size={13} />} tip="右对齐" onClick={() => align('right')} />
      <div className="w-px h-4 bg-panel-border/50 mx-0.5" />
      <AlignBtn icon={<AlignStartHorizontal size={13} />} tip="顶对齐" onClick={() => align('top')} />
      <AlignBtn icon={<AlignCenterHorizontal size={13} />} tip="垂直居中" onClick={() => align('center-v')} />
      <AlignBtn icon={<AlignEndHorizontal size={13} />} tip="底对齐" onClick={() => align('bottom')} />
      <div className="w-px h-4 bg-panel-border/50 mx-0.5" />
      <AlignBtn icon={<Columns3 size={13} />} tip="水平等距" onClick={() => align('distribute-h')} />
      <AlignBtn icon={<Rows3 size={13} />} tip="垂直等距" onClick={() => align('distribute-v')} />
    </div>
  );
}

function AlignBtn({ icon, tip, onClick }: { icon: React.ReactNode; tip: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={tip}
      className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-all active:scale-90">
      {icon}
    </button>
  );
}
