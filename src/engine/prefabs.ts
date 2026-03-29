import type { PrefabDefinition } from '@/types';

export const PREFABS: PrefabDefinition[] = [
  // ─── 角色 ───
  {
    type: 'player',
    label: '玩家',
    category: 'characters',
    icon: 'user',
    description: 'WASD / 方向键控制移动',
    defaultSprite: { color: '#4fc3f7', width: 40, height: 50, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'keyboard-move', enabled: true, params: { speed: 3, useArrows: true, useWASD: true } },
      { type: 'health-system', enabled: true, params: { maxHp: 3, currentHp: 3, invincibleTime: 1, destroyOnDeath: true, flashOnHit: true } },
    ],
  },
  {
    type: 'enemy',
    label: '敌人',
    category: 'characters',
    icon: 'ghost',
    description: '来回巡逻，碰到玩家造成伤害',
    defaultSprite: { color: '#ef5350', width: 36, height: 36, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'patrol', enabled: true, params: { speed: 1.5, distance: 120, axis: 'horizontal' } },
      { type: 'damage-on-contact', enabled: true, params: { damage: 1, cooldown: 0.5, knockback: 10, destroySelf: false } },
      { type: 'destroyable', enabled: true, params: { hp: 2, dropType: '', dropChance: 0.5 } },
    ],
  },
  {
    type: 'npc',
    label: '追踪者',
    category: 'characters',
    icon: 'message-circle',
    description: '自动追踪玩家',
    defaultSprite: { color: '#ab47bc', width: 34, height: 34, shape: 'circle' },
    defaultBehaviors: [
      { type: 'chase', enabled: true, params: { speed: 1.2, range: 200 } },
    ],
  },

  // ─── 物品 ───
  {
    type: 'coin',
    label: '金币',
    category: 'items',
    icon: 'circle-dollar-sign',
    description: '拾取后 +10 分',
    defaultSprite: { color: '#ffd54f', width: 24, height: 24, shape: 'circle' },
    defaultBehaviors: [
      { type: 'collectible', enabled: true, params: { points: 10, destroyOnCollect: true, sound: true } },
      { type: 'rotate', enabled: true, params: { speed: 60 } },
    ],
  },
  {
    type: 'gem',
    label: '宝石',
    category: 'items',
    icon: 'diamond',
    description: '拾取后 +50 分',
    defaultSprite: { color: '#e040fb', width: 22, height: 28, shape: 'triangle' },
    defaultBehaviors: [
      { type: 'collectible', enabled: true, params: { points: 50, destroyOnCollect: true, sound: true } },
      { type: 'bounce', enabled: true, params: { force: 1, axis: 'vertical' } },
    ],
  },
  {
    type: 'heart',
    label: '血包',
    category: 'items',
    icon: 'heart',
    description: '拾取后恢复 1 点生命',
    defaultSprite: { color: '#e91e63', width: 24, height: 24, shape: 'circle' },
    defaultBehaviors: [
      { type: 'collectible', enabled: true, params: { points: 0, destroyOnCollect: true, sound: true } },
    ],
  },
  {
    type: 'key',
    label: '钥匙',
    category: 'items',
    icon: 'key',
    description: '开启胜利之门',
    defaultSprite: { color: '#ffab40', width: 20, height: 28, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'collectible', enabled: true, params: { points: 0, destroyOnCollect: true, sound: true } },
      { type: 'rotate', enabled: true, params: { speed: 45 } },
    ],
  },
  {
    type: 'powerup',
    label: '加速道具',
    category: 'items',
    icon: 'zap',
    description: '拾取后加速',
    defaultSprite: { color: '#00e5ff', width: 26, height: 26, shape: 'star' },
    defaultBehaviors: [
      { type: 'collectible', enabled: true, params: { points: 5, destroyOnCollect: true, sound: true } },
      { type: 'bounce', enabled: true, params: { force: 2, axis: 'vertical' } },
    ],
  },

  // ─── 地形 ───
  {
    type: 'platform',
    label: '平台',
    category: 'terrain',
    icon: 'minus',
    description: '可站立的实心平台',
    defaultSprite: { color: '#78909c', width: 160, height: 24, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'platform', enabled: true, params: { solid: true, oneWay: false } },
    ],
  },
  {
    type: 'moving-platform',
    label: '移动平台',
    category: 'terrain',
    icon: 'move-horizontal',
    description: '来回移动的平台',
    defaultSprite: { color: '#546e7a', width: 120, height: 24, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'platform', enabled: true, params: { solid: true, oneWay: false } },
      { type: 'patrol', enabled: true, params: { speed: 1, distance: 100, axis: 'horizontal' } },
    ],
  },
  {
    type: 'wall',
    label: '墙壁',
    category: 'terrain',
    icon: 'square',
    description: '阻挡移动',
    defaultSprite: { color: '#607d8b', width: 40, height: 120, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'platform', enabled: true, params: { solid: true, oneWay: false } },
    ],
  },
  {
    type: 'spike',
    label: '尖刺',
    category: 'terrain',
    icon: 'triangle',
    description: '碰到即受伤',
    defaultSprite: { color: '#b71c1c', width: 60, height: 20, shape: 'triangle' },
    defaultBehaviors: [
      { type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } },
    ],
  },
  {
    type: 'lava',
    label: '岩浆',
    category: 'terrain',
    icon: 'flame',
    description: '碰到即死亡',
    defaultSprite: { color: '#ff6d00', width: 200, height: 30, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'obstacle', enabled: true, params: { damage: 99, destroyPlayer: true } },
    ],
  },

  // ─── 界面元素 ───
  {
    type: 'score-ui',
    label: '计分板',
    category: 'ui',
    icon: 'trophy',
    description: '显示当前得分',
    defaultSprite: { color: '#00000000', width: 1, height: 1, shape: 'rectangle' },
    defaultText: { content: '得分: 0', fontSize: 20, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'score-display', enabled: true, params: { prefix: '得分: ', initial: 0 } },
    ],
  },
  {
    type: 'health-ui',
    label: '生命值',
    category: 'ui',
    icon: 'heart-pulse',
    description: '显示玩家血量',
    defaultSprite: { color: '#00000000', width: 1, height: 1, shape: 'rectangle' },
    defaultText: { content: '生命: ❤❤❤', fontSize: 18, color: '#e91e63', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'health-display', enabled: true, params: { maxHealth: 3, showHearts: true } },
    ],
  },
  {
    type: 'timer-ui',
    label: '倒计时',
    category: 'ui',
    icon: 'clock',
    description: '计时器',
    defaultSprite: { color: '#00000000', width: 1, height: 1, shape: 'rectangle' },
    defaultText: { content: '时间: 60', fontSize: 18, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'timer-display', enabled: true, params: { seconds: 60, countDown: true, loseOnZero: true } },
    ],
  },
  {
    type: 'label-ui',
    label: '文本标签',
    category: 'ui',
    icon: 'type',
    description: '自定义文字',
    defaultSprite: { color: '#00000000', width: 1, height: 1, shape: 'rectangle' },
    defaultText: { content: '你好世界', fontSize: 24, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [],
  },
  {
    type: 'button-ui',
    label: '按钮',
    category: 'ui',
    icon: 'mouse-pointer-click',
    description: '可点击的按钮',
    defaultSprite: { color: '#4c6ef5', width: 120, height: 40, shape: 'rectangle' },
    defaultText: { content: '点击我', fontSize: 16, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'button', enabled: true, params: { label: '点击我', fontSize: 16, bgColor: '#4c6ef5', hoverColor: '#5c7cff', eventName: 'button-click' } },
    ],
  },
  {
    type: 'progress-bar-ui',
    label: '进度条',
    category: 'ui',
    icon: 'bar-chart',
    description: '显示变量进度',
    defaultSprite: { color: '#00000000', width: 1, height: 1, shape: 'rectangle' },
    defaultText: { content: '██████████', fontSize: 14, color: '#4caf50', fontFamily: 'monospace' },
    defaultBehaviors: [
      { type: 'progress-bar', enabled: true, params: { variable: 'health', maxValue: 3, width: 100, height: 10, fillColor: '#4caf50', bgColor: '#333333' } },
    ],
  },
  {
    type: 'dialogue-ui',
    label: '对话框',
    category: 'ui',
    icon: 'message-square',
    description: '视觉小说对话',
    defaultSprite: { color: '#1a1a2e', width: 400, height: 100, shape: 'rectangle' },
    defaultText: { content: '', fontSize: 16, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'dialogue-box', enabled: true, params: { dialogues: '你好！|欢迎来到游戏世界|祝你好运！', speed: 30, autoAdvance: false } },
    ],
  },

  // ─── 区域 ───
  {
    type: 'win-zone',
    label: '胜利区',
    category: 'zones',
    icon: 'flag',
    description: '玩家进入即胜利',
    defaultSprite: { color: '#4caf50', width: 50, height: 80, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'win-zone', enabled: true, params: { message: '恭喜通关！' } },
    ],
  },
  {
    type: 'lose-zone',
    label: '死亡区',
    category: 'zones',
    icon: 'skull',
    description: '掉入即游戏结束',
    defaultSprite: { color: '#d50000', width: 300, height: 30, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'lose-zone', enabled: true, params: { message: '游戏结束' } },
    ],
  },
  {
    type: 'checkpoint',
    label: '存档点',
    category: 'zones',
    icon: 'bookmark',
    description: '复活点',
    defaultSprite: { color: '#ffc107', width: 20, height: 60, shape: 'rectangle' },
    defaultBehaviors: [],
  },
  {
    type: 'spawner',
    label: '刷怪点',
    category: 'zones',
    icon: 'package-plus',
    description: '定时生成敌人',
    defaultSprite: { color: '#9c27b0', width: 36, height: 36, shape: 'circle' },
    defaultBehaviors: [
      { type: 'spawn-on-interval', enabled: true, params: { interval: 2, entityType: 'enemy', limit: 10 } },
    ],
  },

  // ─── 射击类 ───
  {
    type: 'bullet',
    label: '子弹',
    category: 'shooter',
    icon: 'target',
    description: '射击产生的弹丸',
    defaultSprite: { color: '#ffff00', width: 8, height: 8, shape: 'circle' },
    defaultBehaviors: [
      { type: 'projectile', enabled: true, params: { speed: 8, direction: 0, destroyOnHit: true, lifetime: 3 } },
      { type: 'damage-on-contact', enabled: true, params: { damage: 1, cooldown: 0, knockback: 5, destroySelf: true } },
    ],
  },

  // ─── 解谜类 ───
  {
    type: 'puzzle-block',
    label: '推箱子',
    category: 'puzzle',
    icon: 'box',
    description: '可拖拽的方块',
    defaultSprite: { color: '#8d6e63', width: 50, height: 50, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'draggable', enabled: true, params: { snapToGrid: true, gridSize: 50, bounds: true } },
    ],
  },
  {
    type: 'puzzle-target',
    label: '目标区域',
    category: 'puzzle',
    icon: 'crosshair',
    description: '将方块放到这里',
    defaultSprite: { color: '#66bb6a', width: 50, height: 50, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'condition-check', enabled: true, params: { variable: 'score', operator: '>=', value: 1, eventName: 'puzzle-solved' } },
    ],
  },
  {
    type: 'switch',
    label: '开关',
    category: 'puzzle',
    icon: 'toggle-left',
    description: '点击切换状态',
    defaultSprite: { color: '#ff7043', width: 40, height: 40, shape: 'circle' },
    defaultBehaviors: [
      { type: 'clickable', enabled: true, params: { eventName: 'switch-toggle', toggle: true, activeColor: '#4caf50' } },
    ],
  },

  // ─── 点击放置类 ───
  {
    type: 'clicker-button',
    label: '点击按钮',
    category: 'clicker',
    icon: 'mouse-pointer-click',
    description: '点击+1分',
    defaultSprite: { color: '#ff9800', width: 80, height: 80, shape: 'circle' },
    defaultText: { content: '点击!', fontSize: 20, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'click-action', enabled: true, params: { action: 'score', target: 'self' } },
      { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.1, colorOnHover: '' } },
    ],
  },
  {
    type: 'auto-producer',
    label: '自动生产器',
    category: 'clicker',
    icon: 'factory',
    description: '每隔一段时间自动+1分',
    defaultSprite: { color: '#26a69a', width: 60, height: 60, shape: 'rectangle' },
    defaultText: { content: '工厂', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'timer', enabled: true, params: { duration: 2, repeat: true, autoStart: true, eventName: 'produce' } },
    ],
  },
  {
    type: 'upgrade-button',
    label: '升级按钮',
    category: 'clicker',
    icon: 'arrow-up-circle',
    description: '条件满足可升级',
    defaultSprite: { color: '#5c6bc0', width: 140, height: 45, shape: 'rectangle' },
    defaultText: { content: '升级 (需100分)', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'button', enabled: true, params: { label: '升级', fontSize: 14, bgColor: '#5c6bc0', hoverColor: '#7986cb', eventName: 'upgrade' } },
      { type: 'condition-check', enabled: true, params: { variable: 'score', operator: '>=', value: 100, eventName: 'can-upgrade' } },
    ],
  },

  // ─── 卡牌类 ───
  {
    type: 'card',
    label: '卡牌',
    category: 'card',
    icon: 'credit-card',
    description: '可拖拽的卡牌',
    defaultSprite: { color: '#ffffff', width: 60, height: 90, shape: 'rectangle' },
    defaultText: { content: '♠ A', fontSize: 20, color: '#333333', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'draggable', enabled: true, params: { snapToGrid: false, gridSize: 40, bounds: true } },
      { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.1, colorOnHover: '' } },
    ],
  },
  {
    type: 'card-deck',
    label: '牌堆',
    category: 'card',
    icon: 'layers',
    description: '点击抽牌',
    defaultSprite: { color: '#1565c0', width: 60, height: 90, shape: 'rectangle' },
    defaultText: { content: '牌堆', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'clickable', enabled: true, params: { eventName: 'draw-card', toggle: false, activeColor: '' } },
    ],
  },
  {
    type: 'card-slot',
    label: '卡槽',
    category: 'card',
    icon: 'square-dashed-bottom-code',
    description: '放置卡牌的位置',
    defaultSprite: { color: '#37474f', width: 64, height: 94, shape: 'rectangle' },
    defaultBehaviors: [],
  },

  // ─── 视觉小说类 ───
  {
    type: 'dialogue-manager',
    label: '对话管理器',
    category: 'visual-novel',
    icon: 'message-square-text',
    description: '逐字显示对话',
    defaultSprite: { color: '#1a1a2e', width: 500, height: 120, shape: 'rectangle' },
    defaultText: { content: '', fontSize: 18, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'dialogue-box', enabled: true, params: { dialogues: '欢迎来到故事的开始…|这是一个充满冒险的世界|你准备好了吗？', speed: 30, autoAdvance: false } },
    ],
  },
  {
    type: 'choice-button',
    label: '选项按钮',
    category: 'visual-novel',
    icon: 'list',
    description: '对话选项',
    defaultSprite: { color: '#3f51b5', width: 200, height: 40, shape: 'rectangle' },
    defaultText: { content: '选项 A', fontSize: 16, color: '#ffffff', fontFamily: 'Arial' },
    defaultBehaviors: [
      { type: 'button', enabled: true, params: { label: '选项 A', fontSize: 16, bgColor: '#3f51b5', hoverColor: '#5c6bc0', eventName: 'choice-selected' } },
    ],
  },
  {
    type: 'character-portrait',
    label: '角色立绘',
    category: 'visual-novel',
    icon: 'user-circle',
    description: '角色形象',
    defaultSprite: { color: '#7e57c2', width: 100, height: 140, shape: 'rectangle' },
    defaultBehaviors: [
      { type: 'tween', enabled: true, params: { property: 'y', from: 0, to: -5, duration: 2, loop: true, easing: 'sine', yoyo: true } },
    ],
  },

  // ─── 基础形状 ───
  {
    type: 'rectangle',
    label: '矩形',
    category: 'basic',
    icon: 'square',
    description: '基础矩形',
    defaultSprite: { color: '#7c5cfc', width: 80, height: 80, shape: 'rectangle' },
    defaultBehaviors: [],
  },
  {
    type: 'circle',
    label: '圆形',
    category: 'basic',
    icon: 'circle',
    description: '基础圆形',
    defaultSprite: { color: '#7c5cfc', width: 80, height: 80, shape: 'circle' },
    defaultBehaviors: [],
  },
  {
    type: 'triangle',
    label: '三角形',
    category: 'basic',
    icon: 'triangle',
    description: '基础三角形',
    defaultSprite: { color: '#7c5cfc', width: 80, height: 80, shape: 'triangle' },
    defaultBehaviors: [],
  },
];

export function getPrefab(type: string): PrefabDefinition | undefined {
  return PREFABS.find(p => p.type === type);
}
