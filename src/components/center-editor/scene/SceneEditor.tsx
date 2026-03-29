import { useRef, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '@/store/useEditorStore';
import { useSceneCanvas } from './useSceneCanvas';

export function SceneEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiHandledRef = useRef(false);

  const { setNodeRef } = useDroppable({ id: 'scene-canvas' });

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  useSceneCanvas(canvasRef, containerRef, pixiHandledRef);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // PixiJS pointerdown already handled this click (selected an entity)
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

  return (
    <div
      ref={setContainerRef}
      className="w-full h-full relative bg-[#12121e]"
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute bottom-2 left-2 text-[10px] text-text-muted bg-panel/80 px-2 py-1 rounded pointer-events-none">
        场景编辑器 — 从左侧拖拽组件到这里 | 点击实体选中 | 拖拽移动
      </div>
    </div>
  );
}
