import { useEffect, useRef, type RefObject, type MutableRefObject } from 'react';
import { Application, Graphics, Text as PixiText, Container, TextStyle, Sprite, Texture, Assets } from 'pixi.js';
import { useEditorStore } from '@/store/useEditorStore';
import type { Entity, ComponentData, SpriteData } from '@/types';
import { hexToNumber } from '@/utils/colors';

interface EntityGraphic {
  container: Container;
  graphic: Graphics | PixiText;
  baseChildCount: number;
}

export interface SceneCanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  resetZoom: () => void;
  getZoom: () => number;
}

export function useSceneCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  pixiHandledRef: MutableRefObject<boolean>,
  apiRef: MutableRefObject<SceneCanvasApi | null>
) {
  const appRef = useRef<Application | null>(null);
  const graphicsMap = useRef<Map<string, EntityGraphic>>(new Map());
  const sceneContainerRef = useRef<Container | null>(null);
  const gridContainerRef = useRef<Graphics | null>(null);
  const pendingSyncRef = useRef(false);
  const initedRef = useRef(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const spaceDownRef = useRef(false);
  const gridVisibleRef = useRef(true);
  const snapGridRef = useRef(20);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const canvas = canvasRef.current;
    const wrapper = containerRef.current;
    if (!canvas || !wrapper) { initedRef.current = false; return; }

    const app = new Application();
    let destroyed = false;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        await app.init({
          canvas,
          resizeTo: wrapper,
          background: '#10101c',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
      } catch {
        return;
      }

      if (destroyed) { app.destroy(); return; }
      appRef.current = app;

      const sceneContainer = new Container();
      sceneContainerRef.current = sceneContainer;
      app.stage.addChild(sceneContainer);
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      drawGrid(app);
      applyTransform();

      // Wheel zoom
      canvas.addEventListener('wheel', handleWheel, { passive: false });

      // Middle mouse / Space pan
      canvas.addEventListener('pointerdown', handlePanStart);
      canvas.addEventListener('pointermove', handlePanMove);
      canvas.addEventListener('pointerup', handlePanEnd);
      canvas.addEventListener('pointerleave', handlePanEnd);

      // Space key for pan mode
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      const scheduleSyncScene = () => {
        if (pendingSyncRef.current || destroyed) return;
        pendingSyncRef.current = true;
        requestAnimationFrame(() => {
          pendingSyncRef.current = false;
          if (!destroyed) syncScene();
        });
      };

      unsubscribe = useEditorStore.subscribe(scheduleSyncScene);
      syncScene();
    };

    init();

    return () => {
      destroyed = true;
      unsubscribe?.();
      graphicsMap.current.clear();
      sceneContainerRef.current = null;
      gridContainerRef.current = null;
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('pointerdown', handlePanStart);
      canvas.removeEventListener('pointermove', handlePanMove);
      canvas.removeEventListener('pointerup', handlePanEnd);
      canvas.removeEventListener('pointerleave', handlePanEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      initedRef.current = false;
    };
  }, [canvasRef, containerRef, pixiHandledRef]);

  // Expose API
  apiRef.current = {
    zoomIn: () => setZoom(zoomRef.current * 1.25),
    zoomOut: () => setZoom(zoomRef.current / 1.25),
    resetZoom: () => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; applyTransform(); },
    fitToScreen: () => {
      const app = appRef.current;
      if (!app) return;
      const { width: pw, height: ph } = useEditorStore.getState().project.settings;
      const sw = app.screen.width;
      const sh = app.screen.height;
      const scale = Math.min(sw / pw, sh / ph, 2) * 0.9;
      zoomRef.current = scale;
      panRef.current = { x: (sw - pw * scale) / 2, y: (sh - ph * scale) / 2 };
      applyTransform();
    },
    getZoom: () => zoomRef.current,
  };

  function setZoom(newZoom: number, pivotX?: number, pivotY?: number) {
    const clamped = Math.max(0.1, Math.min(5, newZoom));
    const app = appRef.current;
    if (!app) { zoomRef.current = clamped; applyTransform(); return; }
    const cx = pivotX ?? app.screen.width / 2;
    const cy = pivotY ?? app.screen.height / 2;
    const oldZoom = zoomRef.current;
    const ratio = clamped / oldZoom;
    panRef.current.x = cx - (cx - panRef.current.x) * ratio;
    panRef.current.y = cy - (cy - panRef.current.y) * ratio;
    zoomRef.current = clamped;
    applyTransform();
  }

  function applyTransform() {
    const sc = sceneContainerRef.current;
    if (!sc) return;
    sc.scale.set(zoomRef.current);
    sc.position.set(panRef.current.x, panRef.current.y);
    updateGrid();
    (window as any).__sceneTransform = { zoom: zoomRef.current, panX: panRef.current.x, panY: panRef.current.y };
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    const px = rect ? e.clientX - rect.left : undefined;
    const py = rect ? e.clientY - rect.top : undefined;
    setZoom(zoomRef.current * factor, px, py);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !e.repeat) {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      spaceDownRef.current = true;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      spaceDownRef.current = false;
      if (!isPanningRef.current && canvasRef.current) canvasRef.current.style.cursor = '';
    }
  }

  function handlePanStart(e: PointerEvent) {
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, cx: panRef.current.x, cy: panRef.current.y };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  function handlePanMove(e: PointerEvent) {
    if (!isPanningRef.current) return;
    panRef.current.x = panStartRef.current.cx + (e.clientX - panStartRef.current.x);
    panRef.current.y = panStartRef.current.cy + (e.clientY - panStartRef.current.y);
    applyTransform();
  }

  function handlePanEnd() {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = spaceDownRef.current ? 'grab' : '';
  }

  function drawGrid(app: Application) {
    const grid = new Graphics();
    gridContainerRef.current = grid;
    app.stage.addChildAt(grid, 0);
    updateGrid();
  }

  function updateGrid() {
    const grid = gridContainerRef.current;
    const app = appRef.current;
    if (!grid || !app) return;
    grid.clear();
    if (!gridVisibleRef.current) return;

    const zoom = zoomRef.current;
    const { width: pw, height: ph } = useEditorStore.getState().project.settings;
    const ox = panRef.current.x;
    const oy = panRef.current.y;

    let step = snapGridRef.current;
    if (zoom < 0.3) step = 80;
    else if (zoom < 0.6) step = 40;

    grid.setStrokeStyle({ width: 1, color: 0x1a1a30, alpha: 0.6 });
    for (let x = 0; x <= pw; x += step) {
      const sx = ox + x * zoom;
      grid.moveTo(sx, oy).lineTo(sx, oy + ph * zoom);
    }
    for (let y = 0; y <= ph; y += step) {
      const sy = oy + y * zoom;
      grid.moveTo(ox, sy).lineTo(ox + pw * zoom, sy);
    }
    grid.stroke();

    // Scene border
    grid.setStrokeStyle({ width: 2, color: 0x2a2a50, alpha: 0.8 });
    grid.rect(ox, oy, pw * zoom, ph * zoom).stroke();
  }

  function syncScene() {
    const state = useEditorStore.getState();
    const scene = state.getActiveScene();
    const sceneContainer = sceneContainerRef.current;
    if (!sceneContainer) return;

    const currentIds = new Set(scene.rootEntities);
    const existing = graphicsMap.current;

    for (const [id, eg] of existing) {
      if (!currentIds.has(id)) {
        sceneContainer.removeChild(eg.container);
        eg.container.destroy({ children: true });
        existing.delete(id);
      }
    }

    for (const entityId of scene.rootEntities) {
      const entity = scene.entities[entityId];
      if (!entity) continue;

      let eg = existing.get(entityId);

      if (!eg) {
        eg = createEntityGraphic(entity, state.selectedEntityId);
        if (eg) {
          sceneContainer.addChild(eg.container);
          existing.set(entityId, eg);
          setupDrag(eg, entity.id);
        }
      } else {
        updateEntityGraphic(eg, entity, state.selectedEntityId);
      }
    }
  }

  function createEntityGraphic(entity: Entity, selectedId: string | null): EntityGraphic | null {
    const transform = entity.components.find(c => c.type === 'transform') as
      | Extract<ComponentData, { type: 'transform' }> | undefined;
    if (!transform) return null;

    const container = new Container();
    container.position.set(transform.data.x, transform.data.y);
    container.rotation = (transform.data.rotation * Math.PI) / 180;
    container.scale.set(transform.data.scaleX, transform.data.scaleY);
    container.visible = entity.visible;
    container.eventMode = entity.locked ? 'none' : 'static';
    container.cursor = 'pointer';

    let graphic: Graphics | PixiText;
    const hasText = entity.components.some(c => c.type === 'text');
    const hasSprite = entity.components.some(c => c.type === 'sprite');

    if (hasText) {
      const textComp = entity.components.find(c => c.type === 'text') as
        | Extract<ComponentData, { type: 'text' }> | undefined;
      const td = textComp?.data || { content: 'Text', fontSize: 24, color: '#ffffff', fontFamily: 'Arial' };

      if (hasSprite) {
        const sprite = entity.components.find(c => c.type === 'sprite') as Extract<ComponentData, { type: 'sprite' }> | undefined;
        if (sprite && sprite.data.color !== '#00000000') {
          const bg = new Graphics();
          drawShape(bg, entity.type, sprite.data);
          container.addChild(bg);
        }
      }

      graphic = new PixiText({
        text: td.content,
        style: new TextStyle({ fontSize: td.fontSize, fill: td.color, fontFamily: td.fontFamily }),
      });
      (graphic as PixiText).anchor.set(0.5);
    } else if (hasSprite) {
      const spriteComp = entity.components.find(c => c.type === 'sprite') as
        | Extract<ComponentData, { type: 'sprite' }> | undefined;

      if (spriteComp?.data.imageAssetId) {
        const asset = useEditorStore.getState().project.assets.find(a => a.id === spriteComp.data.imageAssetId);
        if (asset) {
          graphic = new Graphics();
          const w = spriteComp.data.width;
          const h = spriteComp.data.height;
          graphic.rect(-w / 2, -h / 2, w, h).fill({ color: 0x333333, alpha: 0.3 });
          loadImageSprite(container, asset.dataUrl, w, h);
        } else {
          graphic = new Graphics();
          drawShape(graphic, entity.type, spriteComp?.data);
        }
      } else {
        graphic = new Graphics();
        drawShape(graphic, entity.type, spriteComp?.data);
      }
    } else {
      graphic = new Graphics();
      drawShape(graphic, entity.type, undefined);
    }

    container.addChild(graphic);
    const baseChildCount = container.children.length;

    if (entity.id === selectedId) {
      drawSelectionBorder(container, entity);
    }

    return { container, graphic, baseChildCount };
  }

  function updateEntityGraphic(eg: EntityGraphic, entity: Entity, selectedId: string | null) {
    const transform = entity.components.find(c => c.type === 'transform') as
      | Extract<ComponentData, { type: 'transform' }> | undefined;
    if (!transform) return;

    eg.container.position.set(transform.data.x, transform.data.y);
    eg.container.rotation = (transform.data.rotation * Math.PI) / 180;
    eg.container.scale.set(transform.data.scaleX, transform.data.scaleY);
    eg.container.visible = entity.visible;
    eg.container.eventMode = entity.locked ? 'none' : 'static';

    if (eg.graphic instanceof PixiText) {
      const textComp = entity.components.find(c => c.type === 'text') as
        | Extract<ComponentData, { type: 'text' }> | undefined;
      if (textComp) {
        eg.graphic.text = textComp.data.content;
        eg.graphic.style.fontSize = textComp.data.fontSize;
        eg.graphic.style.fill = textComp.data.color;
        eg.graphic.style.fontFamily = textComp.data.fontFamily;
      }
    } else if (eg.graphic instanceof Graphics) {
      eg.graphic.clear();
      const sprite = entity.components.find(c => c.type === 'sprite') as
        | Extract<ComponentData, { type: 'sprite' }> | undefined;
      drawShape(eg.graphic, entity.type, sprite?.data);
    }

    while (eg.container.children.length > eg.baseChildCount) {
      const child = eg.container.children[eg.container.children.length - 1];
      eg.container.removeChild(child);
      child.destroy();
    }

    if (entity.id === selectedId) {
      drawSelectionBorder(eg.container, entity);
    }
  }

  async function loadImageSprite(container: Container, dataUrl: string, w: number, h: number) {
    try {
      const texture = await Assets.load(dataUrl);
      if (!texture) return;
      const spr = new Sprite(texture);
      spr.anchor.set(0.5);
      spr.width = w;
      spr.height = h;
      container.addChildAt(spr, 0);
    } catch { /* asset load failed */ }
  }

  function drawShape(g: Graphics, type: string, sprite?: SpriteData) {
    const w = sprite?.width || 80;
    const h = sprite?.height || 80;
    const color = hexToNumber(sprite?.color || '#7c5cfc');

    g.clear();

    if (type === 'circle' || type === 'coin') {
      const r = Math.min(w, h) / 2;
      g.circle(0, 0, r).fill({ color });
    } else if (type === 'triangle' || type === 'spike' || type === 'gem') {
      g.poly([0, -h / 2, w / 2, h / 2, -w / 2, h / 2]).fill({ color });
    } else {
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill({ color });
    }
  }

  function drawSelectionBorder(container: Container, entity: Entity) {
    const border = new Graphics();
    const sprite = entity.components.find(c => c.type === 'sprite') as
      | Extract<ComponentData, { type: 'sprite' }> | undefined;

    let w = 80, h = 80;
    if (sprite) {
      w = sprite.data.width;
      h = sprite.data.height;
    } else {
      const textComp = entity.components.find(c => c.type === 'text') as
        | Extract<ComponentData, { type: 'text' }> | undefined;
      if (textComp) {
        w = textComp.data.content.length * textComp.data.fontSize * 0.6;
        h = textComp.data.fontSize * 1.4;
      }
    }

    const pad = 4;
    border.setStrokeStyle({ width: 2, color: 0x7c6bf5 });
    border.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
    border.stroke();

    const cs = 6;
    for (const [cx, cy] of [[-w/2-pad, -h/2-pad], [w/2+pad, -h/2-pad], [-w/2-pad, h/2+pad], [w/2+pad, h/2+pad]]) {
      border.rect(cx - cs/2, cy - cs/2, cs, cs).fill({ color: 0x7c6bf5 });
    }
    container.addChild(border);
  }

  function setupDrag(eg: EntityGraphic, entityId: string) {
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

    eg.container.on('pointerdown', (e) => {
      if (isPanningRef.current || spaceDownRef.current) return;
      const entity = useEditorStore.getState().getEntity(entityId);
      if (!entity || entity.locked) return;

      pixiHandledRef.current = true;
      useEditorStore.getState().selectEntity(entityId);
      dragging = true;
      const pos = e.getLocalPosition(eg.container.parent);
      dragOffset.x = pos.x - eg.container.x;
      dragOffset.y = pos.y - eg.container.y;
      eg.container.alpha = 0.8;
    });

    eg.container.on('globalpointermove', (e) => {
      if (!dragging) return;
      const pos = e.getLocalPosition(eg.container.parent);
      let nx = pos.x - dragOffset.x;
      let ny = pos.y - dragOffset.y;

      // Grid snapping
      const snap = snapGridRef.current;
      if (snap > 0 && !e.shiftKey) {
        nx = Math.round(nx / snap) * snap;
        ny = Math.round(ny / snap) * snap;
      }

      eg.container.position.set(nx, ny);
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      eg.container.alpha = 1;
      useEditorStore.getState().updateComponent(entityId, {
        type: 'transform',
        data: {
          x: Math.round(eg.container.x),
          y: Math.round(eg.container.y),
          rotation: (eg.container.rotation * 180) / Math.PI,
          scaleX: eg.container.scale.x,
          scaleY: eg.container.scale.y,
        },
      });
    };

    eg.container.on('pointerup', endDrag);
    eg.container.on('pointerupoutside', endDrag);
  }
}
