import type { GameProject, Entity, ComponentData } from '@/types';

function getTransform(entity: Entity) {
  const t = entity.components.find(c => c.type === 'transform') as
    | Extract<ComponentData, { type: 'transform' }> | undefined;
  return t?.data || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
}

function getSprite(entity: Entity) {
  return (entity.components.find(c => c.type === 'sprite') as
    | Extract<ComponentData, { type: 'sprite' }> | undefined)?.data;
}

function getText(entity: Entity) {
  return (entity.components.find(c => c.type === 'text') as
    | Extract<ComponentData, { type: 'text' }> | undefined)?.data;
}

function getRigidbody(entity: Entity) {
  return (entity.components.find(c => c.type === 'rigidbody') as
    | Extract<ComponentData, { type: 'rigidbody' }> | undefined)?.data;
}

function serializeEntity(entity: Entity) {
  const t = getTransform(entity);
  const s = getSprite(entity);
  const tx = getText(entity);
  const rb = getRigidbody(entity);
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    x: t.x,
    y: t.y,
    rotation: t.rotation,
    scaleX: t.scaleX,
    scaleY: t.scaleY,
    width: s?.width || 40,
    height: s?.height || 40,
    color: s?.color || '#7c5cfc',
    shape: s?.shape || 'rectangle',
    imageAssetId: s?.imageAssetId,
    text: tx?.content,
    fontSize: tx?.fontSize,
    textColor: tx?.color,
    fontFamily: tx?.fontFamily,
    behaviors: entity.behaviors.filter(b => b.enabled),
    rigidbody: rb ? { ...rb } : null,
  };
}

export function exportToHTML(project: GameProject): string {
  const { width, height } = project.settings;

  const scenesData = project.scenes.map(scene => {
    const entities = scene.rootEntities
      .map(id => scene.entities[id])
      .filter(Boolean)
      .filter(e => e.visible)
      .map(serializeEntity);
    return {
      id: scene.id,
      name: scene.name,
      entities,
      backgroundColor: scene.backgroundColor,
      gravity: scene.gravity || 0,
      gameState: scene.gameState,
    };
  });

  const gameData = JSON.stringify({
    scenes: scenesData,
    activeSceneId: project.activeSceneId,
    width,
    height,
    globalVariables: project.globalVariables || [],
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; font-family: 'Segoe UI', Arial, sans-serif; }
    canvas { border: 1px solid #333; }
    #overlay { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column; background: rgba(0,0,0,0.75); z-index: 10; }
    #overlay.show { display: flex; }
    #overlay h1 { font-size: 40px; font-weight: bold; margin-bottom: 12px; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    #overlay p { color: #aaa; font-size: 15px; }
    #overlay button { margin-top: 24px; padding: 12px 36px; font-size: 16px; background: #7c5cfc; color: white; border: none; border-radius: 8px; cursor: pointer; transition: background .15s; }
    #overlay button:hover { background: #6a4ce0; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <div id="overlay">
    <h1 id="overlay-msg"></h1>
    <p id="overlay-hint"></p>
    <button id="restart-btn">重新开始</button>
  </div>

  <script type="module">
    import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.mjs';

    const GAME_DATA = ${gameData};
    const W = GAME_DATA.width;
    const H = GAME_DATA.height;

    const app = new PIXI.Application();
    await app.init({
      canvas: document.getElementById('game'),
      width: W, height: H,
      background: GAME_DATA.scenes[0]?.backgroundColor || '#1a1a2e',
      antialias: true,
    });

    /* ═══════════════════════════════════════
       Expression Evaluator
       ═══════════════════════════════════════ */
    function tokenize(expr) {
      const tokens = [];
      let i = 0;
      while (i < expr.length) {
        if (expr[i] === ' ') { i++; continue; }
        if ('+-*/%'.includes(expr[i])) { tokens.push({ t: 'op', v: expr[i] }); i++; }
        else if ('()'.includes(expr[i])) { tokens.push({ t: 'p', v: expr[i] }); i++; }
        else if (/[0-9.]/.test(expr[i])) {
          let n = '';
          while (i < expr.length && /[0-9.]/.test(expr[i])) { n += expr[i]; i++; }
          tokens.push({ t: 'n', v: parseFloat(n) });
        } else if (/[a-zA-Z_]/.test(expr[i])) {
          let id = '';
          while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { id += expr[i]; i++; }
          tokens.push({ t: 'id', v: id });
        } else { i++; }
      }
      return tokens;
    }
    const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
    function evalExpr(expr, vars) {
      try {
        const tokens = tokenize(String(expr));
        if (!tokens.length) return 0;
        if (tokens.length === 1 && tokens[0].t === 'n') return tokens[0].v;
        const out = [], ops = [];
        const apply = (op) => { const b = out.pop() ?? 0, a = out.pop() ?? 0;
          if (op === '+') out.push(a+b); else if (op === '-') out.push(a-b);
          else if (op === '*') out.push(a*b); else if (op === '/') out.push(b?a/b:0);
          else if (op === '%') out.push(b?a%b:0); };
        for (const tk of tokens) {
          if (tk.t === 'n') out.push(tk.v);
          else if (tk.t === 'id') out.push(vars[tk.v] ?? 0);
          else if (tk.t === 'op') {
            while (ops.length && ops[ops.length-1] !== '(' && (PREC[ops[ops.length-1]]??0) >= (PREC[tk.v]??0)) apply(ops.pop());
            ops.push(tk.v);
          } else if (tk.t === 'p') {
            if (tk.v === '(') ops.push('(');
            else { while (ops.length && ops[ops.length-1] !== '(') apply(ops.pop()); ops.pop(); }
          }
        }
        while (ops.length) apply(ops.pop());
        return out[0] ?? 0;
      } catch { return 0; }
    }

    /* ═══════════════════════════════════════
       Variable System
       ═══════════════════════════════════════ */
    const globals = new Map();
    const entityVars = new Map();
    function getGlobal(n) { return globals.get(n); }
    function setGlobal(n, v) { globals.set(n, v); }
    function getEntityVar(eid, n) { return entityVars.get(eid)?.get(n); }
    function setEntityVar(eid, n, v) { if (!entityVars.has(eid)) entityVars.set(eid, new Map()); entityVars.get(eid).set(n, v); }
    function varEvaluate(variable, operator, target) {
      const val = globals.get(variable);
      if (val === undefined) return false;
      switch (operator) {
        case '==': return val === target;
        case '!=': return val !== target;
        case '>':  return typeof val === 'number' && typeof target === 'number' && val > target;
        case '<':  return typeof val === 'number' && typeof target === 'number' && val < target;
        case '>=': return typeof val === 'number' && typeof target === 'number' && val >= target;
        case '<=': return typeof val === 'number' && typeof target === 'number' && val <= target;
        default: return false;
      }
    }
    function buildVarContext() {
      const ctx = { score: gameState.score, health: gameState.health, time: gameState.time, elapsed, entityCount: entities.length };
      for (const [k, v] of globals) { if (typeof v === 'number') ctx[k] = v; }
      return ctx;
    }

    /* ═══════════════════════════════════════
       State
       ═══════════════════════════════════════ */
    const keys = new Set();
    const mouse = { x: W/2, y: W/2, pressed: false, justPressed: false };
    let gameState = { score: 0, health: 3, time: 0, isWin: false, isLose: false };
    let elapsed = 0;
    let overlayMsg = null;
    let entities = [];
    const gfxMap = new Map();
    let spawnQueue = [];
    let removeQueue = [];
    let cameraX = 0, cameraY = 0;
    let currentSceneId = GAME_DATA.activeSceneId;
    let pendingSceneSwitch = null;

    const sceneContainer = new PIXI.Container();
    const particleGfx = new PIXI.Graphics();
    app.stage.addChild(sceneContainer);
    app.stage.addChild(particleGfx);

    /* ═══════════════════════════════════════
       Input
       ═══════════════════════════════════════ */
    window.addEventListener('keydown', e => keys.add(e.key));
    window.addEventListener('keyup', e => keys.delete(e.key));
    app.canvas.addEventListener('mousemove', e => {
      const r = app.canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left + cameraX - W/2;
      mouse.y = e.clientY - r.top + cameraY - H/2;
    });
    app.canvas.addEventListener('mousedown', () => { mouse.pressed = true; mouse.justPressed = true; });
    app.canvas.addEventListener('mouseup', () => { mouse.pressed = false; });

    /* ═══════════════════════════════════════
       Helpers
       ═══════════════════════════════════════ */
    function hexToNum(hex) { return parseInt(String(hex).replace('#', ''), 16); }

    function isPointIn(px, py, ex, ey, ew, eh) {
      return px >= ex-ew/2 && px <= ex+ew/2 && py >= ey-eh/2 && py <= ey+eh/2;
    }

    function checkAABB(a, b) {
      return a.x - a.width/2 < b.x + b.width/2 &&
             a.x + a.width/2 > b.x - b.width/2 &&
             a.y - a.height/2 < b.y + b.height/2 &&
             a.y + a.height/2 > b.y - b.height/2;
    }

    function getCooldown(e, k) { return (e.cooldowns[k] || 0) > 0; }
    function setCooldown(e, k, t) { e.cooldowns[k] = t; }

    /* ═══════════════════════════════════════
       Physics Engine
       ═══════════════════════════════════════ */
    function physicsStep(dt) {
      const gravity = getCurrentScene()?.gravity || 0;
      const alive = entities.filter(e => e.alive && e.visible);
      const collisions = [];

      for (const e of alive) {
        e.onGround = false;
        const rb = e.rigidbody;
        if (!rb || rb.isStatic) continue;
        if (!rb.isKinematic) {
          if (rb.gravityScale > 0) rb.velocityY += gravity * rb.gravityScale * dt * 60;
          if (e.onGround && rb.friction > 0) {
            rb.velocityX *= (1 - rb.friction * dt * 10);
            if (Math.abs(rb.velocityX) < 0.01) rb.velocityX = 0;
          }
        }
        e.x += rb.velocityX * dt * 60;
        e.y += rb.velocityY * dt * 60;
      }

      for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
          const a = alive[i], b = alive[j];
          if (!a.rigidbody && !b.rigidbody) continue;
          const layerA = a.rigidbody?.collisionLayer ?? 1;
          const maskA = a.rigidbody?.collisionMask ?? 0xFFFF;
          const layerB = b.rigidbody?.collisionLayer ?? 1;
          const maskB = b.rigidbody?.collisionMask ?? 0xFFFF;
          if (!(layerA & maskB) && !(layerB & maskA)) continue;

          const col = detectCollision(a, b);
          if (!col) continue;
          collisions.push(col);
          const trigA = a.rigidbody?.isTrigger ?? false;
          const trigB = b.rigidbody?.isTrigger ?? false;
          if (!trigA && !trigB) resolvePhysicsCollision(col);
        }
      }
      return collisions;
    }

    function detectCollision(a, b) {
      if (a.shape === 'circle' && b.shape === 'circle') return circleCircle(a, b);
      return aabbCollision(a, b);
    }

    function aabbCollision(a, b) {
      const aL = a.x - a.width/2, aR = a.x + a.width/2, aT = a.y - a.height/2, aB = a.y + a.height/2;
      const bL = b.x - b.width/2, bR = b.x + b.width/2, bT = b.y - b.height/2, bB = b.y + b.height/2;
      if (aL >= bR || aR <= bL || aT >= bB || aB <= bT) return null;
      const overlapX = Math.min(aR - bL, bR - aL);
      const overlapY = Math.min(aB - bT, bB - aT);
      let nx = 0, ny = 0, ox = overlapX, oy = overlapY;
      if (overlapX < overlapY) { nx = a.x < b.x ? -1 : 1; oy = 0; }
      else { ny = a.y < b.y ? -1 : 1; ox = 0; }
      return { a, b, overlapX: ox || overlapX, overlapY: oy || overlapY, normalX: nx, normalY: ny };
    }

    function circleCircle(a, b) {
      const rA = Math.min(a.width, a.height) / 2;
      const rB = Math.min(b.width, b.height) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = rA + rB;
      if (dist >= minDist) return null;
      const overlap = minDist - dist;
      const nx = dist > 0 ? dx/dist : 1;
      const ny = dist > 0 ? dy/dist : 0;
      return { a, b, overlapX: overlap, overlapY: overlap, normalX: -nx, normalY: -ny };
    }

    function resolvePhysicsCollision(col) {
      const { a, b, normalX, normalY } = col;
      const rbA = a.rigidbody, rbB = b.rigidbody;
      const staticA = rbA?.isStatic || rbA?.isKinematic || false;
      const staticB = rbB?.isStatic || rbB?.isKinematic || false;
      const overlap = normalX !== 0 ? col.overlapX : col.overlapY;

      if (staticA && !staticB) {
        b.x -= normalX * overlap; b.y -= normalY * overlap;
        if (rbB) {
          if (normalX !== 0) rbB.velocityX *= -(rbB.restitution);
          if (normalY !== 0) { rbB.velocityY *= -(rbB.restitution); if (normalY < 0) b.onGround = true; }
        }
      } else if (!staticA && staticB) {
        a.x += normalX * overlap; a.y += normalY * overlap;
        if (rbA) {
          if (normalX !== 0) rbA.velocityX *= -(rbA.restitution);
          if (normalY !== 0) { rbA.velocityY *= -(rbA.restitution); if (normalY > 0) a.onGround = true; }
        }
      } else if (!staticA && !staticB) {
        const totalMass = (rbA?.mass || 1) + (rbB?.mass || 1);
        const ratioA = (rbB?.mass || 1) / totalMass;
        const ratioB = (rbA?.mass || 1) / totalMass;
        a.x += normalX * overlap * ratioA; a.y += normalY * overlap * ratioA;
        b.x -= normalX * overlap * ratioB; b.y -= normalY * overlap * ratioB;
        const restitution = Math.min(rbA?.restitution || 0, rbB?.restitution || 0);
        if (normalX !== 0) {
          const relVel = (rbA?.velocityX || 0) - (rbB?.velocityX || 0);
          const impulse = -(1 + restitution) * relVel / totalMass;
          if (rbA) rbA.velocityX += impulse * (rbB?.mass || 1);
          if (rbB) rbB.velocityX -= impulse * (rbA?.mass || 1);
        }
        if (normalY !== 0) {
          const relVel = (rbA?.velocityY || 0) - (rbB?.velocityY || 0);
          const impulse = -(1 + restitution) * relVel / totalMass;
          if (rbA) rbA.velocityY += impulse * (rbB?.mass || 1);
          if (rbB) rbB.velocityY -= impulse * (rbA?.mass || 1);
        }
      }
    }

    /* ═══════════════════════════════════════
       Entity Factory
       ═══════════════════════════════════════ */
    function createEntity(data) {
      return {
        ...data,
        alive: true,
        visible: true,
        vx: data.vx || 0,
        vy: data.vy || 0,
        onGround: false,
        patrolOriginX: data.x,
        patrolOriginY: data.y,
        patrolDir: 1,
        bouncePhase: Math.random() * Math.PI * 2,
        originalY: data.y,
        originalX: data.x,
        cooldowns: {},
        timers: {},
        spawnCount: 0,
        spawnTimer: 0,
        destroyTimer: 0,
        tweenPhase: 0,
        dialogueIndex: 0,
        dialogueTimer: 0,
        isHovered: false,
        isClicked: false,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        flashTimer: 0,
        lifetime: 0,
        particles: [],
        particleTimer: 0,
        currentState: 'idle',
      };
    }

    /* ═══════════════════════════════════════
       Graphics
       ═══════════════════════════════════════ */
    function drawShape(g, shape, w, h, color) {
      const c = hexToNum(color);
      if (shape === 'circle') g.circle(0, 0, Math.min(w,h)/2).fill({ color: c });
      else if (shape === 'triangle') g.poly([0,-h/2,w/2,h/2,-w/2,h/2]).fill({ color: c });
      else if (shape === 'star') {
        const pts = [], spikes = 5, outerR = Math.min(w,h)/2, innerR = outerR * 0.4;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI / spikes) - Math.PI/2;
          pts.push(Math.cos(angle)*r, Math.sin(angle)*r);
        }
        g.poly(pts).fill({ color: c });
      }
      else g.roundRect(-w/2, -h/2, w, h, 3).fill({ color: c });
    }

    function createGraphic(e) {
      const container = new PIXI.Container();
      container.position.set(e.x, e.y);
      container.rotation = (e.rotation * Math.PI) / 180;
      container.scale.set(e.scaleX, e.scaleY);

      if (e.color && e.color !== '#00000000') {
        const g = new PIXI.Graphics();
        drawShape(g, e.shape, e.width, e.height, e.color);
        container.addChild(g);
      }

      if (e.text !== undefined && e.text !== null) {
        const t = new PIXI.Text({
          text: e.text,
          style: new PIXI.TextStyle({
            fontSize: e.fontSize || 20,
            fill: e.textColor || '#ffffff',
            fontFamily: e.fontFamily || 'Arial',
          }),
        });
        t.anchor.set(0.5);
        container.addChild(t);
      }

      return container;
    }

    /* ═══════════════════════════════════════
       Scene Management
       ═══════════════════════════════════════ */
    function getCurrentScene() {
      return GAME_DATA.scenes.find(s => s.id === currentSceneId) || GAME_DATA.scenes[0];
    }

    function loadScene(sceneId) {
      const scene = GAME_DATA.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      currentSceneId = sceneId;

      entities.length = 0;
      gfxMap.clear();
      while (sceneContainer.children.length) {
        sceneContainer.children[0].destroy({ children: true });
        sceneContainer.removeChildAt(0);
      }

      app.renderer.background.color = hexToNum(scene.backgroundColor);

      const bg = new PIXI.Graphics();
      bg.rect(0, 0, W, H).fill({ color: hexToNum(scene.backgroundColor) });
      sceneContainer.addChild(bg);

      for (const data of scene.entities) {
        const e = createEntity(data);
        entities.push(e);
        const gfx = createGraphic(e);
        sceneContainer.addChild(gfx);
        gfxMap.set(e.id, gfx);
      }

      cameraX = W / 2;
      cameraY = H / 2;
    }

    function initGame() {
      gameState = { score: 0, health: 3, time: 0, isWin: false, isLose: false };
      elapsed = 0;
      overlayMsg = null;
      pendingSceneSwitch = null;
      cameraX = W / 2;
      cameraY = H / 2;

      globals.clear();
      entityVars.clear();
      for (const v of GAME_DATA.globalVariables) globals.set(v.name, v.value);
      setGlobal('score', 0);
      setGlobal('health', 3);

      loadScene(GAME_DATA.activeSceneId || GAME_DATA.scenes[0]?.id);
      document.getElementById('overlay').classList.remove('show');
    }

    function findPlayer() { return entities.find(e => e.type === 'player' && e.alive); }

    /* ═══════════════════════════════════════
       Spawning
       ═══════════════════════════════════════ */
    function spawnEntity(spawn) {
      const id = 's-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
      let behaviors = [];
      let w = 36, h = 36, color = '#ef5350', shape = 'circle';

      if (spawn.type === 'bullet') {
        w = 6; h = 6; color = '#ffff00';
        behaviors = [
          { type: 'projectile', enabled: true, params: { speed: 0, direction: 0, lifetime: 3, destroyOnHit: true, scoreOnKill: 10 } },
        ];
      } else if (spawn.type === 'enemy') {
        behaviors = [
          { type: 'chase', enabled: true, params: { speed: 1.2, range: 300 } },
          { type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } },
        ];
      }

      const ne = createEntity({
        id, type: spawn.type, name: spawn.type,
        x: spawn.x, y: spawn.y, rotation: 0, scaleX: 1, scaleY: 1,
        width: w, height: h, color, shape,
        behaviors, rigidbody: null,
        vx: spawn.vx || 0, vy: spawn.vy || 0,
      });
      entities.push(ne);
      const gfx = createGraphic(ne);
      sceneContainer.addChild(gfx);
      gfxMap.set(ne.id, gfx);
    }

    /* ═══════════════════════════════════════
       Behavior Processing
       ═══════════════════════════════════════ */
    function processBehavior(e, b, dt, player, mx, my) {
      switch (b.type) {

        case 'keyboard-move': {
          const s = b.params.speed || 3;
          if (keys.has('ArrowLeft') || keys.has('a')) e.x -= s;
          if (keys.has('ArrowRight') || keys.has('d')) e.x += s;
          if (b.params.horizontalOnly) {
            if ((keys.has('ArrowUp') || keys.has('w') || keys.has(' ')) && e.onGround) {
              e.vy = -(b.params.jumpForce || 8);
              e.onGround = false;
            }
          } else {
            if (keys.has('ArrowUp') || keys.has('w')) e.y -= s;
            if (keys.has('ArrowDown') || keys.has('s')) e.y += s;
          }
          break;
        }

        case 'physics-move': {
          const rb = e.rigidbody;
          if (!rb) break;
          const moveForce = b.params.moveForce || 5;
          const jumpForce = b.params.jumpForce || 8;
          const maxSpeed = b.params.maxSpeed || 6;
          const airMult = e.onGround ? 1 : (b.params.airControl || 0.3);
          if (keys.has('ArrowLeft') || keys.has('a'))
            rb.velocityX = Math.max(-maxSpeed, rb.velocityX - moveForce * airMult * dt * 4);
          if (keys.has('ArrowRight') || keys.has('d'))
            rb.velocityX = Math.min(maxSpeed, rb.velocityX + moveForce * airMult * dt * 4);
          if ((keys.has('ArrowUp') || keys.has('w') || keys.has(' ')) && e.onGround) {
            rb.velocityY = -jumpForce;
            e.onGround = false;
          }
          break;
        }

        case 'patrol': {
          const s = b.params.speed || 1.5;
          const d = b.params.distance || 120;
          if (b.params.axis === 'vertical') {
            e.y += s * e.patrolDir;
            if (Math.abs(e.y - e.patrolOriginY) > d) e.patrolDir *= -1;
          } else {
            e.x += s * e.patrolDir;
            if (Math.abs(e.x - e.patrolOriginX) > d) e.patrolDir *= -1;
          }
          break;
        }

        case 'chase': {
          if (!player) break;
          const s = b.params.speed || 1.2;
          const r = b.params.range || 200;
          const dx = player.x - e.x, dy = player.y - e.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < r && dist > 1) { e.x += (dx/dist)*s; e.y += (dy/dist)*s; }
          break;
        }

        case 'follow-mouse': {
          const s = b.params.speed || 5;
          if (b.params.smooth) { e.x += (mx - e.x) * s * dt; e.y += (my - e.y) * s * dt; }
          else { e.x = mx; e.y = my; }
          break;
        }

        case 'rotate': {
          e.rotation += (b.params.speed || 60) * dt;
          break;
        }

        case 'bounce': {
          const force = b.params.force || 2;
          e.bouncePhase += dt * 3;
          e.y = e.originalY + Math.sin(e.bouncePhase) * force * 3;
          break;
        }

        case 'gravity': {
          const force = b.params.force || 0.3;
          const maxFall = b.params.maxFall || 6;
          e.vy = Math.min(e.vy + force, maxFall);
          e.y += e.vy;
          break;
        }

        case 'collectible': {
          if (!player || !checkAABB(player, e)) break;
          gameState.score += (b.params.points || 0);
          setGlobal('score', gameState.score);
          if (b.params.destroyOnCollect) { e.alive = false; removeQueue.push(e.id); }
          break;
        }

        case 'obstacle': {
          if (!player || !checkAABB(player, e)) break;
          if (getCooldown(e, 'obs')) break;
          gameState.health -= (b.params.damage || 1);
          setGlobal('health', gameState.health);
          setCooldown(e, 'obs', 0.5);
          if (b.params.destroyPlayer || gameState.health <= 0) {
            gameState.isLose = true; overlayMsg = '游戏结束';
          }
          const dx = player.x - e.x, dy = player.y - e.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          player.x += (dx/d) * 20; player.y += (dy/d) * 20;
          break;
        }

        case 'damage-on-contact': {
          const dmg = b.params.damage || 1;
          const cd = b.params.cooldown || 0.5;
          const kb = b.params.knockback || 10;
          if (getCooldown(e, 'dmg')) break;
          for (const o of entities) {
            if (o === e || !o.alive || o.type === e.type) continue;
            if (!checkAABB(e, o)) continue;
            const hsB = o.behaviors.find(ob => ob.type === 'health-system');
            if (hsB) {
              const curHp = getEntityVar(o.id, 'hp');
              if (typeof curHp === 'number') {
                setEntityVar(o.id, 'hp', curHp - dmg);
                o.flashTimer = 0.15;
                if (curHp - dmg <= 0) {
                  if (o.type === 'player') { gameState.health = 0; gameState.isLose = true; overlayMsg = '游戏结束'; }
                  else removeQueue.push(o.id);
                }
              }
            }
            if (kb > 0) {
              const dx = o.x - e.x, dy = o.y - e.y;
              const d = Math.sqrt(dx*dx + dy*dy) || 1;
              o.x += (dx/d) * kb; o.y += (dy/d) * kb;
            }
            if (b.params.destroySelf) removeQueue.push(e.id);
            setCooldown(e, 'dmg', cd);
            break;
          }
          break;
        }

        case 'health-system': {
          const maxHp = b.params.maxHp || 3;
          const curHp = getEntityVar(e.id, 'hp');
          if (curHp === undefined) setEntityVar(e.id, 'hp', maxHp);
          if (e.type === 'player') {
            const hp = getEntityVar(e.id, 'hp');
            if (typeof hp === 'number') gameState.health = hp;
          }
          break;
        }

        case 'win-zone': {
          if (player && checkAABB(player, e)) { gameState.isWin = true; overlayMsg = b.params.message || '恭喜通关！'; }
          break;
        }

        case 'lose-zone': {
          if (player && checkAABB(player, e)) { gameState.isLose = true; overlayMsg = b.params.message || '游戏结束'; }
          break;
        }

        case 'platform': {
          if (!player || !checkAABB(player, e)) break;
          const ox = Math.min(player.x + player.width/2 - (e.x - e.width/2), (e.x + e.width/2) - (player.x - player.width/2));
          const oy = Math.min(player.y + player.height/2 - (e.y - e.height/2), (e.y + e.height/2) - (player.y - player.height/2));
          if (ox <= 0 || oy <= 0) break;
          if (ox < oy) {
            player.x += player.x < e.x ? -ox : ox;
            if (player.rigidbody) player.rigidbody.velocityX = 0;
          } else {
            const pushUp = player.y < e.y;
            player.y += pushUp ? -oy : oy;
            if (player.rigidbody) player.rigidbody.velocityY = 0;
            if (pushUp) player.onGround = true;
          }
          player.vy = 0;
          break;
        }

        case 'score-display': {
          e.text = (b.params.prefix || '得分: ') + gameState.score;
          break;
        }

        case 'health-display': {
          const max = b.params.maxHealth || 3;
          const hp = Math.max(0, gameState.health);
          e.text = b.params.showHearts ? 'HP: ' + '❤'.repeat(hp) + '♡'.repeat(Math.max(0, max - hp)) : 'HP: ' + hp + '/' + max;
          break;
        }

        case 'timer-display': {
          const total = b.params.seconds || 60;
          if (b.params.countDown) {
            const rem = Math.max(0, total - elapsed);
            e.text = '时间: ' + Math.ceil(rem);
            if (rem <= 0 && b.params.loseOnZero) { gameState.isLose = true; overlayMsg = '时间到！'; }
          } else { e.text = '时间: ' + Math.floor(elapsed); }
          break;
        }

        case 'click-action': {
          if (isPointIn(mx, my, e.x, e.y, e.width, e.height) && mouse.justPressed) {
            if (b.params.action === 'destroy') removeQueue.push(e.id);
            else if (b.params.action === 'score') { gameState.score++; setGlobal('score', gameState.score); }
          }
          break;
        }

        case 'clickable': {
          const isOver = isPointIn(mx, my, e.x, e.y, e.width, e.height);
          if (isOver && mouse.justPressed) {
            e.isClicked = b.params.toggle ? !e.isClicked : true;
            const action = b.params.action;
            if (action === 'addScore') {
              gameState.score += (b.params.actionValue || 1);
              setGlobal('score', gameState.score);
            } else if (action === 'setVariable') {
              const vn = b.params.actionVariable;
              if (vn) setGlobal(vn, b.params.actionValue);
            }
          }
          break;
        }

        case 'button': {
          const isOver = isPointIn(mx, my, e.x, e.y, e.width, e.height);
          e.isHovered = isOver;
          if (isOver && mouse.justPressed) {
            const action = b.params.action;
            if (action === 'resetPositions') {
              for (const re of entities) {
                if (re.behaviors.some(ob => ob.type === 'draggable')) {
                  re.x = re.originalX; re.y = re.originalY;
                  re.cooldowns = {};
                }
              }
              gameState.score = 0; setGlobal('score', 0);
            } else if (action === 'addScore') {
              gameState.score += (b.params.actionValue || 1);
              setGlobal('score', gameState.score);
            } else if (action === 'setVariable') {
              const vn = b.params.actionVariable;
              if (vn) setGlobal(vn, b.params.actionValue);
            } else if (action === 'advanceDialogue') {
              for (const re of entities) {
                if (re.behaviors.some(ob => ob.type === 'dialogue-box')) {
                  re.dialogueIndex++; re.dialogueTimer = 0;
                }
              }
            }
          }
          if (e.text === undefined || e.text === null) e.text = b.params.label;
          break;
        }

        case 'hoverable': {
          const over = isPointIn(mx, my, e.x, e.y, e.width, e.height);
          e.isHovered = over;
          const scale = b.params.scaleOnHover || 1.15;
          e.scaleX = over ? scale : 1;
          e.scaleY = e.scaleX;
          break;
        }

        case 'draggable': {
          const over = isPointIn(mx, my, e.x, e.y, e.width, e.height);
          if (over && mouse.justPressed) {
            e.isDragging = true;
            e.dragOffsetX = mx - e.x;
            e.dragOffsetY = my - e.y;
          }
          if (e.isDragging) {
            if (!mouse.pressed) {
              e.isDragging = false;
              let snapped = false;
              for (const other of entities) {
                if (other === e || !other.alive) continue;
                if (other.type !== 'puzzle-target' && other.type !== 'card-slot') continue;
                const ddx = e.x - other.x, ddy = e.y - other.y;
                const dist = Math.sqrt(ddx*ddx + ddy*ddy);
                if (dist < 45) {
                  e.x = other.x; e.y = other.y;
                  snapped = true;
                  const placeKey = 'placed-' + other.id;
                  if (!e.cooldowns[placeKey]) {
                    e.cooldowns[placeKey] = 99999;
                    gameState.score += 1;
                    setGlobal('score', gameState.score);
                  }
                  break;
                }
              }
              if (!snapped && b.params.snapToGrid) {
                const grid = b.params.gridSize || 40;
                e.x = Math.round(e.x / grid) * grid;
                e.y = Math.round(e.y / grid) * grid;
              }
            } else {
              e.x = mx - e.dragOffsetX;
              e.y = my - e.dragOffsetY;
              if (b.params.bounds) {
                e.x = Math.max(e.width/2, Math.min(W - e.width/2, e.x));
                e.y = Math.max(e.height/2, Math.min(H - e.height/2, e.y));
              }
            }
          }
          break;
        }

        case 'shooter': {
          if (getCooldown(e, 'shoot')) break;
          const shouldFire = b.params.autoFire || mouse.pressed || keys.has('f') || keys.has('j');
          if (!shouldFire) break;
          let angle = b.params.aimAtMouse ? Math.atan2(my - e.y, mx - e.x) : (e.rotation * Math.PI) / 180;
          const bs = b.params.bulletSpeed || 8;
          spawnQueue.push({
            type: 'bullet',
            x: e.x + Math.cos(angle) * (e.width/2 + 5),
            y: e.y + Math.sin(angle) * (e.height/2 + 5),
            vx: Math.cos(angle) * bs,
            vy: Math.sin(angle) * bs,
          });
          setCooldown(e, 'shoot', b.params.fireRate || 0.3);
          break;
        }

        case 'projectile': {
          const s = b.params.speed || 5;
          const dir = b.params.direction || 0;
          const lt = b.params.lifetime || 3;
          if (e.vx === 0 && e.vy === 0) {
            const r = (dir * Math.PI) / 180;
            e.vx = Math.cos(r) * s; e.vy = Math.sin(r) * s;
          }
          e.x += e.vx; e.y += e.vy; e.lifetime += dt;
          if (e.lifetime > lt || e.x < -50 || e.x > W + 50 || e.y < -50 || e.y > H + 50) {
            removeQueue.push(e.id);
            break;
          }
          if (b.params.destroyOnHit) {
            for (const o of entities) {
              if (o === e || !o.alive || o.type === e.type || o.type === 'player' || o.type === 'bullet') continue;
              if (!checkAABB(e, o)) continue;
              removeQueue.push(e.id);
              const hb = o.behaviors.find(ob => ob.type === 'health-system' || ob.type === 'destroyable');
              if (hb) {
                const hp = getEntityVar(o.id, 'hp');
                if (typeof hp === 'number') {
                  setEntityVar(o.id, 'hp', hp - 1);
                  o.flashTimer = 0.1;
                  if (hp - 1 <= 0) {
                    removeQueue.push(o.id);
                    gameState.score += (b.params.scoreOnKill || 10);
                    setGlobal('score', gameState.score);
                  }
                }
              }
              break;
            }
          }
          break;
        }

        case 'timer': {
          const dur = b.params.duration || 2;
          const repeat = !!b.params.repeat;
          const evName = b.params.eventName || 'timer-done';
          const key = 'timer-' + b.type + '-' + evName;
          if (!e.timers[key]) e.timers[key] = { elapsed: 0, duration: dur, repeat, fired: false };
          const tm = e.timers[key];
          tm.elapsed += dt;
          if (tm.elapsed >= tm.duration && !tm.fired) {
            const action = b.params.onFireAction;
            if (action === 'addScore') {
              const val = b.params.onFireValue || 1;
              gameState.score += val;
              setGlobal('score', gameState.score);
            } else if (action === 'setVariable') {
              const vn = b.params.onFireVariable;
              const vv = b.params.onFireValue || 1;
              if (vn) setGlobal(vn, (getGlobal(vn) || 0) + vv);
            }
            if (repeat) tm.elapsed = 0;
            else tm.fired = true;
          }
          break;
        }

        case 'condition-check': {
          const variable = b.params.variable || 'score';
          const operator = b.params.operator || '>=';
          const rawValue = b.params.value;
          const value = typeof rawValue === 'string' && /[a-zA-Z_+\\-*/]/.test(rawValue)
            ? evalExpr(rawValue, buildVarContext()) : rawValue;
          const evName = b.params.eventName || 'condition-met';
          if (varEvaluate(variable, operator, value)) {
            if (!getCooldown(e, 'cond-' + evName)) {
              setCooldown(e, 'cond-' + evName, 1);
              const action = b.params.action;
              if (action === 'win') { gameState.isWin = true; overlayMsg = b.params.message || '恭喜通关！'; }
              else if (action === 'lose') { gameState.isLose = true; overlayMsg = b.params.message || '游戏结束'; }
              else if (action === 'message') { overlayMsg = b.params.message || '条件满足！'; }
            }
          }
          break;
        }

        case 'destroy-self': {
          const delay = b.params.delay || 3;
          e.destroyTimer += dt;
          if (b.params.fadeOut) { e.scaleX = Math.max(0, 1 - e.destroyTimer / delay); e.scaleY = e.scaleX; }
          if (e.destroyTimer >= delay) removeQueue.push(e.id);
          break;
        }

        case 'tween': {
          const dur = b.params.duration || 1;
          const yoyo = !!b.params.yoyo;
          const loop = !!b.params.loop;
          const from = b.params.from || 0;
          const to = b.params.to || 0;
          const prop = b.params.property || 'y';
          e.tweenPhase += dt / dur;
          let t = e.tweenPhase % 1;
          if (yoyo) { const c = Math.floor(e.tweenPhase) % 2; t = c === 1 ? 1 - t : t; }
          if (!loop && e.tweenPhase >= 1) t = 1;
          const eased = (1 - Math.cos(t * Math.PI)) / 2;
          const v = from + (to - from) * eased;
          if (prop === 'x') e.x = e.originalX + v;
          else if (prop === 'y') e.y = e.originalY + v;
          else if (prop === 'rotation') e.rotation = v;
          else if (prop === 'scaleX' || prop === 'scaleY') { e.scaleX = v; e.scaleY = v; }
          break;
        }

        case 'dialogue-box': {
          const dialogues = (b.params.dialogues || '').split('|');
          const speed = b.params.speed || 30;
          if (e.dialogueIndex < dialogues.length) {
            const cur = dialogues[e.dialogueIndex];
            e.dialogueTimer += dt;
            const chars = Math.min(cur.length, Math.floor(e.dialogueTimer * speed));
            e.text = cur.substring(0, chars);
            if (chars >= cur.length) {
              const advance = b.params.autoAdvance || mouse.justPressed || keys.has('Enter') || keys.has(' ');
              if (advance) { e.dialogueIndex++; e.dialogueTimer = 0; }
            }
          }
          break;
        }

        case 'progress-bar': {
          const varName = b.params.variable || 'health';
          const maxVal = b.params.maxValue || 3;
          const cur = getGlobal(varName) || 0;
          if (typeof cur === 'number') {
            const pct = Math.max(0, Math.min(1, cur / maxVal));
            e.text = '█'.repeat(Math.round(pct * 10)) + '░'.repeat(10 - Math.round(pct * 10));
          }
          break;
        }

        case 'spawn-on-interval':
        case 'spawn-entity': {
          const interval = b.params.interval || 2;
          const limit = b.params.limit || 10;
          const eType = b.params.entityType || 'enemy';
          e.spawnTimer += dt;
          if (e.spawnTimer >= interval && e.spawnCount < limit) {
            const ox = b.params.offsetX || 0;
            const oy = b.params.offsetY || 0;
            spawnQueue.push({ type: eType, x: e.x + ox, y: e.y + oy });
            e.spawnTimer = 0; e.spawnCount++;
          }
          break;
        }

        case 'particle-emitter': {
          const count = b.params.count || 20;
          const speed = b.params.speed || 3;
          const lt = b.params.lifetime || 1;
          const spread = b.params.spread || 360;
          const color = b.params.color || '#ffaa00';
          const size = b.params.size || 4;
          const grav = b.params.gravity || 0.5;
          const continuous = !!b.params.continuous;
          const interval = b.params.interval || 0.05;

          for (let i = e.particles.length - 1; i >= 0; i--) {
            const p = e.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += grav * dt;
            p.life -= dt;
            if (p.life <= 0) e.particles.splice(i, 1);
          }

          if (continuous) {
            e.particleTimer += dt;
            while (e.particleTimer >= interval && e.particles.length < count * 3) {
              e.particleTimer -= interval;
              const angle = (Math.random() * spread - spread/2) * Math.PI / 180;
              const spd = speed * (0.5 + Math.random() * 0.5);
              e.particles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle - Math.PI/2) * spd,
                vy: Math.sin(angle - Math.PI/2) * spd,
                life: lt * (0.5 + Math.random() * 0.5),
                maxLife: lt, color, size,
              });
            }
          } else if (e.particles.length === 0 && e.particleTimer === 0) {
            for (let i = 0; i < count; i++) {
              const angle = (Math.random() * spread - spread/2) * Math.PI / 180;
              const spd = speed * (0.5 + Math.random() * 0.5);
              e.particles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle - Math.PI/2) * spd,
                vy: Math.sin(angle - Math.PI/2) * spd,
                life: lt * (0.5 + Math.random() * 0.5),
                maxLife: lt, color, size,
              });
            }
            e.particleTimer = 1;
          }
          break;
        }

        case 'camera-follow': {
          const smoothing = b.params.smoothing || 0.08;
          const ox = b.params.offsetX || 0;
          const oy = b.params.offsetY || 0;
          const deadZone = b.params.deadZone || 30;
          const targetX = e.x + ox;
          const targetY = e.y + oy;
          const dx = targetX - cameraX;
          const dy = targetY - cameraY;
          if (Math.abs(dx) > deadZone || Math.abs(dy) > deadZone) {
            cameraX += dx * smoothing;
            cameraY += dy * smoothing;
          }
          break;
        }

        case 'screen-wrap': {
          const margin = b.params.margin || 10;
          if (e.x < -margin) e.x = W + margin;
          if (e.x > W + margin) e.x = -margin;
          if (e.y < -margin) e.y = H + margin;
          if (e.y > H + margin) e.y = -margin;
          break;
        }

        case 'scene-switch': {
          const targetScene = b.params.targetScene;
          const trigger = b.params.trigger || 'collision';
          if (!targetScene) break;
          if (trigger === 'collision') {
            for (const o of entities) {
              if (o.id === e.id || !o.alive || o.type !== 'player') continue;
              if (checkAABB(e, o)) { pendingSceneSwitch = targetScene; }
            }
          }
          break;
        }

        case 'play-sound': break;

        case 'state-machine': break;

        case 'destroyable': {
          const hp = b.params.hp || 1;
          if (getEntityVar(e.id, 'hp') === undefined) setEntityVar(e.id, 'hp', hp);
          break;
        }
      }
    }

    /* ═══════════════════════════════════════
       Main Tick
       ═══════════════════════════════════════ */
    function tick(dt) {
      if (overlayMsg) return;
      elapsed += dt;
      gameState.time = elapsed;
      spawnQueue = [];
      removeQueue = [];

      const mx = mouse.x;
      const my = mouse.y;
      const player = findPlayer();

      physicsStep(dt);

      for (const e of entities) {
        if (!e.alive) continue;
        for (const k of Object.keys(e.cooldowns)) {
          if (e.cooldowns[k] > 0) e.cooldowns[k] -= dt;
        }
        if (e.flashTimer > 0) e.flashTimer -= dt;
      }

      for (const e of entities) {
        if (!e.alive || !e.visible) continue;
        for (const b of e.behaviors) {
          processBehavior(e, b, dt, player, mx, my);
        }
      }

      for (const s of spawnQueue) spawnEntity(s);
      for (const id of removeQueue) { const e = entities.find(x => x.id === id); if (e) e.alive = false; }

      /* Render particles */
      particleGfx.clear();
      for (const e of entities) {
        if (!e.alive || !e.particles) continue;
        for (const p of e.particles) {
          const alpha = Math.max(0, p.life / p.maxLife);
          const drawX = p.x - (cameraX - W/2);
          const drawY = p.y - (cameraY - H/2);
          particleGfx.circle(drawX, drawY, p.size).fill({ color: hexToNum(p.color), alpha });
        }
      }

      /* Camera offset */
      sceneContainer.position.set(-(cameraX - W/2), -(cameraY - H/2));

      /* Update graphics */
      for (const e of entities) {
        const gfx = gfxMap.get(e.id);
        if (!gfx) continue;
        if (!e.alive) { gfx.visible = false; continue; }
        gfx.visible = e.visible;
        gfx.position.set(e.x, e.y);
        gfx.rotation = (e.rotation * Math.PI) / 180;
        gfx.scale.set(e.scaleX, e.scaleY);
        gfx.alpha = e.flashTimer > 0 ? (Math.sin(e.flashTimer * 30) > 0 ? 0.3 : 1) : 1;
        for (const ch of gfx.children) {
          if (ch instanceof PIXI.Text && e.text !== undefined) ch.text = e.text;
        }
      }

      mouse.justPressed = false;

      /* Scene switch */
      if (pendingSceneSwitch) {
        const target = pendingSceneSwitch;
        pendingSceneSwitch = null;
        loadScene(target);
      }

      /* Overlay */
      if (overlayMsg) showOverlay(overlayMsg, gameState.isWin);
    }

    function showOverlay(msg, isWin) {
      const el = document.getElementById('overlay');
      el.classList.add('show');
      document.getElementById('overlay-msg').textContent = msg;
      document.getElementById('overlay-msg').style.color = isWin ? '#4caf50' : '#f44336';
      document.getElementById('overlay-hint').textContent = '最终得分: ' + gameState.score;
    }

    document.getElementById('restart-btn').addEventListener('click', initGame);

    initGame();
    app.ticker.add(ticker => tick(ticker.deltaTime / 60));

    console.log('${project.name} — 由游戏编辑器导出');
  </script>
</body>
</html>`;
}
