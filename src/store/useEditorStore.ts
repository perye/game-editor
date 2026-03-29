import { create } from 'zustand';
import type { Entity, Scene, GameProject, GameSettings, EntityType, ComponentData, BehaviorConfig, GameState, GameVariable, AssetItem } from '@/types';
import { getPrefab } from '@/engine/prefabs';
import { generateId } from '@/utils/id';
import { createDemoProject } from '@/engine/demoProject';

interface EditorState {
  project: GameProject;
  selectedEntityId: string | null;
  editorTab: 'scene' | 'node-graph' | 'code' | 'animation';
  leftPanelTab: 'components' | 'hierarchy' | 'properties';
  isPlaying: boolean;

  getActiveScene: () => Scene;
  getEntity: (id: string) => Entity | undefined;
  getSelectedEntity: () => Entity | undefined;

  addEntity: (type: EntityType, x?: number, y?: number) => void;
  removeEntity: (id: string) => void;
  selectEntity: (id: string | null) => void;
  updateEntityName: (id: string, name: string) => void;
  updateComponent: (entityId: string, component: ComponentData) => void;
  updateBehavior: (entityId: string, index: number, behavior: BehaviorConfig) => void;
  addBehavior: (entityId: string, behavior: BehaviorConfig) => void;
  removeBehavior: (entityId: string, index: number) => void;
  toggleEntityVisibility: (id: string) => void;
  toggleEntityLock: (id: string) => void;

  addEntityVariable: (entityId: string, variable: GameVariable) => void;
  updateEntityVariable: (entityId: string, varId: string, value: GameVariable) => void;
  removeEntityVariable: (entityId: string, varId: string) => void;

  addGlobalVariable: (variable: GameVariable) => void;
  updateGlobalVariable: (varId: string, value: GameVariable) => void;
  removeGlobalVariable: (varId: string) => void;

  addAsset: (asset: AssetItem) => void;
  removeAsset: (assetId: string) => void;

  setEditorTab: (tab: 'scene' | 'node-graph' | 'code' | 'animation') => void;
  setLeftPanelTab: (tab: 'components' | 'hierarchy' | 'properties') => void;
  setPlaying: (playing: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  updateGameState: (state: Partial<GameState>) => void;

  loadTemplate: (project: GameProject) => void;
  exportProject: () => string;
  importProject: (json: string) => void;
}

function modifyScene(state: EditorState, fn: (scene: Scene, index: number) => Scene | null): Partial<EditorState> {
  const idx = state.project.scenes.findIndex(s => s.id === state.project.activeSceneId);
  if (idx === -1) return {};
  const updated = fn({ ...state.project.scenes[idx] }, idx);
  if (!updated) return {};
  const scenes = [...state.project.scenes];
  scenes[idx] = updated;
  return { project: { ...state.project, scenes } };
}

function loadSavedProject(): GameProject {
  try {
    const saved = localStorage.getItem('game-editor-save');
    if (saved) {
      const parsed = JSON.parse(saved) as GameProject;
      if (parsed.id && parsed.scenes?.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return createDemoProject();
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: loadSavedProject(),
  selectedEntityId: null,
  editorTab: 'scene',
  leftPanelTab: 'components',
  isPlaying: false,

  getActiveScene: () => {
    const { project } = get();
    return project.scenes.find(s => s.id === project.activeSceneId) || project.scenes[0];
  },

  getEntity: (id: string) => get().getActiveScene().entities[id],

  getSelectedEntity: () => {
    const { selectedEntityId } = get();
    return selectedEntityId ? get().getEntity(selectedEntityId) : undefined;
  },

  addEntity: (type: EntityType, x = 200, y = 200) => {
    const id = generateId(type);
    const prefab = getPrefab(type);

    const components: ComponentData[] = [
      { type: 'transform', data: { x, y, rotation: 0, scaleX: 1, scaleY: 1 } },
    ];

    let behaviors: BehaviorConfig[] = [];

    if (prefab) {
      if (prefab.defaultText) {
        components.push({ type: 'text', data: { ...prefab.defaultText } });
      }
      if (prefab.defaultSprite.color !== '#00000000') {
        components.push({ type: 'sprite', data: { ...prefab.defaultSprite } });
      }
      if (prefab.defaultRigidBody) {
        components.push({ type: 'rigidbody', data: { ...prefab.defaultRigidBody } });
      }
      behaviors = prefab.defaultBehaviors.map(b => ({ ...b, params: { ...b.params } }));
    } else {
      components.push({ type: 'sprite', data: { color: '#7c5cfc', width: 80, height: 80, shape: 'rectangle' } });
    }

    const label = prefab?.label || type;
    const entity: Entity = {
      id,
      name: `${label} ${id.slice(-4)}`,
      type,
      components,
      behaviors,
      variables: [],
      children: [],
      visible: true,
      locked: false,
    };

    set(state => ({
      ...modifyScene(state, scene => {
        scene.entities = { ...scene.entities, [id]: entity };
        scene.rootEntities = [...scene.rootEntities, id];
        return scene;
      }),
      selectedEntityId: id,
      leftPanelTab: 'properties',
    }));
  },

  removeEntity: (id: string) => {
    set(state => ({
      ...modifyScene(state, scene => {
        const { [id]: _, ...rest } = scene.entities;
        scene.entities = rest;
        scene.rootEntities = scene.rootEntities.filter(eid => eid !== id);
        return scene;
      }),
      selectedEntityId: state.selectedEntityId === id ? null : state.selectedEntityId,
    }));
  },

  selectEntity: (id: string | null) => {
    set({ selectedEntityId: id, leftPanelTab: id ? 'properties' : 'components' });
  },

  updateEntityName: (id, name) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[id];
      if (!entity) return null;
      scene.entities = { ...scene.entities, [id]: { ...entity, name } };
      return scene;
    }));
  },

  updateComponent: (entityId, component) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      let components = entity.components.map(c => c.type === component.type ? component : c);
      if (!components.find(c => c.type === component.type)) components.push(component);
      scene.entities = { ...scene.entities, [entityId]: { ...entity, components } };
      return scene;
    }));
  },

  updateBehavior: (entityId, index, behavior) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      const behaviors = [...entity.behaviors];
      behaviors[index] = behavior;
      scene.entities = { ...scene.entities, [entityId]: { ...entity, behaviors } };
      return scene;
    }));
  },

  addBehavior: (entityId, behavior) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      scene.entities = { ...scene.entities, [entityId]: { ...entity, behaviors: [...entity.behaviors, behavior] } };
      return scene;
    }));
  },

  removeBehavior: (entityId, index) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      const behaviors = entity.behaviors.filter((_, i) => i !== index);
      scene.entities = { ...scene.entities, [entityId]: { ...entity, behaviors } };
      return scene;
    }));
  },

  toggleEntityVisibility: (id) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[id];
      if (!entity) return null;
      scene.entities = { ...scene.entities, [id]: { ...entity, visible: !entity.visible } };
      return scene;
    }));
  },

  toggleEntityLock: (id) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[id];
      if (!entity) return null;
      scene.entities = { ...scene.entities, [id]: { ...entity, locked: !entity.locked } };
      return scene;
    }));
  },

  addEntityVariable: (entityId, variable) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      scene.entities = { ...scene.entities, [entityId]: { ...entity, variables: [...entity.variables, variable] } };
      return scene;
    }));
  },

  updateEntityVariable: (entityId, varId, value) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      const variables = entity.variables.map(v => v.id === varId ? value : v);
      scene.entities = { ...scene.entities, [entityId]: { ...entity, variables } };
      return scene;
    }));
  },

  removeEntityVariable: (entityId, varId) => {
    set(state => modifyScene(state, scene => {
      const entity = scene.entities[entityId];
      if (!entity) return null;
      const variables = entity.variables.filter(v => v.id !== varId);
      scene.entities = { ...scene.entities, [entityId]: { ...entity, variables } };
      return scene;
    }));
  },

  addGlobalVariable: (variable) => {
    set(state => ({
      project: { ...state.project, globalVariables: [...state.project.globalVariables, variable] },
    }));
  },

  updateGlobalVariable: (varId, value) => {
    set(state => ({
      project: {
        ...state.project,
        globalVariables: state.project.globalVariables.map(v => v.id === varId ? value : v),
      },
    }));
  },

  removeGlobalVariable: (varId) => {
    set(state => ({
      project: {
        ...state.project,
        globalVariables: state.project.globalVariables.filter(v => v.id !== varId),
      },
    }));
  },

  addAsset: (asset) => {
    set(state => ({
      project: { ...state.project, assets: [...state.project.assets, asset] },
    }));
  },

  removeAsset: (assetId) => {
    set(state => ({
      project: { ...state.project, assets: state.project.assets.filter(a => a.id !== assetId) },
    }));
  },

  setEditorTab: (tab) => set({ editorTab: tab }),
  setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  updateSettings: (settings) => set(state => ({
    project: { ...state.project, settings: { ...state.project.settings, ...settings } },
  })),
  updateGameState: (gs) => {
    set(state => modifyScene(state, scene => {
      scene.gameState = { ...scene.gameState, ...gs };
      return scene;
    }));
  },

  loadTemplate: (project) => set({ project, selectedEntityId: null }),

  exportProject: () => JSON.stringify(get().project, null, 2),
  importProject: (json: string) => {
    try {
      const project = JSON.parse(json) as GameProject;
      if (!project.globalVariables) project.globalVariables = [];
      if (!project.assets) project.assets = [];
      for (const scene of project.scenes) {
        if (!scene.variables) scene.variables = [];
        for (const entity of Object.values(scene.entities)) {
          if (!entity.variables) entity.variables = [];
        }
      }
      set({ project, selectedEntityId: null });
    } catch (e) {
      console.error('Failed to import project:', e);
    }
  },
}));
