export interface TransformData {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface SpriteData {
  color: string;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle' | 'triangle' | 'star';
  imageAssetId?: string;
}

export interface TextData {
  content: string;
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface RigidBodyData {
  mass: number;
  velocityX: number;
  velocityY: number;
  gravityScale: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  isKinematic: boolean;
  collisionLayer: number;
  collisionMask: number;
  isTrigger: boolean;
}

export type ComponentData =
  | { type: 'transform'; data: TransformData }
  | { type: 'sprite'; data: SpriteData }
  | { type: 'text'; data: TextData }
  | { type: 'rigidbody'; data: RigidBodyData };

// ─── Variable System ───

export type VariableValue = number | string | boolean;

export interface GameVariable {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  value: VariableValue;
  scope: 'global' | 'entity';
}

// ─── Behavior System ───

export type BehaviorType =
  | 'keyboard-move'
  | 'patrol'
  | 'chase'
  | 'collectible'
  | 'obstacle'
  | 'projectile'
  | 'score-display'
  | 'health-display'
  | 'timer-display'
  | 'win-zone'
  | 'lose-zone'
  | 'spawn-on-interval'
  | 'bounce'
  | 'rotate'
  | 'platform'
  | 'gravity'
  | 'click-action'
  // Phase 2 new behaviors
  | 'follow-mouse'
  | 'move-to-point'
  | 'physics-move'
  | 'shooter'
  | 'health-system'
  | 'damage-on-contact'
  | 'destroyable'
  | 'draggable'
  | 'clickable'
  | 'hoverable'
  | 'state-machine'
  | 'timer'
  | 'condition-check'
  | 'spawn-entity'
  | 'destroy-self'
  | 'button'
  | 'progress-bar'
  | 'dialogue-box'
  | 'tween'
  | 'play-sound';

export interface BehaviorConfig {
  type: BehaviorType;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export const BEHAVIOR_DEFAULTS: Record<BehaviorType, Record<string, number | string | boolean>> = {
  'keyboard-move':     { speed: 3, useArrows: true, useWASD: true },
  'patrol':            { speed: 1.5, distance: 120, axis: 'horizontal' },
  'chase':             { speed: 1.2, range: 200 },
  'collectible':       { points: 10, destroyOnCollect: true, sound: true },
  'obstacle':          { damage: 1, destroyPlayer: false },
  'projectile':        { speed: 5, direction: 0, destroyOnHit: true, lifetime: 3 },
  'score-display':     { prefix: '得分: ', initial: 0 },
  'health-display':    { maxHealth: 3, showHearts: true },
  'timer-display':     { seconds: 60, countDown: true, loseOnZero: true },
  'win-zone':          { message: '恭喜通关！' },
  'lose-zone':         { message: '游戏结束' },
  'spawn-on-interval': { interval: 2, entityType: 'enemy', limit: 10 },
  'bounce':            { force: 3, axis: 'vertical' },
  'rotate':            { speed: 60 },
  'platform':          { solid: true, oneWay: false },
  'gravity':           { force: 0.3, maxFall: 6 },
  'click-action':      { action: 'destroy', target: 'self' },
  // New behaviors
  'follow-mouse':      { speed: 5, smooth: true },
  'move-to-point':     { targetX: 0, targetY: 0, speed: 3, stopOnArrive: true },
  'physics-move':      { moveForce: 5, jumpForce: 8, maxSpeed: 6, airControl: 0.3 },
  'shooter':           { fireRate: 0.3, bulletSpeed: 8, bulletColor: '#ffff00', bulletSize: 6, autoFire: false, aimAtMouse: true },
  'health-system':     { maxHp: 3, currentHp: 3, invincibleTime: 1, destroyOnDeath: true, flashOnHit: true },
  'damage-on-contact': { damage: 1, cooldown: 0.5, knockback: 10, destroySelf: false },
  'destroyable':       { hp: 1, dropType: '', dropChance: 0.5 },
  'draggable':         { snapToGrid: false, gridSize: 40, bounds: true },
  'clickable':         { eventName: 'entity-clicked', toggle: false, activeColor: '#ffff00' },
  'hoverable':         { scaleOnHover: 1.15, colorOnHover: '' },
  'state-machine':     { initialState: 'idle', states: 'idle,walk,attack,dead' },
  'timer':             { duration: 2, repeat: false, autoStart: true, eventName: 'timer-done' },
  'condition-check':   { variable: 'score', operator: '>=', value: 100, eventName: 'condition-met' },
  'spawn-entity':      { entityType: 'projectile', offsetX: 0, offsetY: -20, interval: 0, limit: 1 },
  'destroy-self':      { delay: 3, fadeOut: true },
  'button':            { label: '按钮', fontSize: 16, bgColor: '#4c6ef5', hoverColor: '#5c7cff', eventName: 'button-click' },
  'progress-bar':      { variable: 'health', maxValue: 3, width: 100, height: 10, fillColor: '#4caf50', bgColor: '#333333' },
  'dialogue-box':      { dialogues: '你好！|欢迎来到游戏世界|祝你好运！', speed: 30, autoAdvance: false },
  'tween':             { property: 'y', from: 0, to: -20, duration: 1, loop: true, easing: 'sine', yoyo: true },
  'play-sound':        { soundId: '', trigger: 'start', volume: 1 },
};

// ─── Entity & Prefabs ───

export type EntityType =
  | 'player' | 'enemy' | 'npc'
  | 'coin' | 'gem' | 'heart' | 'key' | 'powerup'
  | 'platform' | 'wall' | 'spike' | 'lava' | 'moving-platform'
  | 'score-ui' | 'health-ui' | 'timer-ui' | 'button-ui' | 'label-ui' | 'progress-bar-ui' | 'dialogue-ui'
  | 'win-zone' | 'lose-zone' | 'checkpoint'
  | 'spawner' | 'projectile' | 'bullet'
  // New types for genre support
  | 'puzzle-block' | 'puzzle-target' | 'switch'
  | 'clicker-button' | 'auto-producer' | 'upgrade-button'
  | 'card' | 'card-deck' | 'card-slot'
  | 'dialogue-manager' | 'choice-button' | 'character-portrait'
  | 'rectangle' | 'circle' | 'triangle' | 'text' | 'container';

export type PrefabCategory = 'characters' | 'items' | 'terrain' | 'ui' | 'zones' | 'basic'
  | 'shooter' | 'puzzle' | 'clicker' | 'card' | 'visual-novel';

export interface PrefabDefinition {
  type: EntityType;
  label: string;
  category: PrefabCategory;
  icon: string;
  description: string;
  defaultSprite: SpriteData;
  defaultBehaviors: BehaviorConfig[];
  defaultText?: TextData;
  defaultRigidBody?: RigidBodyData;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  components: ComponentData[];
  behaviors: BehaviorConfig[];
  variables: GameVariable[];
  children: string[];
  visible: boolean;
  locked: boolean;
}

export interface Scene {
  id: string;
  name: string;
  entities: Record<string, Entity>;
  rootEntities: string[];
  backgroundColor: string;
  gravity: number;
  gameState: GameState;
  variables: GameVariable[];
}

export interface GameState {
  score: number;
  health: number;
  time: number;
  isWin: boolean;
  isLose: boolean;
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'image' | 'audio';
  dataUrl: string;
  mimeType: string;
}

export interface GameProject {
  id: string;
  name: string;
  scenes: Scene[];
  activeSceneId: string;
  settings: GameSettings;
  globalVariables: GameVariable[];
  assets: AssetItem[];
}

export interface GameSettings {
  width: number;
  height: number;
  backgroundColor: string;
  fps: number;
}

export interface DragItem {
  type: EntityType;
  label: string;
}

export interface NodeData {
  id: string;
  type: string;
  label: string;
  inputs: string[];
  outputs: string[];
}

// ─── Input System ───

export interface InputAction {
  name: string;
  keys: string[];
}

export const DEFAULT_INPUT_MAP: InputAction[] = [
  { name: 'left', keys: ['ArrowLeft', 'a'] },
  { name: 'right', keys: ['ArrowRight', 'd'] },
  { name: 'up', keys: ['ArrowUp', 'w'] },
  { name: 'down', keys: ['ArrowDown', 's'] },
  { name: 'jump', keys: [' '] },
  { name: 'fire', keys: ['f', 'j'] },
  { name: 'interact', keys: ['e'] },
];
