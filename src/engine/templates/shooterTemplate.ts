import type { GameProject, Entity, ComponentData, BehaviorConfig } from '@/types';

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
  return { id, name, type: type as Entity['type'], components, behaviors, variables: [], children: [], visible: true, locked: false };
}

export function createShooterTemplate(): GameProject {
  const entities: Record<string, Entity> = {};
  const roots: string[] = [];
  const add = (ent: Entity) => { entities[ent.id] = ent; roots.push(ent.id); };

  add(e('player', '战斗机', 'player', 400, 500, { color: '#4fc3f7', width: 40, height: 40, shape: 'triangle' }, [
    { type: 'keyboard-move', enabled: true, params: { speed: 4, useArrows: true, useWASD: true } },
    { type: 'shooter', enabled: true, params: { fireRate: 0.2, bulletSpeed: 10, bulletColor: '#ffff00', bulletSize: 6, autoFire: false, aimAtMouse: true } },
    { type: 'health-system', enabled: true, params: { maxHp: 5, currentHp: 5, invincibleTime: 0.5, destroyOnDeath: true, flashOnHit: true } },
  ]));

  for (let i = 0; i < 6; i++) {
    add(e(`enemy-${i}`, `敌机${i + 1}`, 'enemy', 100 + i * 120, 80 + (i % 2) * 40, { color: '#ef5350', width: 30, height: 30, shape: 'rectangle' }, [
      { type: 'patrol', enabled: true, params: { speed: 1 + i * 0.2, distance: 80, axis: 'horizontal' } },
      { type: 'destroyable', enabled: true, params: { hp: 2, dropType: 'coin', dropChance: 0.5 } },
      { type: 'damage-on-contact', enabled: true, params: { damage: 1, cooldown: 1, knockback: 0, destroySelf: false } },
    ]));
  }

  add(e('spawner', '敌人生成器', 'spawner', 400, -20, { color: '#9c27b0', width: 30, height: 30, shape: 'circle' }, [
    { type: 'spawn-on-interval', enabled: true, params: { interval: 3, entityType: 'enemy', limit: 20 } },
  ]));

  add(e('score', '得分', 'score-ui', 70, 25, null, [
    { type: 'score-display', enabled: true, params: { prefix: '得分: ', initial: 0 } },
  ], { content: '得分: 0', fontSize: 20, color: '#ffffff', fontFamily: 'Arial' }));

  add(e('hp', '生命', 'health-ui', 70, 55, null, [
    { type: 'health-display', enabled: true, params: { maxHealth: 5, showHearts: true } },
  ], { content: '❤❤❤❤❤', fontSize: 18, color: '#e91e63', fontFamily: 'Arial' }));

  add(e('title', '标题', 'label-ui', 400, 580, null, [],
    { content: '射击游戏 — 按 F 键或鼠标点击射击', fontSize: 12, color: '#666666', fontFamily: 'Arial' }));

  return {
    id: 'shooter-project',
    name: '太空射击',
    scenes: [{
      id: 'shooter-scene', name: '主场景', entities, rootEntities: roots,
      backgroundColor: '#0a0a1a', gravity: 0,
      gameState: { score: 0, health: 5, time: 0, isWin: false, isLose: false },
      variables: [],
    }],
    activeSceneId: 'shooter-scene',
    settings: { width: 800, height: 600, backgroundColor: '#0a0a1a', fps: 60 },
    globalVariables: [
      { id: 'v-score', name: 'score', type: 'number', value: 0, scope: 'global' },
      { id: 'v-health', name: 'health', type: 'number', value: 5, scope: 'global' },
    ],
    assets: [],
  };
}
