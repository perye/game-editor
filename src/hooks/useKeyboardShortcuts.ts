import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { generateId } from '@/utils/id';
import type { Entity } from '@/types';

export function useKeyboardShortcuts() {
  const clipboardRef = useRef<Entity | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useHistoryStore.getState().undo();
        return;
      }

      if ((isCtrl && e.shiftKey && e.key === 'Z') || (isCtrl && e.key === 'y')) {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const { selectedEntityIds, removeSelectedEntities, selectedEntityId, removeEntity } = useEditorStore.getState();
        if (selectedEntityIds.length > 1) {
          useHistoryStore.getState().saveSnapshot();
          removeSelectedEntities();
        } else if (selectedEntityId) {
          useHistoryStore.getState().saveSnapshot();
          removeEntity(selectedEntityId);
        }
        return;
      }

      // Ctrl+C: Copy entity
      if (isCtrl && e.key === 'c' && !isInput) {
        const entity = useEditorStore.getState().getSelectedEntity();
        if (entity) {
          clipboardRef.current = JSON.parse(JSON.stringify(entity));
        }
        return;
      }

      // Ctrl+V: Paste entity
      if (isCtrl && e.key === 'v' && !isInput) {
        e.preventDefault();
        const source = clipboardRef.current;
        if (!source) return;
        useHistoryStore.getState().saveSnapshot();
        pasteEntity(source, 20, 20);
        return;
      }

      // Ctrl+D: Duplicate entity
      if (isCtrl && e.key === 'd') {
        e.preventDefault();
        const entity = useEditorStore.getState().getSelectedEntity();
        if (!entity) return;
        useHistoryStore.getState().saveSnapshot();
        pasteEntity(entity, 30, 30);
        return;
      }

      // Ctrl+S: Save to localStorage
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        const json = useEditorStore.getState().exportProject();
        try {
          localStorage.setItem('game-editor-save', json);
        } catch { /* full */ }
        return;
      }

      if (e.key === 'Escape') {
        useEditorStore.getState().selectEntity(null);
        return;
      }

      // Arrow keys: nudge selected entity
      if (!isInput && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const state = useEditorStore.getState();
        const entity = state.getSelectedEntity();
        if (!entity) return;
        e.preventDefault();
        const transform = entity.components.find(c => c.type === 'transform');
        if (!transform || transform.type !== 'transform') return;
        const step = e.shiftKey ? 10 : 1;
        let { x, y } = transform.data;
        if (e.key === 'ArrowUp') y -= step;
        if (e.key === 'ArrowDown') y += step;
        if (e.key === 'ArrowLeft') x -= step;
        if (e.key === 'ArrowRight') x += step;
        state.updateComponent(entity.id, {
          type: 'transform',
          data: { ...transform.data, x, y },
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

function pasteEntity(source: Entity, offsetX: number, offsetY: number) {
  const newId = generateId(source.type);
  const components = source.components.map(c => {
    if (c.type === 'transform') {
      return { ...c, data: { ...c.data, x: c.data.x + offsetX, y: c.data.y + offsetY } };
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
      project: {
        ...s.project,
        scenes: s.project.scenes.map(sc => sc.id === updatedScene.id ? updatedScene : sc),
      },
      selectedEntityId: newId,
      leftPanelTab: 'properties' as const,
    };
  });
}
