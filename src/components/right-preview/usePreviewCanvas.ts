import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { Application, Graphics, Text as PixiText, Container, TextStyle, Sprite as PixiSprite, Assets } from 'pixi.js';
import { useEditorStore } from '@/store/useEditorStore';
import type { SpriteData } from '@/types';
import { hexToNumber } from '@/utils/colors';
import { createRuntimeEntity, tickRuntime, type RuntimeState, type RuntimeEntity } from '@/engine/runtime';
import { EventBus } from '@/engine/eventBus';
import { VariableStore } from '@/engine/variableSystem';
import { InputManager } from '@/engine/inputManager';
import { compileGraph, executeGraph, type CompiledGraph } from '@/engine/nodeExecutor';
import { useNodeGraphStore } from '@/store/useNodeGraphStore';
import { useAnimationStore } from '@/store/useAnimationStore';

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

          // Handle scene switching
          if (runtime.pendingSceneSwitch) {
            switchToScene(runtime.pendingSceneSwitch);
            runtime.pendingSceneSwitch = null;
            return;
          }

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

          // Apply animation keyframes
          const animStore = useAnimationStore.getState();
          if (animStore.tracks.length > 0) {
            const animTime = runtime.elapsed % (animStore.duration || 5);
            const animUpdates = animStore.evaluateAt(animTime);
            for (const [entityId, props] of animUpdates) {
              const re = runtime.entities.get(entityId);
              if (!re) continue;
              for (const [prop, value] of Object.entries(props)) {
                if (prop === 'x') re.x = value;
                else if (prop === 'y') re.y = value;
                else if (prop === 'rotation') re.rotation = value;
                else if (prop === 'scaleX') re.scaleX = value;
                else if (prop === 'scaleY') re.scaleY = value;
                else if (prop === 'width') re.width = value;
                else if (prop === 'height') re.height = value;
              }
            }
          }

          updateGraphics(runtime);
          drawPhysicsDebug(runtime);
          updateOverlay(runtime, app);
          updateTransition(ticker.deltaTime / 60, app);
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
      cameraX: state.project.settings.width / 2,
      cameraY: state.project.settings.height / 2,
      pendingSceneSwitch: null,
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

  const transitionRef = useRef<{ phase: 'out' | 'in'; progress: number; targetSceneId: string; duration: number } | null>(null);

  function switchToScene(sceneId: string) {
    const fadeDuration = 0.4;
    transitionRef.current = { phase: 'out', progress: 0, targetSceneId: sceneId, duration: fadeDuration };
  }

  function updateTransition(dt: number, app: Application) {
    const t = transitionRef.current;
    if (!t) return;

    t.progress += dt / t.duration;

    if (t.phase === 'out' && t.progress >= 1) {
      performSceneSwitch(t.targetSceneId);
      t.phase = 'in';
      t.progress = 0;
    }

    if (t.phase === 'in' && t.progress >= 1) {
      transitionRef.current = null;
    }

    // Draw fade overlay
    const overlay = overlayRef.current;
    if (overlay) {
      const alpha = t.phase === 'out' ? Math.min(1, t.progress) : Math.max(0, 1 - t.progress);
      if (alpha > 0) {
        const fadeGfx = new Graphics();
        fadeGfx.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x000000, alpha });
        overlay.addChild(fadeGfx);
      }
    }
  }

  function performSceneSwitch(sceneId: string) {
    const state = useEditorStore.getState();
    const targetScene = state.project.scenes.find(s => s.id === sceneId);
    if (!targetScene || !runtimeRef.current) return;

    const runtime = runtimeRef.current;
    runtime.entities.clear();
    runtime.spawnQueue = [];
    runtime.removeQueue = [];
    runtime.gameState = { ...targetScene.gameState };
    runtime.overlay = null;
    runtime.pendingSceneSwitch = null;
    runtime.cameraX = state.project.settings.width / 2;
    runtime.cameraY = state.project.settings.height / 2;

    for (const entityId of targetScene.rootEntities) {
      const entity = targetScene.entities[entityId];
      if (!entity || !entity.visible) continue;
      const re = createRuntimeEntity(entity);
      runtime.entities.set(re.id, re);
    }

    gfxMapRef.current.clear();
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

    if (re.imageAssetId) {
      const asset = useEditorStore.getState().project.assets.find(a => a.id === re.imageAssetId);
      if (asset) {
        loadPreviewSprite(container, asset.dataUrl, re.width, re.height);
      }
    } else if (re.color && re.color !== '#00000000') {
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

  async function loadPreviewSprite(container: Container, dataUrl: string, w: number, h: number) {
    try {
      const texture = await Assets.load(dataUrl);
      if (!texture) return;
      const spr = new PixiSprite(texture);
      spr.anchor.set(0.5);
      spr.width = w;
      spr.height = h;
      container.addChildAt(spr, 0);
    } catch { /* ignore */ }
  }

  function updateGraphics(runtime: RuntimeState) {
    const sceneContainer = sceneContainerRef.current;
    const app = appRef.current;
    if (!sceneContainer || !app) return;

    // Camera offset
    const pw = runtime.worldWidth;
    const ph = runtime.worldHeight;
    const sw = app.screen.width;
    const sh = app.screen.height;
    const scale = Math.min(sw / pw, sh / ph, 1);
    const camOffsetX = pw / 2 - runtime.cameraX;
    const camOffsetY = ph / 2 - runtime.cameraY;
    sceneContainer.position.set(
      (sw - pw * scale) / 2 + camOffsetX * scale,
      (sh - ph * scale) / 2 + camOffsetY * scale
    );

    // Add newly spawned entities
    for (const re of runtime.entities.values()) {
      if (!gfxMapRef.current.has(re.id) && re.alive) {
        const gfx = createRuntimeGraphic(re);
        sceneContainer.addChild(gfx);
        gfxMapRef.current.set(re.id, gfx);
      }
    }

    // Remove particle containers from previous frame
    for (const re of runtime.entities.values()) {
      const key = `particles-${re.id}`;
      const existing = gfxMapRef.current.get(key);
      if (existing) {
        sceneContainer.removeChild(existing);
        existing.destroy({ children: true });
        gfxMapRef.current.delete(key);
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

      gfx.alpha = re.flashTimer > 0 ? (Math.sin(re.flashTimer * 30) > 0 ? 0.3 : 1) : 1;

      for (const child of gfx.children) {
        if (child instanceof PixiText && re.text !== undefined) {
          child.text = re.text;
        }
      }

      // Render raycast beams
      if (re.raycastBeams && re.raycastBeams.length > 0) {
        const beamKey = `beams-${re.id}`;
        const existingBeam = gfxMapRef.current.get(beamKey);
        if (existingBeam) {
          sceneContainer.removeChild(existingBeam);
          existingBeam.destroy({ children: true });
        }
        const beamContainer = new Container();
        const bg = new Graphics();
        for (const beam of re.raycastBeams) {
          bg.setStrokeStyle({ width: 2, color: hexToNumber(beam.color), alpha: 0.7 });
          bg.moveTo(beam.x1, beam.y1).lineTo(beam.x2, beam.y2).stroke();
          bg.circle(beam.x2, beam.y2, 3).fill({ color: hexToNumber(beam.color), alpha: 0.9 });
        }
        beamContainer.addChild(bg);
        sceneContainer.addChild(beamContainer);
        gfxMapRef.current.set(beamKey, beamContainer);
      }

      // Render particles
      if (re.particles.length > 0) {
        const pContainer = new Container();
        const pg = new Graphics();
        for (const p of re.particles) {
          const alpha = Math.max(0, p.life / p.maxLife);
          const sz = p.size * alpha;
          pg.circle(p.x, p.y, sz).fill({ color: hexToNumber(p.color), alpha });
        }
        pContainer.addChild(pg);
        sceneContainer.addChild(pContainer);
        gfxMapRef.current.set(`particles-${re.id}`, pContainer);
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

  const debugRef = useRef(false);
  const setDebugMode = useCallback((enabled: boolean) => {
    debugRef.current = enabled;
  }, []);

  // Physics debug overlay rendering
  function drawPhysicsDebug(runtime: RuntimeState) {
    if (!debugRef.current) return;
    const sceneContainer = sceneContainerRef.current;
    if (!sceneContainer) return;

    const existingDebug = gfxMapRef.current.get('__physics_debug__');
    if (existingDebug) {
      sceneContainer.removeChild(existingDebug);
      existingDebug.destroy({ children: true });
    }

    const debugContainer = new Container();
    const g = new Graphics();

    for (const re of runtime.entities.values()) {
      if (!re.alive || !re.visible) continue;

      // Collision shape
      const hasRB = !!re.rigidBody;
      const color = hasRB
        ? (re.rigidBody?.isStatic ? 0x00ff00 : re.rigidBody?.isTrigger ? 0xffff00 : 0x00aaff)
        : 0x666666;

      g.setStrokeStyle({ width: 1.5, color, alpha: 0.7 });

      if (re.shape === 'circle') {
        const r = Math.min(re.width, re.height) / 2;
        g.circle(re.x, re.y, r).stroke();
      } else {
        g.rect(re.x - re.width / 2, re.y - re.height / 2, re.width, re.height).stroke();
      }

      // Velocity vector
      if (hasRB && re.rigidBody) {
        const vx = re.rigidBody.velocityX || 0;
        const vy = re.rigidBody.velocityY || 0;
        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
          g.setStrokeStyle({ width: 2, color: 0xff4444, alpha: 0.8 });
          g.moveTo(re.x, re.y).lineTo(re.x + vx * 5, re.y + vy * 5).stroke();
          const arrowLen = 4;
          const angle = Math.atan2(vy, vx);
          g.moveTo(re.x + vx * 5, re.y + vy * 5)
            .lineTo(re.x + vx * 5 - Math.cos(angle - 0.4) * arrowLen, re.y + vy * 5 - Math.sin(angle - 0.4) * arrowLen)
            .stroke();
          g.moveTo(re.x + vx * 5, re.y + vy * 5)
            .lineTo(re.x + vx * 5 - Math.cos(angle + 0.4) * arrowLen, re.y + vy * 5 - Math.sin(angle + 0.4) * arrowLen)
            .stroke();
        }
      }
    }

    debugContainer.addChild(g);
    sceneContainer.addChild(debugContainer);
    gfxMapRef.current.set('__physics_debug__', debugContainer);
  }

  return { onFpsUpdate, setDebugMode };
}
