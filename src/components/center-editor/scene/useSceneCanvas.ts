import { useEffect, useRef, type RefObject, type MutableRefObject } from 'react';
import { Application, Graphics, Text as PixiText, Container, TextStyle } from 'pixi.js';
import { useEditorStore } from '@/store/useEditorStore';
import type { Entity, ComponentData, SpriteData } from '@/types';
import { hexToNumber } from '@/utils/colors';

interface EntityGraphic {
  container: Container;
  graphic: Graphics | PixiText;
  baseChildCount: number;
}

export function useSceneCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  pixiHandledRef: MutableRefObject<boolean>
) {
  const appRef = useRef<Application | null>(null);
  const graphicsMap = useRef<Map<string, EntityGraphic>>(new Map());
  const sceneContainerRef = useRef<Container | null>(null);
  const pendingSyncRef = useRef(false);
  const initedRef = useRef(false);

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
          background: '#12121e',
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
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      initedRef.current = false;
    };
  }, [canvasRef, containerRef, pixiHandledRef]);

  function drawGrid(app: Application) {
    const grid = new Graphics();
    const w = app.screen.width;
    const h = app.screen.height;
    const step = 40;

    grid.setStrokeStyle({ width: 1, color: 0x1e1e30, alpha: 0.5 });
    for (let x = 0; x <= w; x += step) {
      grid.moveTo(x, 0).lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      grid.moveTo(0, y).lineTo(w, y);
    }
    grid.stroke();
    app.stage.addChildAt(grid, 0);
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
      graphic = new Graphics();
      const sprite = entity.components.find(c => c.type === 'sprite') as
        | Extract<ComponentData, { type: 'sprite' }> | undefined;
      drawShape(graphic, entity.type, sprite?.data);
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

    // Remove only selection borders (keep base children: bg + graphic)
    while (eg.container.children.length > eg.baseChildCount) {
      const child = eg.container.children[eg.container.children.length - 1];
      eg.container.removeChild(child);
      child.destroy();
    }

    if (entity.id === selectedId) {
      drawSelectionBorder(eg.container, entity);
    }
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
      // Text-only entities: estimate size from text
      const textComp = entity.components.find(c => c.type === 'text') as
        | Extract<ComponentData, { type: 'text' }> | undefined;
      if (textComp) {
        w = textComp.data.content.length * textComp.data.fontSize * 0.6;
        h = textComp.data.fontSize * 1.4;
      }
    }

    const pad = 4;
    border.setStrokeStyle({ width: 2, color: 0x7c5cfc });
    border.rect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2);
    border.stroke();

    const cs = 6;
    for (const [cx, cy] of [[-w/2-pad, -h/2-pad], [w/2+pad, -h/2-pad], [-w/2-pad, h/2+pad], [w/2+pad, h/2+pad]]) {
      border.rect(cx - cs/2, cy - cs/2, cs, cs).fill({ color: 0x7c5cfc });
    }
    container.addChild(border);
  }

  function setupDrag(eg: EntityGraphic, entityId: string) {
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

    eg.container.on('pointerdown', (e) => {
      const entity = useEditorStore.getState().getEntity(entityId);
      if (!entity || entity.locked) return;

      // Signal React that PixiJS handled this click
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
      eg.container.position.set(pos.x - dragOffset.x, pos.y - dragOffset.y);
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
