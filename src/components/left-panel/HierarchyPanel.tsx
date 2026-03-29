import { useEditorStore } from '@/store/useEditorStore';
import { Eye, EyeOff, Lock, Unlock, Trash2 } from 'lucide-react';
import { getPrefab } from '@/engine/prefabs';

export function HierarchyPanel() {
  const scene = useEditorStore(s => s.getActiveScene());
  const selectedEntityId = useEditorStore(s => s.selectedEntityId);
  const selectEntity = useEditorStore(s => s.selectEntity);
  const removeEntity = useEditorStore(s => s.removeEntity);
  const toggleEntityVisibility = useEditorStore(s => s.toggleEntityVisibility);
  const toggleEntityLock = useEditorStore(s => s.toggleEntityLock);

  const entities = scene.rootEntities.map(id => scene.entities[id]).filter(Boolean);

  if (entities.length === 0) {
    return (
      <div className="text-text-muted text-xs text-center py-8">
        场景中还没有实体<br />
        从「组件库」拖拽组件到场景中
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {entities.map(entity => {
        const prefab = getPrefab(entity.type);
        const color = prefab?.defaultSprite.color || '#7c5cfc';
        const behaviorCount = entity.behaviors.length;
        return (
          <div key={entity.id} onClick={() => selectEntity(entity.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all
              ${selectedEntityId === entity.id
                ? 'bg-accent/10 text-accent border border-accent/20 shadow-sm'
                : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-transparent'}`}>
            <span className="w-2.5 h-2.5 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="flex-1 text-[11px] truncate font-medium">{entity.name}</span>
            {behaviorCount > 0 && <span className="text-[9px] bg-accent/10 text-accent/80 px-1.5 py-0.5 rounded-md shrink-0 font-medium">{behaviorCount}</span>}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); toggleEntityVisibility(entity.id); }}
                className="p-1 rounded-md hover:bg-panel-border transition-colors">
                {entity.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleEntityLock(entity.id); }}
                className="p-1 rounded-md hover:bg-panel-border transition-colors">
                {entity.locked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }}
                className="p-1 rounded-md hover:bg-danger/15 text-text-muted hover:text-danger transition-colors">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
