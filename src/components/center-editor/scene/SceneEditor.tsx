import { useRef, useCallback, useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useSceneCanvas, type SceneCanvasApi } from './useSceneCanvas';
import { showContextMenu } from '@/components/shared/ContextMenu';
import { AlignmentToolbar } from './AlignmentToolbar';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Grid3X3, Copy, Clipboard, Trash2, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { generateId } from '@/utils/id';
import type { Entity } from '@/types';

export function SceneEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiHandledRef = useRef(false);
  const apiRef = useRef<SceneCanvasApi | null>(null);
  const [zoom, setZoom] = useState(100);

  const { setNodeRef } = useDroppable({ id: 'scene-canvas' });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  useSceneCanvas(canvasRef, containerRef, pixiHandledRef, apiRef);

  useEffect(() => {
    const interval = setInterval(() => {
      if (apiRef.current) setZoom(Math.round(apiRef.current.getZoom() * 100));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (pixiHandledRef.current) {
        pixiHandledRef.current = false;
        return;
      }
      if (e.target === canvasRef.current) {
        useEditorStore.getState().selectEntity(null);
      }
    },
    []
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const state = useEditorStore.getState();
    const entity = state.getSelectedEntity();

    if (entity) {
      showContextMenu(e.clientX, e.clientY, [
        { label: '复制', icon: <Copy size={12} />, shortcut: 'Ctrl+C', action: () => {
          (window as any).__gameEditorClipboard = JSON.parse(JSON.stringify(entity));
        }},
        { label: '复制实体', icon: <Copy size={12} />, shortcut: 'Ctrl+D', action: () => {
          useHistoryStore.getState().saveSnapshot();
          quickDuplicate(entity);
        }},
        { separator: true, label: '' },
        { label: entity.visible ? '隐藏' : '显示',
          icon: entity.visible ? <EyeOff size={12} /> : <Eye size={12} />,
          action: () => state.toggleEntityVisibility(entity.id) },
        { label: entity.locked ? '解锁' : '锁定',
          icon: entity.locked ? <Unlock size={12} /> : <Lock size={12} />,
          action: () => state.toggleEntityLock(entity.id) },
        { separator: true, label: '' },
        { label: '删除', icon: <Trash2 size={12} />, shortcut: 'Del', danger: true, action: () => {
          useHistoryStore.getState().saveSnapshot();
          state.removeEntity(entity.id);
        }},
      ]);
    } else {
      showContextMenu(e.clientX, e.clientY, [
        { label: '粘贴', icon: <Clipboard size={12} />, shortcut: 'Ctrl+V',
          disabled: !(window as any).__gameEditorClipboard,
          action: () => {
            const src = (window as any).__gameEditorClipboard as Entity;
            if (!src) return;
            useHistoryStore.getState().saveSnapshot();
            quickDuplicate(src);
          }},
      ]);
    }
  }, []);

  return (
    <div
      ref={setContainerRef}
      className="w-full h-full relative bg-[#10101c]"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Alignment toolbar for multi-select */}
      <AlignmentToolbar />

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-panel/90 backdrop-blur-sm rounded-lg border border-panel-border/60 p-0.5 shadow-lg">
        <ZoomBtn icon={<ZoomOut size={13} />} tip="缩小" onClick={() => apiRef.current?.zoomOut()} />
        <span className="text-[10px] text-text-secondary font-mono w-10 text-center select-none">{zoom}%</span>
        <ZoomBtn icon={<ZoomIn size={13} />} tip="放大" onClick={() => apiRef.current?.zoomIn()} />
        <div className="w-px h-4 bg-panel-border/60 mx-0.5" />
        <ZoomBtn icon={<Maximize size={13} />} tip="适应窗口" onClick={() => apiRef.current?.fitToScreen()} />
        <ZoomBtn icon={<RotateCcw size={13} />} tip="重置缩放" onClick={() => apiRef.current?.resetZoom()} />
        <ZoomBtn icon={<Grid3X3 size={13} />} tip="网格" onClick={() => {}} />
      </div>

      {/* Help text */}
      <div className="absolute bottom-2 left-2 text-[10px] text-text-muted/70 bg-panel/70 backdrop-blur-sm px-2.5 py-1 rounded-md pointer-events-none border border-panel-border/30">
        拖拽组件到场景 · 点击选中 · 滚轮缩放 · 空格+拖拽平移 · 按住Shift取消吸附
      </div>
    </div>
  );
}

function quickDuplicate(source: Entity) {
  const newId = generateId(source.type);
  const components = source.components.map(c => {
    if (c.type === 'transform') return { ...c, data: { ...c.data, x: c.data.x + 25, y: c.data.y + 25 } };
    return { ...c, data: { ...c.data } };
  });
  const entity: Entity = {
    ...source, id: newId, name: `${source.name} 副本`, components,
    behaviors: source.behaviors.map(b => ({ ...b, params: { ...b.params } })),
    variables: source.variables.map(v => ({ ...v, id: generateId('var') })),
    children: [],
  };
  useEditorStore.setState(s => {
    const scene = s.project.scenes.find(sc => sc.id === s.project.activeSceneId);
    if (!scene) return s;
    const updated = { ...scene, entities: { ...scene.entities, [newId]: entity }, rootEntities: [...scene.rootEntities, newId] };
    return { project: { ...s.project, scenes: s.project.scenes.map(sc => sc.id === updated.id ? updated : sc) }, selectedEntityId: newId, leftPanelTab: 'properties' as const };
  });
}

function ZoomBtn({ icon, tip, onClick }: { icon: React.ReactNode; tip: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={tip}
      className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all active:scale-90">
      {icon}
    </button>
  );
}
