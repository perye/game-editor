import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Application, Graphics, Text as PixiText, Container, TextStyle } from 'pixi.js';
import { useEditorStore } from '@/store/useEditorStore';
import type { SpriteData } from '@/types';
import { hexToNumber } from '@/utils/colors';
import { createRuntimeEntity, tickRuntime, type RuntimeState, type RuntimeEntity } from '@/engine/runtime';
import { EventBus } from '@/engine/eventBus';
import { VariableStore } from '@/engine/variableSystem';
import { InputManager } from '@/engine/inputManager';
import { compileGraph, executeGraph, type CompiledGraph } from '@/engine/nodeExecutor';
import { useNodeGraphStore } from '@/store/useNodeGraphStore';

export function usePreviewCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>
) {
  const appRef = useRef<Application | null>(null);
  const sceneContainerRef = useRef<Container | null>(null);
  const overlayRef = useRef<Container | null>(null);
  const fpsCallbackRef = useRef<((fps: number) => void) | null>(null);
  const initedRef = useRef(false);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const gfxMapRef = useRef<Map<string, Container>>(new Map());
  const inputRef = useRef<InputManager | null>(null);
  const graphRef = useRef<CompiledGraph | null>(null);
  const graphStartedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const canvas = canvasRef.current;
    const wrapper = containerRef.current;
    if (!canvas || !wrapper) { initedRef.current = false; return; }

    const app = new Application();
    let destroyed = false;
    let unsubscribe: (() => void) | null = null;
    let fpsInterval: ReturnType<typeof setInterval> | null = null;

    const input = new InputManager();
    input.attach(canvas);
    inputRef.current = input;

    const init = async () => {
      try {
        await app.init({
          canvas,
          resizeTo: wrapper,
          background: '#0e0e1a',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
      } catch { return; }

      if (destroyed) { app.destroy(); return; }
      appRef.current = app;

      const sceneContainer = new Container();
      sceneContainerRef.current = sceneContainer;
      app.stage.addChild(sceneContainer);

      const overlay = new Container();
      overlayRef.current = overlay;
      app.stage.addChild(overlay);

      fpsInterval = setInterval(() => {
        if (!destroyed && app.ticker) fpsCallbackRef.current?.(Math.round(app.ticker.FPS));
      }, 1000);

      app.ticker.add((ticker) => {
        if (destroyed) return;
        const isPlaying = useEditorStore.getState().isPlaying;
        const runtime = runtimeRef.current;
        if (isPlaying && runtime) {
          // Convert mouse coords to world space
          const sc = sceneContainerRef.current;
          if (sc) {
            const localX = (input.mouse.x - sc.x) / sc.scale.x;
            const localY = (input.mouse.y - sc.y) / sc.scale.y;
            input.setWorldMouse(localX, localY);
          }

          runtime.keys = input.keys;
          tickRuntime(runtime, ticker.deltaTime / 60);

          // Execute node graph
          const graph = graphRef.current;
          if (graph) {
            if (!graphStartedRef.current) {
              executeGraph(graph, 'start', runtime);
              graphStartedRef.current = true;
            }
            executeGraph(graph, 'update', runtime);
            if (input.mouse.justPressed) executeGraph(graph, 'click', runtime);
          }

          updateGraphics(runtime);
          updateOverlay(runtime, app);
          input.update();
        }
      });

      unsubscribe = useEditorStore.subscribe((state, prevState) => {
        if (destroyed) return;
        if (state.isPlaying && !prevState.isPlaying) {
          resetRuntime();
        }
        if (!state.isPlaying) {
          requestAnimationFrame(() => { if (!destroyed) rebuildScene(); });
        }
      });

      rebuildScene();
    };

    init();

    return () => {
      destroyed = true;
      unsubscribe?.();
      if (fpsInterval) clearInterval(fpsInterval);
      input.detach();
      sceneContainerRef.current = null;
      overlayRef.current = null;
      runtimeRef.current = null;
      gfxMapRef.current.clear();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      initedRef.current = false;
    };
  }, [canvasRef, containerRef]);

  function resetRuntime() {
    const state = useEditorStore.getState();
    const scene = state.getActiveScene();
    const input = inputRef.current;
    if (!input) return;

    const eventBus = new EventBus();
    const variables = new VariableStore();
    variables.setEventBus(eventBus);

    // Load global variables
    variables.loadGlobals(state.project.globalVariables || []);
    variables.setGlobal('score', 0);
    variables.setGlobal('health', 3);

    const entities = new Map<string, RuntimeEntity>();
    for (const entityId of scene.rootEntities) {
      const entity = scene.entities[entityId];
      if (!entity || !entity.visible) continue;
      const re = createRuntimeEntity(entity);
      entities.set(entityId, re);
      variables.loadEntityVars(entityId, entity.variables || []);
    }

    runtimeRef.current = {
      entities,
      keys: input.keys,
      input,
      eventBus,
      variables,
      gameState: { score: 0, health: 3, time: 60, isWin: false, isLose: false },
      elapsed: 0,
      overlay: null,
      gravity: scene.gravity || 0,
      spawnQueue: [],
      removeQueue: [],
      worldWidth: state.project.settings.width,
      worldHeight: state.project.settings.height,
    };

    // Compile node graph
    const { nodes: graphNodes, edges: graphEdges } = useNodeGraphStore.getState();
    graphRef.current = compileGraph(
      graphNodes.map(n => ({ id: n.id, data: n.data as { label: string; category: string; params?: Record<string, string | number | boolean> } })),
      graphEdges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle }))
    );
    graphStartedRef.current = false;

    input.reset();
    rebuildScene();
  }

  function rebuildScene() {
    const sceneContainer = sceneContainerRef.current;
    const overlay = overlayRef.current;
    const app = appRef.current;
    if (!sceneContainer || !app) return;

    while (sceneContainer.children.length > 0) {
      const child = sceneContainer.children[0];
      sceneContainer.removeChild(child);
      child.destroy({ children: true });
    }
    if (overlay) {
      while (overlay.children.length > 0) {
        const child = overlay.children[0];
        overlay.removeChild(child);
        child.destroy({ children: true });
      }
    }
    gfxMapRef.current.clear();

    const state = useEditorStore.getState();
    const scene = state.getActiveScene();
    const sw = app.screen.width;
    const sh = app.screen.height;
    const pw = state.project.settings.width;
    const ph = state.project.settings.height;
    const scale = Math.min(sw / pw, sh / ph, 1);
    sceneContainer.scale.set(scale);
    sceneContainer.position.set((sw - pw * scale) / 2, (sh - ph * scale) / 2);

    const bg = new Graphics();
    bg.rect(0, 0, pw, ph).fill({ color: hexToNumber(scene.backgroundColor) });
    bg.setStrokeStyle({ width: 1, color: 0x3a3a50, alpha: 0.5 });
    bg.rect(0, 0, pw, ph).stroke();
    sceneContainer.addChild(bg);

    if (state.isPlaying && runtimeRef.current) {
      for (const re of runtimeRef.current.entities.values()) {
        if (!re.alive) continue;
        const gfx = createRuntimeGraphic(re);
        sceneContainer.addChild(gfx);
        gfxMapRef.current.set(re.id, gfx);
      }
    } else {
      for (const entityId of scene.rootEntities) {
        const entity = scene.entities[entityId];
        if (!entity || !entity.visible) continue;
        const re = createRuntimeEntity(entity);
        const gfx = createRuntimeGraphic(re);
        sceneContainer.addChild(gfx);
        gfxMapRef.current.set(entityId, gfx);
      }
    }
  }

  function createRuntimeGraphic(re: RuntimeEntity): Container {
    const container = new Container();
    container.position.set(re.x, re.y);
    container.rotation = (re.rotation * Math.PI) / 180;
    container.scale.set(re.scaleX, re.scaleY);

    if (re.color && re.color !== '#00000000') {
      const g = new Graphics();
      drawShape(g, re.shape, { color: re.color, width: re.width, height: re.height, shape: re.shape as SpriteData['shape'] });
      container.addChild(g);
    }

    if (re.text) {
      const text = new PixiText({
        text: re.text,
        style: new TextStyle({
          fontSize: re.fontSize || 20,
          fill: re.textColor || '#ffffff',
          fontFamily: re.fontFamily || 'Arial',
        }),
      });
      text.anchor.set(0.5);
      container.addChild(text);
    }

    return container;
  }

  function updateGraphics(runtime: RuntimeState) {
    const sceneContainer = sceneContainerRef.current;
    if (!sceneContainer) return;

    // Add newly spawned entities
    for (const re of runtime.entities.values()) {
      if (!gfxMapRef.current.has(re.id) && re.alive) {
        const gfx = createRuntimeGraphic(re);
        sceneContainer.addChild(gfx);
        gfxMapRef.current.set(re.id, gfx);
      }
    }

    for (const re of runtime.entities.values()) {
      const gfx = gfxMapRef.current.get(re.id);
      if (!gfx) continue;
      if (!re.alive) {
        gfx.visible = false;
        continue;
      }
      gfx.visible = re.visible;
      gfx.position.set(re.x, re.y);
      gfx.rotation = (re.rotation * Math.PI) / 180;
      gfx.scale.set(re.scaleX, re.scaleY);

      // Flash effect
      gfx.alpha = re.flashTimer > 0 ? (Math.sin(re.flashTimer * 30) > 0 ? 0.3 : 1) : 1;

      for (const child of gfx.children) {
        if (child instanceof PixiText && re.text !== undefined) {
          child.text = re.text;
        }
      }
    }
  }

  function updateOverlay(runtime: RuntimeState, app: Application) {
    const overlay = overlayRef.current;
    if (!overlay) return;

    while (overlay.children.length > 0) {
      const child = overlay.children[0];
      overlay.removeChild(child);
      child.destroy({ children: true });
    }

    if (runtime.overlay) {
      const bg = new Graphics();
      bg.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x000000, alpha: 0.7 });
      overlay.addChild(bg);

      const isWin = runtime.gameState.isWin;
      const msg = new PixiText({
        text: runtime.overlay,
        style: new TextStyle({
          fontSize: 36,
          fill: isWin ? '#4caf50' : '#f44336',
          fontFamily: 'Arial',
          fontWeight: 'bold',
        }),
      });
      msg.anchor.set(0.5);
      msg.position.set(app.screen.width / 2, app.screen.height / 2 - 20);
      overlay.addChild(msg);

      const hint = new PixiText({
        text: '点击 ▶ 重新开始',
        style: new TextStyle({ fontSize: 16, fill: '#9494a8', fontFamily: 'Arial' }),
      });
      hint.anchor.set(0.5);
      hint.position.set(app.screen.width / 2, app.screen.height / 2 + 30);
      overlay.addChild(hint);
    }
  }

  function drawShape(g: Graphics, type: string, sprite: SpriteData) {
    const w = sprite.width;
    const h = sprite.height;
    const color = hexToNumber(sprite.color);

    if (type === 'circle' || type === 'coin') {
      g.circle(0, 0, Math.min(w, h) / 2).fill({ color });
    } else if (type === 'triangle' || type === 'star' || type === 'spike' || type === 'gem') {
      g.poly([0, -h / 2, w / 2, h / 2, -w / 2, h / 2]).fill({ color });
    } else {
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill({ color });
    }
  }

  const onFpsUpdate = useCallback((cb: (fps: number) => void) => {
    fpsCallbackRef.current = cb;
  }, []);

  return { onFpsUpdate };
}
