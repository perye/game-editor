import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+Z: Undo
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useHistoryStore.getState().undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((isCtrl && e.shiftKey && e.key === 'Z') || (isCtrl && e.key === 'y')) {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      // Delete or Backspace: Remove selected entity
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        const { selectedEntityId, removeEntity } = useEditorStore.getState();
        if (selectedEntityId) {
          useHistoryStore.getState().saveSnapshot();
          removeEntity(selectedEntityId);
        }
        return;
      }

      // Ctrl+D: Duplicate
      if (isCtrl && e.key === 'd') {
        e.preventDefault();
        const state = useEditorStore.getState();
        const entity = state.getSelectedEntity();
        if (!entity) return;
        useHistoryStore.getState().saveSnapshot();
        state.addEntity(entity.type);
        return;
      }

      // Ctrl+S: Save/Export
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        const json = useEditorStore.getState().exportProject();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${useEditorStore.getState().project.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        useEditorStore.getState().selectEntity(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
