import type { Entity, ComponentData, BehaviorConfig, GameState, RigidBodyData } from '@/types';
import { physicsStep, checkAABB, raycast, type CollisionPair } from './physics';
import { EventBus, EVENTS } from './eventBus';
import { VariableStore } from './variableSystem';
import { InputManager } from './inputManager';
import { evaluateExpression } from './expression';

export interface RuntimeEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  color: string;
  shape: string;
  text?: string;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
  imageAssetId?: string;
  behaviors: BehaviorConfig[];
  visible: boolean;
  alive: boolean;
  vx: number;
  vy: number;
  onGround: boolean;
  rigidBody: RigidBodyData | null;
  // Patrol state
  patrolOriginX: number;
  patrolOriginY: number;
  patrolDir: number;
  // Bounce anim
  bouncePhase: number;
  originalY: number;
  originalX: number;
  // State machine
  currentState: string;
  // Timers
  timers: Map<string, { elapsed: number; duration: number; repeat: boolean; eventName: string; fired: boolean }>;
  // Cooldowns
  cooldowns: Map<string, number>;
  // Tween
  tweenPhase: number;
  // Dialogue
  dialogueIndex: number;
  dialogueCharIndex: number;
  dialogueTimer: number;
  // Destroy-self
  destroyTimer: number;
  // Spawn counter
  spawnCount: number;
  spawnTimer: number;
  // Hovered/clicked state
  isHovered: boolean;
  isClicked: boolean;
  // Drag state
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  // Flash effect
  flashTimer: number;
  // Projectile lifetime
  lifetime: number;
  // Particles
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>;
  particleTimer: number;
  // Raycast beams for rendering
  raycastBeams: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>;
}

export interface RuntimeState {
  entities: Map<string, RuntimeEntity>;
  keys: Set<string>;
  input: InputManager;
  eventBus: EventBus;
  variables: VariableStore;
  gameState: GameState;
  elapsed: number;
  overlay: string | null;
  gravity: number;
  spawnQueue: Array<{ type: string; x: number; y: number; vx?: number; vy?: number }>;
  removeQueue: string[];
  worldWidth: number;
  worldHeight: number;
  cameraX: number;
  cameraY: number;
  pendingSceneSwitch: string | null;
}

export function createRuntimeEntity(entity: Entity): RuntimeEntity {
  const t = entity.components.find(c => c.type === 'transform') as Extract<ComponentData, { type: 'transform' }> | undefined;
  const s = entity.components.find(c => c.type === 'sprite') as Extract<ComponentData, { type: 'sprite' }> | undefined;
  const tx = entity.components.find(c => c.type === 'text') as Extract<ComponentData, { type: 'text' }> | undefined;
  const rb = entity.components.find(c => c.type === 'rigidbody') as Extract<ComponentData, { type: 'rigidbody' }> | undefined;

  const smBehavior = entity.behaviors.find(b => b.type === 'state-machine');
  const initialState = (smBehavior?.params.initialState as string) || 'idle';

  return {
    id: entity.id,
    type: entity.type,
    x: t?.data.x ?? 0,
    y: t?.data.y ?? 0,
    rotation: t?.data.rotation ?? 0,
    scaleX: t?.data.scaleX ?? 1,
    scaleY: t?.data.scaleY ?? 1,
    width: s?.data.width ?? 40,
    height: s?.data.height ?? 40,
    color: s?.data.color ?? '#7c5cfc',
    shape: s?.data.shape ?? 'rectangle',
    text: tx?.data.content,
    fontSize: tx?.data.fontSize,
    textColor: tx?.data.color,
    fontFamily: tx?.data.fontFamily,
    imageAssetId: s?.data.imageAssetId,
    behaviors: entity.behaviors.filter(b => b.enabled),
    visible: entity.visible,
    alive: true,
    vx: 0,
    vy: 0,
    onGround: false,
    rigidBody: rb ? { ...rb.data } : null,
    patrolOriginX: t?.data.x ?? 0,
    patrolOriginY: t?.data.y ?? 0,
    patrolDir: 1,
    bouncePhase: Math.random() * Math.PI * 2,
    originalY: t?.data.y ?? 0,
    originalX: t?.data.x ?? 0,
    currentState: initialState,
    timers: new Map(),
    cooldowns: new Map(),
    tweenPhase: 0,
    dialogueIndex: 0,
    dialogueCharIndex: 0,
    dialogueTimer: 0,
    destroyTimer: 0,
    spawnCount: 0,
    spawnTimer: 0,
    isHovered: false,
    isClicked: false,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    flashTimer: 0,
    lifetime: 0,
    particles: [],
    particleTimer: 0,
    raycastBeams: [],
  };
}

function findPlayer(state: RuntimeState): RuntimeEntity | undefined {
  for (const e of state.entities.values()) {
    if (e.type === 'player' && e.alive) return e;
  }
  return undefined;
}

function getCooldown(entity: RuntimeEntity, key: string): boolean {
  const t = entity.cooldowns.get(key);
  return t !== undefined && t > 0;
}

function setCooldown(entity: RuntimeEntity, key: string, time: number) {
  entity.cooldowns.set(key, time);
}

export function tickRuntime(state: RuntimeState, dt: number): void {
  if (state.overlay) return;
  state.elapsed += dt;
  state.spawnQueue = [];
  state.removeQueue = [];

  // Update input
  const input = state.input;
  const mx = input.mouse.worldX;
  const my = input.mouse.worldY;

  // Reset onGround for all entities
  for (const entity of state.entities.values()) {
    if (entity.alive) entity.onGround = false;
  }

  // Physics step
  const collisions = physicsStep(state, dt);

  // Process collision events
  for (const col of collisions) {
    const triggerA = col.a.rigidBody?.isTrigger ?? false;
    const triggerB = col.b.rigidBody?.isTrigger ?? false;
    if (triggerA || triggerB) {
      state.eventBus.emit(EVENTS.TRIGGER_ENTER, { entityA: col.a.id, entityB: col.b.id });
    } else {
      state.eventBus.emit(EVENTS.COLLISION_ENTER, { entityA: col.a.id, entityB: col.b.id });
    }
  }

  const player = findPlayer(state);

  // Update cooldowns
  for (const entity of state.entities.values()) {
    if (!entity.alive) continue;
    for (const [key, val] of entity.cooldowns) {
      if (val > 0) entity.cooldowns.set(key, val - dt);
    }
    if (entity.flashTimer > 0) entity.flashTimer -= dt;
  }

  // Process behaviors
  for (const entity of state.entities.values()) {
    if (!entity.alive || !entity.visible) continue;

    for (const b of entity.behaviors) {
      processBehavior(entity, b, state, player, dt, mx, my, collisions);
    }
  }

  // Process spawns
  for (const spawn of state.spawnQueue) {
    spawnBullet(state, spawn);
  }

  // Process removals
  for (const id of state.removeQueue) {
    const e = state.entities.get(id);
    if (e) {
      e.alive = false;
      state.eventBus.emit(EVENTS.ENTITY_DESTROYED, { entityId: id });
    }
  }
}

function processBehavior(
  entity: RuntimeEntity,
  b: BehaviorConfig,
  state: RuntimeState,
  player: RuntimeEntity | undefined,
  dt: number,
  mx: number,
  my: number,
  collisions: CollisionPair[]
) {
  switch (b.type) {
    case 'keyboard-move': {
      const speed = (b.params.speed as number) || 3;
      if (b.params.useArrows || b.params.useWASD) {
        if (state.keys.has('ArrowLeft') || state.keys.has('a')) entity.x -= speed;
        if (state.keys.has('ArrowRight') || state.keys.has('d')) entity.x += speed;
        if (b.params.horizontalOnly) {
          if ((state.keys.has('ArrowUp') || state.keys.has('w') || state.keys.has(' ')) && entity.onGround) {
            entity.vy = -((b.params.jumpForce as number) || 8);
            entity.onGround = false;
          }
        } else {
          if (state.keys.has('ArrowUp') || state.keys.has('w')) entity.y -= speed;
          if (state.keys.has('ArrowDown') || state.keys.has('s')) entity.y += speed;
        }
      }
      break;
    }

    case 'physics-move': {
      const rb = entity.rigidBody;
      if (!rb) break;
      const moveForce = (b.params.moveForce as number) || 5;
      const jumpForce = (b.params.jumpForce as number) || 8;
      const maxSpeed = (b.params.maxSpeed as number) || 6;
      const airMult = entity.onGround ? 1 : ((b.params.airControl as number) || 0.3);

      if (state.keys.has('ArrowLeft') || state.keys.has('a')) {
        rb.velocityX = Math.max(-maxSpeed, rb.velocityX - moveForce * airMult * dt * 4);
      }
      if (state.keys.has('ArrowRight') || state.keys.has('d')) {
        rb.velocityX = Math.min(maxSpeed, rb.velocityX + moveForce * airMult * dt * 4);
      }
      if ((state.keys.has('ArrowUp') || state.keys.has('w') || state.keys.has(' ')) && entity.onGround) {
        rb.velocityY = -jumpForce;
        entity.onGround = false;
      }
      break;
    }

    case 'patrol': {
      const speed = (b.params.speed as number) || 1.5;
      const dist = (b.params.distance as number) || 120;
      const axis = b.params.axis as string;
      if (axis === 'vertical') {
        entity.y += speed * entity.patrolDir;
        if (Math.abs(entity.y - entity.patrolOriginY) > dist) entity.patrolDir *= -1;
      } else {
        entity.x += speed * entity.patrolDir;
        if (Math.abs(entity.x - entity.patrolOriginX) > dist) entity.patrolDir *= -1;
      }
      break;
    }

    case 'chase': {
      if (!player) break;
      const speed = (b.params.speed as number) || 1.2;
      const range = (b.params.range as number) || 200;
      const dx = player.x - entity.x;
      const dy = player.y - entity.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < range && d > 1) {
        entity.x += (dx / d) * speed;
        entity.y += (dy / d) * speed;
      }
      break;
    }

    case 'follow-mouse': {
      const speed = (b.params.speed as number) || 5;
      const smooth = b.params.smooth as boolean;
      if (smooth) {
        entity.x += (mx - entity.x) * speed * dt;
        entity.y += (my - entity.y) * speed * dt;
      } else {
        entity.x = mx;
        entity.y = my;
      }
      break;
    }

    case 'move-to-point': {
      const tx = (b.params.targetX as number) || 0;
      const ty = (b.params.targetY as number) || 0;
      const speed = (b.params.speed as number) || 3;
      const dx = tx - entity.x;
      const dy = ty - entity.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > speed) {
        entity.x += (dx / d) * speed;
        entity.y += (dy / d) * speed;
      } else if (!b.params.stopOnArrive) {
        entity.x = tx;
        entity.y = ty;
      }
      break;
    }

    case 'rotate': {
      const speed = (b.params.speed as number) || 60;
      entity.rotation += speed * dt;
      break;
    }

    case 'bounce': {
      const force = (b.params.force as number) || 2;
      entity.bouncePhase += dt * 3;
      entity.y = entity.originalY + Math.sin(entity.bouncePhase) * force * 3;
      break;
    }

    case 'gravity': {
      const force = (b.params.force as number) || 0.3;
      const maxFall = (b.params.maxFall as number) || 6;
      entity.vy = Math.min(entity.vy + force, maxFall);
      entity.y += entity.vy;
      break;
    }

    case 'collectible': {
      if (!player || !checkAABB(player, entity)) break;
      const pts = (b.params.points as number) || 0;
      state.gameState.score += pts;
      state.variables.setGlobal('score', state.gameState.score);
      if (b.params.destroyOnCollect) {
        entity.alive = false;
        state.removeQueue.push(entity.id);
      }
      break;
    }

    case 'obstacle': {
      if (!player || !checkAABB(player, entity)) break;
      if (getCooldown(entity, 'obstacle')) break;
      const dmg = (b.params.damage as number) || 1;
      state.gameState.health -= dmg;
      state.variables.setGlobal('health', state.gameState.health);
      setCooldown(entity, 'obstacle', 0.5);

      if (b.params.destroyPlayer || state.gameState.health <= 0) {
        state.gameState.isLose = true;
        state.overlay = '游戏结束';
      }
      const dx = player.x - entity.x;
      const dy = player.y - entity.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      player.x += (dx / d) * 20;
      player.y += (dy / d) * 20;
      break;
    }

    case 'damage-on-contact': {
      const dmg = (b.params.damage as number) || 1;
      const cooldown = (b.params.cooldown as number) || 0.5;
      const knockback = (b.params.knockback as number) || 10;
      if (getCooldown(entity, 'damage-contact')) break;

      for (const other of state.entities.values()) {
        if (other === entity || !other.alive || other.type === entity.type) continue;
        if (!checkAABB(entity, other)) continue;

        const hsBehavior = other.behaviors.find(ob => ob.type === 'health-system');
        if (hsBehavior) {
          const curHp = state.variables.getEntityVar(other.id, 'hp');
          if (typeof curHp === 'number') {
            state.variables.setEntityVar(other.id, 'hp', curHp - dmg);
            other.flashTimer = 0.15;
            if (curHp - dmg <= 0) {
              if (other.type === 'player') {
                state.gameState.health = 0;
                state.gameState.isLose = true;
                state.overlay = '游戏结束';
              } else {
                state.removeQueue.push(other.id);
              }
            }
          }
        }

        if (knockback > 0) {
          const dx = other.x - entity.x;
          const dy = other.y - entity.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          other.x += (dx / d) * knockback;
          other.y += (dy / d) * knockback;
        }

        if (b.params.destroySelf) {
          state.removeQueue.push(entity.id);
        }
        setCooldown(entity, 'damage-contact', cooldown);
        break;
      }
      break;
    }

    case 'health-system': {
      const maxHp = (b.params.maxHp as number) || 3;
      const curHp = state.variables.getEntityVar(entity.id, 'hp');
      if (curHp === undefined) {
        state.variables.setEntityVar(entity.id, 'hp', maxHp);
      }
      if (entity.type === 'player') {
        const hp = state.variables.getEntityVar(entity.id, 'hp') as number;
        state.gameState.health = hp;
      }
      break;
    }

    case 'destroyable': {
      const hp = (b.params.hp as number) || 1;
      const curHp = state.variables.getEntityVar(entity.id, 'hp');
      if (curHp === undefined) {
        state.variables.setEntityVar(entity.id, 'hp', hp);
      }
      break;
    }

    case 'shooter': {
      const fireRate = (b.params.fireRate as number) || 0.3;
      const bulletSpeed = (b.params.bulletSpeed as number) || 8;
      const autoFire = b.params.autoFire as boolean;
      const aimAtMouse = b.params.aimAtMouse as boolean;

      if (getCooldown(entity, 'shoot')) break;

      const shouldFire = autoFire ||
        state.input.mouse.pressed ||
        state.keys.has('f') || state.keys.has('j');

      if (!shouldFire) break;

      let angle = 0;
      if (aimAtMouse) {
        angle = Math.atan2(my - entity.y, mx - entity.x);
      } else {
        angle = (entity.rotation * Math.PI) / 180;
      }

      state.spawnQueue.push({
        type: 'bullet',
        x: entity.x + Math.cos(angle) * (entity.width / 2 + 5),
        y: entity.y + Math.sin(angle) * (entity.height / 2 + 5),
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
      });

      setCooldown(entity, 'shoot', fireRate);
      break;
    }

    case 'projectile': {
      const speed = (b.params.speed as number) || 5;
      const dir = (b.params.direction as number) || 0;
      const dirRad = (dir * Math.PI) / 180;
      const lt = (b.params.lifetime as number) || 3;

      if (entity.vx === 0 && entity.vy === 0) {
        entity.vx = Math.cos(dirRad) * speed;
        entity.vy = Math.sin(dirRad) * speed;
      }

      entity.x += entity.vx;
      entity.y += entity.vy;
      entity.lifetime += dt;

      if (entity.lifetime > lt ||
        entity.x < -50 || entity.x > state.worldWidth + 50 ||
        entity.y < -50 || entity.y > state.worldHeight + 50) {
        state.removeQueue.push(entity.id);
      }

      if (b.params.destroyOnHit) {
        for (const other of state.entities.values()) {
          if (other === entity || !other.alive || other.type === entity.type) continue;
          if (other.type === 'player' || other.type === 'bullet') continue;
          if (checkAABB(entity, other)) {
            state.removeQueue.push(entity.id);
            const hb = other.behaviors.find(ob => ob.type === 'health-system' || ob.type === 'destroyable');
            if (hb) {
              const hp = state.variables.getEntityVar(other.id, 'hp') as number | undefined;
              if (typeof hp === 'number') {
                state.variables.setEntityVar(other.id, 'hp', hp - 1);
                other.flashTimer = 0.1;
                if (hp - 1 <= 0) {
                  state.removeQueue.push(other.id);
                  state.gameState.score += (b.params.scoreOnKill as number) || 10;
                  state.variables.setGlobal('score', state.gameState.score);
                }
              }
            }
            break;
          }
        }
      }
      break;
    }

    case 'win-zone': {
      if (!player || !checkAABB(player, entity)) break;
      state.gameState.isWin = true;
      state.overlay = (b.params.message as string) || '恭喜通关！';
      break;
    }

    case 'lose-zone': {
      if (!player || !checkAABB(player, entity)) break;
      state.gameState.isLose = true;
      state.overlay = (b.params.message as string) || '游戏结束';
      break;
    }

    case 'platform': {
      if (!player || !checkAABB(player, entity)) break;
      const overlapX = Math.min(player.x + player.width / 2 - (entity.x - entity.width / 2),
        (entity.x + entity.width / 2) - (player.x - player.width / 2));
      const overlapY = Math.min(player.y + player.height / 2 - (entity.y - entity.height / 2),
        (entity.y + entity.height / 2) - (player.y - player.height / 2));
      if (overlapX <= 0 || overlapY <= 0) break;

      if (overlapX < overlapY) {
        player.x += player.x < entity.x ? -overlapX : overlapX;
        if (player.rigidBody) player.rigidBody.velocityX = 0;
      } else {
        const pushUp = player.y < entity.y;
        player.y += pushUp ? -overlapY : overlapY;
        if (player.rigidBody) player.rigidBody.velocityY = 0;
        if (pushUp) player.onGround = true;
      }
      player.vy = 0;
      break;
    }

    case 'spawn-on-interval':
    case 'spawn-entity': {
      const interval = (b.params.interval as number) || 2;
      const limit = (b.params.limit as number) || 10;
      const eType = (b.params.entityType as string) || 'enemy';

      entity.spawnTimer += dt;
      if (entity.spawnTimer >= interval && entity.spawnCount < limit) {
        const ox = (b.params.offsetX as number) || 0;
        const oy = (b.params.offsetY as number) || 0;
        state.spawnQueue.push({ type: eType, x: entity.x + ox, y: entity.y + oy });
        entity.spawnTimer = 0;
        entity.spawnCount++;
      }
      break;
    }

    case 'destroy-self': {
      const delay = (b.params.delay as number) || 3;
      entity.destroyTimer += dt;
      if (b.params.fadeOut) {
        entity.scaleX = Math.max(0, 1 - entity.destroyTimer / delay);
        entity.scaleY = entity.scaleX;
      }
      if (entity.destroyTimer >= delay) {
        state.removeQueue.push(entity.id);
      }
      break;
    }

    case 'clickable': {
      const isOver = state.input.isPointInEntity(mx, my, entity.x, entity.y, entity.width, entity.height);
      if (isOver && state.input.mouse.justPressed) {
        entity.isClicked = b.params.toggle ? !entity.isClicked : true;
        state.eventBus.emit(b.params.eventName as string || EVENTS.ENTITY_CLICKED, { entityId: entity.id });

        const action = b.params.action as string;
        if (action === 'addScore') {
          state.gameState.score += (b.params.actionValue as number) || 1;
          state.variables.setGlobal('score', state.gameState.score);
        } else if (action === 'setVariable') {
          const vn = b.params.actionVariable as string;
          if (vn) state.variables.setGlobal(vn, b.params.actionValue as number | string | boolean);
        }
      }
      break;
    }

    case 'button': {
      const isOver = state.input.isPointInEntity(mx, my, entity.x, entity.y, entity.width, entity.height);
      entity.isHovered = isOver;
      if (isOver && state.input.mouse.justPressed) {
        state.eventBus.emit(b.params.eventName as string || EVENTS.BUTTON_CLICK, { entityId: entity.id, label: b.params.label });

        const action = b.params.action as string;
        if (action === 'resetPositions') {
          for (const re of state.entities.values()) {
            if (re.behaviors.some(ob => ob.type === 'draggable')) {
              re.x = re.originalX;
              re.y = re.originalY;
              re.cooldowns.clear();
            }
          }
          state.gameState.score = 0;
          state.variables.setGlobal('score', 0);
        } else if (action === 'addScore') {
          state.gameState.score += (b.params.actionValue as number) || 1;
          state.variables.setGlobal('score', state.gameState.score);
        } else if (action === 'setVariable') {
          const vn = b.params.actionVariable as string;
          if (vn) state.variables.setGlobal(vn, b.params.actionValue as number | string | boolean);
        } else if (action === 'advanceDialogue') {
          for (const re of state.entities.values()) {
            if (re.behaviors.some(ob => ob.type === 'dialogue-box')) {
              re.dialogueIndex++;
              re.dialogueTimer = 0;
            }
          }
        }
      }
      if (entity.text === undefined) {
        entity.text = b.params.label as string;
      }
      break;
    }

    case 'hoverable': {
      const isOver = state.input.isPointInEntity(mx, my, entity.x, entity.y, entity.width, entity.height);
      entity.isHovered = isOver;
      const scale = (b.params.scaleOnHover as number) || 1.15;
      if (isOver) {
        entity.scaleX = scale;
        entity.scaleY = scale;
      } else {
        entity.scaleX = 1;
        entity.scaleY = 1;
      }
      break;
    }

    case 'draggable': {
      const isOver = state.input.isPointInEntity(mx, my, entity.x, entity.y, entity.width, entity.height);
      if (isOver && state.input.mouse.justPressed) {
        entity.isDragging = true;
        entity.dragOffsetX = mx - entity.x;
        entity.dragOffsetY = my - entity.y;
      }
      if (entity.isDragging) {
        if (!state.input.mouse.pressed) {
          entity.isDragging = false;

          let snapped = false;
          for (const other of state.entities.values()) {
            if (other === entity || !other.alive) continue;
            if (other.type !== 'puzzle-target' && other.type !== 'card-slot') continue;
            const ddx = entity.x - other.x;
            const ddy = entity.y - other.y;
            const dist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dist < 45) {
              entity.x = other.x;
              entity.y = other.y;
              snapped = true;
              const placeKey = 'placed-' + other.id;
              if (!entity.cooldowns.has(placeKey)) {
                entity.cooldowns.set(placeKey, 99999);
                state.gameState.score += 1;
                state.variables.setGlobal('score', state.gameState.score);
                state.eventBus.emit('entity-placed', { entityId: entity.id, targetId: other.id });
              }
              break;
            }
          }

          if (!snapped && b.params.snapToGrid) {
            const grid = (b.params.gridSize as number) || 40;
            entity.x = Math.round(entity.x / grid) * grid;
            entity.y = Math.round(entity.y / grid) * grid;
          }
        } else {
          entity.x = mx - entity.dragOffsetX;
          entity.y = my - entity.dragOffsetY;
          if (b.params.bounds) {
            entity.x = Math.max(entity.width / 2, Math.min(state.worldWidth - entity.width / 2, entity.x));
            entity.y = Math.max(entity.height / 2, Math.min(state.worldHeight - entity.height / 2, entity.y));
          }
        }
      }
      break;
    }

    case 'timer': {
      const dur = (b.params.duration as number) || 2;
      const repeat = b.params.repeat as boolean;
      const eventName = (b.params.eventName as string) || 'timer-done';
      const key = `timer-${b.type}-${eventName}`;

      if (!entity.timers.has(key)) {
        entity.timers.set(key, { elapsed: 0, duration: dur, repeat, eventName, fired: false });
      }
      const timer = entity.timers.get(key)!;
      timer.elapsed += dt;
      if (timer.elapsed >= timer.duration && !timer.fired) {
        state.eventBus.emit(eventName, { entityId: entity.id });

        const action = b.params.onFireAction as string;
        if (action === 'addScore') {
          const val = (b.params.onFireValue as number) || 1;
          state.gameState.score += val;
          state.variables.setGlobal('score', state.gameState.score);
        } else if (action === 'setVariable') {
          const vn = b.params.onFireVariable as string;
          const vv = b.params.onFireValue as number;
          if (vn) state.variables.setGlobal(vn, (state.variables.getGlobal(vn) as number || 0) + (vv || 1));
        }

        if (repeat) {
          timer.elapsed = 0;
        } else {
          timer.fired = true;
        }
      }
      break;
    }

    case 'condition-check': {
      const variable = (b.params.variable as string) || 'score';
      const operator = (b.params.operator as string) || '>=';
      const rawValue = b.params.value;
      const value = typeof rawValue === 'string' && /[a-zA-Z_+\-*/]/.test(rawValue)
        ? evaluateExpression(rawValue, buildVarContext(state))
        : (rawValue as number);
      const eventName = (b.params.eventName as string) || 'condition-met';

      if (state.variables.evaluate(variable, operator, value)) {
        if (!getCooldown(entity, 'cond-' + eventName)) {
          state.eventBus.emit(eventName, { entityId: entity.id, variable, value });
          setCooldown(entity, 'cond-' + eventName, 1);

          const action = b.params.action as string;
          if (action === 'win') {
            state.gameState.isWin = true;
            state.overlay = (b.params.message as string) || '恭喜通关！';
          } else if (action === 'lose') {
            state.gameState.isLose = true;
            state.overlay = (b.params.message as string) || '游戏结束';
          }
        }
      }
      break;
    }

    case 'state-machine': {
      // State is tracked in entity.currentState, can be changed by events
      break;
    }

    case 'dialogue-box': {
      const dialoguesStr = (b.params.dialogues as string) || '';
      const dialogues = dialoguesStr.split('|');
      const speed = (b.params.speed as number) || 30;

      if (entity.dialogueIndex < dialogues.length) {
        const currentText = dialogues[entity.dialogueIndex];
        entity.dialogueTimer += dt;

        const charsToShow = Math.min(currentText.length, Math.floor(entity.dialogueTimer * speed));
        entity.text = currentText.substring(0, charsToShow);

        if (charsToShow >= currentText.length) {
          const advance = b.params.autoAdvance ||
            state.input.mouse.justPressed ||
            state.keys.has('Enter') ||
            state.keys.has(' ');
          if (advance) {
            entity.dialogueIndex++;
            entity.dialogueTimer = 0;
            if (entity.dialogueIndex >= dialogues.length) {
              state.eventBus.emit(EVENTS.DIALOGUE_END, { entityId: entity.id });
            }
          }
        }
      }
      break;
    }

    case 'progress-bar': {
      const varName = (b.params.variable as string) || 'health';
      const maxVal = (b.params.maxValue as number) || 3;
      const curVal = state.variables.getGlobal(varName);
      if (typeof curVal === 'number') {
        const pct = Math.max(0, Math.min(1, curVal / maxVal));
        entity.text = `${'█'.repeat(Math.round(pct * 10))}${'░'.repeat(10 - Math.round(pct * 10))}`;
      }
      break;
    }

    case 'tween': {
      const duration = (b.params.duration as number) || 1;
      const loop = b.params.loop as boolean;
      const yoyo = b.params.yoyo as boolean;
      const from = (b.params.from as number) || 0;
      const to = (b.params.to as number) || 0;
      const prop = (b.params.property as string) || 'y';

      entity.tweenPhase += dt / duration;
      let t = entity.tweenPhase % 1;
      if (yoyo) {
        const cycle = Math.floor(entity.tweenPhase) % 2;
        t = cycle === 1 ? 1 - t : t;
      }
      if (!loop && entity.tweenPhase >= 1) t = 1;

      // Sine easing
      const eased = (1 - Math.cos(t * Math.PI)) / 2;
      const value = from + (to - from) * eased;

      if (prop === 'x') entity.x = entity.originalX + value;
      else if (prop === 'y') entity.y = entity.originalY + value;
      else if (prop === 'rotation') entity.rotation = value;
      else if (prop === 'scaleX' || prop === 'scaleY') {
        entity.scaleX = value;
        entity.scaleY = value;
      }
      break;
    }

    case 'score-display': {
      const prefix = (b.params.prefix as string) || '得分: ';
      entity.text = `${prefix}${state.gameState.score}`;
      break;
    }

    case 'health-display': {
      const max = (b.params.maxHealth as number) || 3;
      if (b.params.showHearts) {
        const full = Math.max(0, state.gameState.health);
        entity.text = 'HP: ' + '❤'.repeat(full) + '♡'.repeat(Math.max(0, max - full));
      } else {
        entity.text = `HP: ${state.gameState.health}/${max}`;
      }
      break;
    }

    case 'timer-display': {
      const total = (b.params.seconds as number) || 60;
      if (b.params.countDown) {
        const remaining = Math.max(0, total - state.elapsed);
        entity.text = `时间: ${Math.ceil(remaining)}`;
        if (remaining <= 0 && b.params.loseOnZero) {
          state.gameState.isLose = true;
          state.overlay = '时间到！';
        }
      } else {
        entity.text = `时间: ${Math.floor(state.elapsed)}`;
      }
      break;
    }

    case 'click-action': {
      const isOver = state.input.isPointInEntity(mx, my, entity.x, entity.y, entity.width, entity.height);
      if (isOver && state.input.mouse.justPressed) {
        const action = (b.params.action as string) || 'destroy';
        if (action === 'destroy') {
          state.removeQueue.push(entity.id);
        } else if (action === 'score') {
          state.gameState.score += 1;
          state.variables.setGlobal('score', state.gameState.score);
        }
      }
      break;
    }

    case 'play-sound': break;

    case 'particle-emitter': {
      const count = (b.params.count as number) || 20;
      const speed = (b.params.speed as number) || 3;
      const lt = (b.params.lifetime as number) || 1;
      const spread = (b.params.spread as number) || 360;
      const color = (b.params.color as string) || '#ffaa00';
      const size = (b.params.size as number) || 4;
      const grav = (b.params.gravity as number) || 0.5;
      const continuous = b.params.continuous as boolean;
      const interval = (b.params.interval as number) || 0.05;

      // Update existing particles
      for (let i = entity.particles.length - 1; i >= 0; i--) {
        const p = entity.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += grav * dt;
        p.life -= dt;
        if (p.life <= 0) entity.particles.splice(i, 1);
      }

      // Emit new particles
      if (continuous) {
        entity.particleTimer += dt;
        while (entity.particleTimer >= interval && entity.particles.length < count * 3) {
          entity.particleTimer -= interval;
          const angle = (Math.random() * spread - spread / 2) * Math.PI / 180;
          const spd = speed * (0.5 + Math.random() * 0.5);
          entity.particles.push({
            x: entity.x, y: entity.y,
            vx: Math.cos(angle - Math.PI / 2) * spd,
            vy: Math.sin(angle - Math.PI / 2) * spd,
            life: lt * (0.5 + Math.random() * 0.5),
            maxLife: lt, color, size,
          });
        }
      } else if (entity.particles.length === 0 && entity.particleTimer === 0) {
        for (let i = 0; i < count; i++) {
          const angle = (Math.random() * spread - spread / 2) * Math.PI / 180;
          const spd = speed * (0.5 + Math.random() * 0.5);
          entity.particles.push({
            x: entity.x, y: entity.y,
            vx: Math.cos(angle - Math.PI / 2) * spd,
            vy: Math.sin(angle - Math.PI / 2) * spd,
            life: lt * (0.5 + Math.random() * 0.5),
            maxLife: lt, color, size,
          });
        }
        entity.particleTimer = 1;
      }
      break;
    }

    case 'camera-follow': {
      const smoothing = (b.params.smoothing as number) || 0.08;
      const ox = (b.params.offsetX as number) || 0;
      const oy = (b.params.offsetY as number) || 0;
      const deadZone = (b.params.deadZone as number) || 30;
      const targetX = entity.x + ox;
      const targetY = entity.y + oy;
      const dx = targetX - state.cameraX;
      const dy = targetY - state.cameraY;
      if (Math.abs(dx) > deadZone || Math.abs(dy) > deadZone) {
        state.cameraX += dx * smoothing;
        state.cameraY += dy * smoothing;
      }
      break;
    }

    case 'screen-wrap': {
      const margin = (b.params.margin as number) || 10;
      if (entity.x < -margin) entity.x = state.worldWidth + margin;
      if (entity.x > state.worldWidth + margin) entity.x = -margin;
      if (entity.y < -margin) entity.y = state.worldHeight + margin;
      if (entity.y > state.worldHeight + margin) entity.y = -margin;
      break;
    }

    case 'raycast-sensor': {
      const dir = ((b.params.direction as number) || 0) * Math.PI / 180;
      const maxDist = (b.params.maxDistance as number) || 300;
      const showBeam = b.params.showBeam as boolean;
      const beamColor = (b.params.beamColor as string) || '#ff0000';

      const dx = Math.cos(dir + entity.rotation * Math.PI / 180);
      const dy = Math.sin(dir + entity.rotation * Math.PI / 180);
      const hit = raycast(state, entity.x, entity.y, dx, dy, maxDist, entity.id);

      entity.raycastBeams = [];
      if (showBeam) {
        const endX = hit ? hit.point.x : entity.x + dx * maxDist;
        const endY = hit ? hit.point.y : entity.y + dy * maxDist;
        entity.raycastBeams.push({ x1: entity.x, y1: entity.y, x2: endX, y2: endY, color: beamColor });
      }

      if (hit) {
        const dmg = (b.params.damageOnHit as number) || 0;
        if (dmg > 0 && !getCooldown(entity, 'ray-dmg')) {
          if (hit.entity.type === 'player') {
            state.gameState.health -= dmg;
            state.variables.set('health', state.gameState.health);
            if (state.gameState.health <= 0) { state.gameState.isLose = true; state.overlay = '游戏结束'; }
          }
          setCooldown(entity, 'ray-dmg', 0.5);
        }
        const eventName = (b.params.eventOnHit as string) || 'raycast-hit';
        state.eventBus.emit(eventName, { entityId: entity.id, hitEntityId: hit.entity.id, hitPoint: hit.point });
      }
      break;
    }

    case 'scene-switch': {
      const targetScene = (b.params.targetScene as string);
      const trigger = (b.params.trigger as string) || 'collision';
      if (!targetScene) break;

      if (trigger === 'collision') {
        for (const other of state.entities.values()) {
          if (other.id === entity.id || !other.alive) continue;
          if (other.type !== 'player') continue;
          const dx = other.x - entity.x;
          const dy = other.y - entity.y;
          const combinedW = (entity.width + other.width) / 2;
          const combinedH = (entity.height + other.height) / 2;
          if (Math.abs(dx) < combinedW && Math.abs(dy) < combinedH) {
            state.pendingSceneSwitch = targetScene;
          }
        }
      } else if (trigger === 'event') {
        // Triggered by event bus
      }
      break;
    }
  }
}

function buildVarContext(state: RuntimeState): Record<string, number> {
  const ctx: Record<string, number> = {
    score: state.gameState.score,
    health: state.gameState.health,
    time: state.gameState.time,
    elapsed: state.elapsed,
    entityCount: state.entities.size,
  };
  for (const [name, val] of state.variables.getAll()) {
    ctx[name] = typeof val === 'number' ? val : 0;
  }
  return ctx;
}

function spawnBullet(state: RuntimeState, spawn: { type: string; x: number; y: number; vx?: number; vy?: number }) {
  const id = `spawned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const bullet: RuntimeEntity = {
    id,
    type: spawn.type,
    x: spawn.x,
    y: spawn.y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    width: 8,
    height: 8,
    color: '#ffff00',
    shape: 'circle',
    behaviors: [],
    visible: true,
    alive: true,
    vx: spawn.vx || 0,
    vy: spawn.vy || 0,
    onGround: false,
    rigidBody: null,
    patrolOriginX: spawn.x,
    patrolOriginY: spawn.y,
    patrolDir: 1,
    bouncePhase: 0,
    originalY: spawn.y,
    originalX: spawn.x,
    currentState: 'idle',
    timers: new Map(),
    cooldowns: new Map(),
    tweenPhase: 0,
    dialogueIndex: 0,
    dialogueCharIndex: 0,
    dialogueTimer: 0,
    destroyTimer: 0,
    spawnCount: 0,
    spawnTimer: 0,
    isHovered: false,
    isClicked: false,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    flashTimer: 0,
    lifetime: 0,
    particles: [],
    particleTimer: 0,
    raycastBeams: [],
  };

  if (spawn.type === 'bullet') {
    bullet.behaviors = [
      { type: 'projectile', enabled: true, params: { speed: 0, direction: 0, lifetime: 3, destroyOnHit: true, scoreOnKill: 10 } },
    ];
    bullet.width = 6;
    bullet.height = 6;
  } else if (spawn.type === 'enemy') {
    bullet.color = '#ef5350';
    bullet.width = 36;
    bullet.height = 36;
    bullet.behaviors = [
      { type: 'chase', enabled: true, params: { speed: 1.2, range: 300 } },
      { type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } },
    ];
  }

  state.entities.set(id, bullet);
}
