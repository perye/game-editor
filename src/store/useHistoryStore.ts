import { create } from 'zustand';
import type { GameProject } from '@/types';
import { useEditorStore } from './useEditorStore';

interface HistoryState {
  past: string[];
  future: string[];
  maxHistory: number;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  saveSnapshot: () => {
    const project = useEditorStore.getState().project;
    const snapshot = JSON.stringify(project);
    set(state => ({
      past: [...state.past.slice(-state.maxHistory), snapshot],
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const currentSnapshot = JSON.stringify(useEditorStore.getState().project);
    const previousSnapshot = past[past.length - 1];

    set(state => ({
      past: state.past.slice(0, -1),
      future: [currentSnapshot, ...state.future],
    }));

    const project = JSON.parse(previousSnapshot) as GameProject;
    useEditorStore.setState({ project });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const currentSnapshot = JSON.stringify(useEditorStore.getState().project);
    const nextSnapshot = future[0];

    set(state => ({
      past: [...state.past, currentSnapshot],
      future: state.future.slice(1),
    }));

    const project = JSON.parse(nextSnapshot) as GameProject;
    useEditorStore.setState({ project });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
