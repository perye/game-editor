import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, Clipboard, EyeOff as EyeOffIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { getPrefab } from '@/engine/prefabs';
import { showContextMenu, type MenuItem } from '@/components/shared/ContextMenu';
import { generateId } from '@/utils/id';
import type { Entity } from '@/types';

export function HierarchyPanel() {
  const scene = useEditorStore(s => s.project.scenes.find(sc => sc.id === s.project.activeSceneId) || s.project.scenes[0]);
  const selectedEntityId = useEditorStore(s => s.selectedEntityId);
  const selectedEntityIds = useEditorStore(s => s.selectedEntityIds);
  const selectEntity = useEditorStore(s => s.selectEntity);
  const removeEntity = useEditorStore(s => s.removeEntity);
  const toggleEntityVisibility = useEditorStore(s => s.toggleEntityVisibility);
  const toggleEntityLock = useEditorStore(s => s.toggleEntityLock);

  const entities = scene.rootEntities.map(id => scene.entities[id]).filter(Boolean);

  const handleContextMenu = (e: React.MouseEvent, entity: Entity) => {
    e.preventDefault();
    e.stopPropagation();
    selectEntity(entity.id);

    const idx = scene.rootEntities.indexOf(entity.id);

    const items: MenuItem[] = [
      { label: '复制', icon: <Copy size={12} />, shortcut: 'Ctrl+C', action: () => {
        (window as any).__gameEditorClipboard = JSON.parse(JSON.stringify(entity));
      }},
      { label: '粘贴', icon: <Clipboard size={12} />, shortcut: 'Ctrl+V',
        disabled: !(window as any).__gameEditorClipboard,
        action: () => {
          const source = (window as any).__gameEditorClipboard as Entity;
          if (!source) return;
          useHistoryStore.getState().saveSnapshot();
          pasteEntityFromClipboard(source);
        }},
      { label: '复制实体', icon: <Copy size={12} />, shortcut: 'Ctrl+D', action: () => {
        useHistoryStore.getState().saveSnapshot();
        pasteEntityFromClipboard(entity);
      }},
      { separator: true, label: '' },
      { label: entity.visible ? '隐藏' : '显示', icon: entity.visible ? <EyeOffIcon size={12} /> : <Eye size={12} />,
        action: () => toggleEntityVisibility(entity.id) },
      { label: entity.locked ? '解锁' : '锁定', icon: entity.locked ? <Unlock size={12} /> : <Lock size={12} />,
        action: () => toggleEntityLock(entity.id) },
      { separator: true, label: '' },
      { label: '上移一层', icon: <ArrowUp size={12} />, disabled: idx <= 0, action: () => moveEntity(entity.id, -1) },
      { label: '下移一层', icon: <ArrowDown size={12} />, disabled: idx >= scene.rootEntities.length - 1, action: () => moveEntity(entity.id, 1) },
      { separator: true, label: '' },
      { label: '删除', icon: <Trash2 size={12} />, shortcut: 'Del', danger: true, action: () => {
        useHistoryStore.getState().saveSnapshot();
        removeEntity(entity.id);
      }},
    ];

    showContextMenu(e.clientX, e.clientY, items);
  };

  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const items: MenuItem[] = [
      { label: '粘贴', icon: <Clipboard size={12} />, shortcut: 'Ctrl+V',
        disabled: !(window as any).__gameEditorClipboard,
        action: () => {
          const source = (window as any).__gameEditorClipboard as Entity;
          if (!source) return;
          useHistoryStore.getState().saveSnapshot();
          pasteEntityFromClipboard(source);
        }},
    ];
    showContextMenu(e.clientX, e.clientY, items);
  };

  if (entities.length === 0) {
    return (
      <div className="text-text-muted text-xs text-center py-8" onContextMenu={handleEmptyContextMenu}>
        场景中还没有实体<br />
        从「组件库」拖拽组件到场景中
      </div>
    );
  }

  return (
    <div className="space-y-0.5" onContextMenu={handleEmptyContextMenu}>
      {entities.map(entity => {
        const prefab = getPrefab(entity.type);
        const color = prefab?.defaultSprite.color || '#7c5cfc';
        const behaviorCount = entity.behaviors.length;
        return (
          <div key={entity.id}
            onClick={(e) => selectEntity(entity.id, e.ctrlKey || e.metaKey || e.shiftKey)}
            onContextMenu={(e) => handleContextMenu(e, entity)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all
              ${selectedEntityIds.includes(entity.id)
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
              <button onClick={(e) => { e.stopPropagation(); useHistoryStore.getState().saveSnapshot(); removeEntity(entity.id); }}
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

function moveEntity(entityId: string, direction: number) {
  useEditorStore.setState(s => {
    const scene = s.project.scenes.find(sc => sc.id === s.project.activeSceneId);
    if (!scene) return s;
    const arr = [...scene.rootEntities];
    const idx = arr.indexOf(entityId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return s;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    const updatedScene = { ...scene, rootEntities: arr };
    return {
      project: { ...s.project, scenes: s.project.scenes.map(sc => sc.id === updatedScene.id ? updatedScene : sc) },
    };
  });
}

function pasteEntityFromClipboard(source: Entity) {
  const newId = generateId(source.type);
  const components = source.components.map(c => {
    if (c.type === 'transform') {
      return { ...c, data: { ...c.data, x: c.data.x + 20, y: c.data.y + 20 } };
    }
    return { ...c, data: { ...c.data } };
  });

  const entity: Entity = {
    ...source,
    id: newId,
    name: `${source.name} 副本`,
    components,
    behaviors: source.behaviors.map(b => ({ ...b, params: { ...b.params } })),
    variables: source.variables.map(v => ({ ...v, id: generateId('var') })),
    children: [],
  };

  useEditorStore.setState(s => {
    const scene = s.project.scenes.find(sc => sc.id === s.project.activeSceneId);
    if (!scene) return s;
    const updatedScene = {
      ...scene,
      entities: { ...scene.entities, [newId]: entity },
      rootEntities: [...scene.rootEntities, newId],
    };
    return {
      project: { ...s.project, scenes: s.project.scenes.map(sc => sc.id === updatedScene.id ? updatedScene : sc) },
      selectedEntityId: newId,
      leftPanelTab: 'properties' as const,
    };
  });
}
