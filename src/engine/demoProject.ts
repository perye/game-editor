import type { GameProject, Scene, Entity, ComponentData, BehaviorConfig } from '@/types';

function e(
  id: string, name: string, type: string,
  x: number, y: number,
  sprite: { color: string; width: number; height: number; shape: string } | null,
  behaviors: BehaviorConfig[],
  text?: { content: string; fontSize: number; color: string; fontFamily: string },
): Entity {
  const components: ComponentData[] = [
    { type: 'transform', data: { x, y, rotation: 0, scaleX: 1, scaleY: 1 } },
  ];
  if (text) components.push({ type: 'text', data: text });
  if (sprite) components.push({ type: 'sprite', data: { ...sprite, shape: sprite.shape as 'rectangle' } });

  return {
    id, name, type: type as Entity['type'],
    components, behaviors,
    variables: [],
    children: [], visible: true, locked: false,
  };
}

export function createDemoProject(): GameProject {
  const entities: Record<string, Entity> = {};
  const rootEntities: string[] = [];

  function add(entity: Entity) {
    entities[entity.id] = entity;
    rootEntities.push(entity.id);
  }

  add(e('ground', '地面', 'platform', 400, 560, { color: '#546e7a', width: 800, height: 40, shape: 'rectangle' },
    [{ type: 'platform', enabled: true, params: { solid: true, oneWay: false } }]));

  add(e('plat1', '平台-左', 'platform', 150, 440, { color: '#78909c', width: 140, height: 20, shape: 'rectangle' },
    [{ type: 'platform', enabled: true, params: { solid: true, oneWay: false } }]));
  add(e('plat2', '平台-中', 'platform', 400, 350, { color: '#78909c', width: 160, height: 20, shape: 'rectangle' },
    [{ type: 'platform', enabled: true, params: { solid: true, oneWay: false } }]));
  add(e('plat3', '平台-右上', 'platform', 650, 280, { color: '#78909c', width: 130, height: 20, shape: 'rectangle' },
    [{ type: 'platform', enabled: true, params: { solid: true, oneWay: false } }]));

  add(e('player', '玩家', 'player', 80, 510, { color: '#4fc3f7', width: 36, height: 44, shape: 'rectangle' },
    [
      { type: 'keyboard-move', enabled: true, params: { speed: 3, useArrows: true, useWASD: true, horizontalOnly: true, jumpForce: 9 } },
      { type: 'gravity', enabled: true, params: { force: 0.4, maxFall: 8 } },
      { type: 'health-system', enabled: true, params: { maxHp: 3, currentHp: 3, invincibleTime: 1, destroyOnDeath: true, flashOnHit: true } },
    ]));

  const coinPositions = [[180, 410], [320, 320], [480, 320], [650, 250], [400, 250]];
  coinPositions.forEach(([cx, cy], i) => {
    add(e(`coin${i}`, `金币${i + 1}`, 'coin', cx, cy, { color: '#ffd54f', width: 20, height: 20, shape: 'circle' },
      [
        { type: 'collectible', enabled: true, params: { points: 10, destroyOnCollect: true, sound: true } },
        { type: 'rotate', enabled: true, params: { speed: 60 } },
      ]));
  });

  add(e('gem1', '宝石', 'gem', 400, 300, { color: '#e040fb', width: 18, height: 24, shape: 'triangle' },
    [
      { type: 'collectible', enabled: true, params: { points: 50, destroyOnCollect: true, sound: true } },
      { type: 'bounce', enabled: true, params: { force: 1, axis: 'vertical' } },
    ]));

  add(e('enemy1', '巡逻兵-地面', 'enemy', 500, 530, { color: '#ef5350', width: 30, height: 30, shape: 'rectangle' },
    [
      { type: 'patrol', enabled: true, params: { speed: 1.2, distance: 100, axis: 'horizontal' } },
      { type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } },
    ]));
  add(e('enemy2', '巡逻兵-平台', 'enemy', 400, 320, { color: '#ff7043', width: 28, height: 28, shape: 'rectangle' },
    [
      { type: 'patrol', enabled: true, params: { speed: 1, distance: 60, axis: 'horizontal' } },
      { type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } },
    ]));

  add(e('spike1', '尖刺陷阱', 'spike', 300, 548, { color: '#b71c1c', width: 50, height: 16, shape: 'triangle' },
    [{ type: 'obstacle', enabled: true, params: { damage: 1, destroyPlayer: false } }]));

  add(e('winzone', '终点旗帜', 'win-zone', 750, 240, { color: '#4caf50', width: 40, height: 70, shape: 'rectangle' },
    [{ type: 'win-zone', enabled: true, params: { message: '恭喜通关！' } }]));

  add(e('deathzone', '底部深渊', 'lose-zone', 400, 595, { color: '#d50000', width: 800, height: 10, shape: 'rectangle' },
    [{ type: 'lose-zone', enabled: true, params: { message: '掉入深渊！游戏结束' } }]));

  add(e('score', '计分板', 'score-ui', 80, 25, null,
    [{ type: 'score-display', enabled: true, params: { prefix: '得分: ', initial: 0 } }],
    { content: '得分: 0', fontSize: 18, color: '#ffffff', fontFamily: 'Arial' }));

  add(e('health', '生命值', 'health-ui', 80, 50, null,
    [{ type: 'health-display', enabled: true, params: { maxHealth: 3, showHearts: true } }],
    { content: '生命: ❤❤❤', fontSize: 16, color: '#e91e63', fontFamily: 'Arial' }));

  add(e('title', '关卡标题', 'label-ui', 400, 25, null, [],
    { content: '第一关 — 收集金币到达终点', fontSize: 14, color: '#9494a8', fontFamily: 'Arial' }));

  const scene: Scene = {
    id: 'demo-scene',
    name: '教程关卡',
    entities,
    rootEntities,
    backgroundColor: '#1a1a2e',
    gravity: 0.3,
    gameState: { score: 0, health: 3, time: 60, isWin: false, isLose: false },
    variables: [],
  };

  return {
    id: 'demo-project',
    name: '我的第一个游戏',
    scenes: [scene],
    activeSceneId: 'demo-scene',
    settings: { width: 800, height: 600, backgroundColor: '#1a1a2e', fps: 60 },
    globalVariables: [
      { id: 'var-score', name: 'score', type: 'number', value: 0, scope: 'global' },
      { id: 'var-health', name: 'health', type: 'number', value: 3, scope: 'global' },
    ],
    assets: [],
  };
}
