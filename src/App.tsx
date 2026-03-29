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
import type { EntityType } from './types';
import { getPrefab } from './engine/prefabs';

export default function App() {
  const addEntity = useEditorStore(s => s.addEntity);
  const saveSnapshot = useHistoryStore(s => s.saveSnapshot);
  const [activeItem, setActiveItem] = useState<{ type: EntityType; label: string } | null>(null);

  useKeyboardShortcuts();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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

    const rect = event.over.rect;
    let x = 200, y = 200;
    if (rect && event.activatorEvent instanceof PointerEvent) {
      x = Math.round(event.activatorEvent.clientX + event.delta.x - rect.left);
      y = Math.round(event.activatorEvent.clientY + event.delta.y - rect.top);
    }

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
