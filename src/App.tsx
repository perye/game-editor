import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { EditorLayout } from './components/layout/EditorLayout';
import { useEditorStore } from './store/useEditorStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ContextMenuProvider } from './components/shared/ContextMenu';
import type { EntityType } from './types';
import { getPrefab } from './engine/prefabs';

export default function App() {
  const addEntity = useEditorStore(s => s.addEntity);
  const saveSnapshot = useHistoryStore(s => s.saveSnapshot);
  const [activeItem, setActiveItem] = useState<{ type: EntityType; label: string } | null>(null);

  useKeyboardShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { type: EntityType; label: string } | undefined;
    if (data) setActiveItem(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    if (!event.over || event.over.id !== 'scene-canvas') return;

    const data = event.active.data.current as { type: EntityType; label: string } | undefined;
    if (!data) return;

    const settings = useEditorStore.getState().project.settings;
    let x = settings.width / 2;
    let y = settings.height / 2;

    const rect = event.over.rect;
    if (rect && event.activatorEvent instanceof PointerEvent) {
      const screenX = event.activatorEvent.clientX + (event.delta?.x ?? 0) - rect.left;
      const screenY = event.activatorEvent.clientY + (event.delta?.y ?? 0) - rect.top;
      const t = (window as any).__sceneTransform as { zoom: number; panX: number; panY: number } | undefined;
      if (t && t.zoom > 0) {
        x = Math.round((screenX - t.panX) / t.zoom);
        y = Math.round((screenY - t.panY) / t.zoom);
      } else {
        x = Math.round(screenX);
        y = Math.round(screenY);
      }
    }

    x = Math.max(0, Math.min(x, settings.width));
    y = Math.max(0, Math.min(y, settings.height));

    saveSnapshot();
    addEntity(data.type, x, y);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <EditorLayout />
      <DragOverlay>
        {activeItem && (
          <DragPreview type={activeItem.type} label={activeItem.label} />
        )}
      </DragOverlay>
      <ContextMenuProvider />
    </DndContext>
  );
}

function DragPreview({ type, label }: { type: EntityType; label: string }) {
  const prefab = getPrefab(type);
  const color = prefab?.defaultSprite.color || '#7c5cfc';
  return (
    <div
      className="flex items-center gap-2 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
      style={{ backgroundColor: color + 'dd' }}
    >
      {label}
    </div>
  );
}
