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

export function createCardTemplate(): GameProject {
  const entities: Record<string, Entity> = {};
  const roots: string[] = [];
  const add = (ent: Entity) => { entities[ent.id] = ent; roots.push(ent.id); };

  add(e('title', '标题', 'label-ui', 400, 30, null, [],
    { content: '卡牌对战', fontSize: 28, color: '#ffd54f', fontFamily: 'Arial' }));

  // Card slots (play area)
  for (let i = 0; i < 3; i++) {
    add(e(`slot-${i}`, `卡槽${i + 1}`, 'card-slot', 250 + i * 110, 250,
      { color: '#37474f', width: 80, height: 110, shape: 'rectangle' }, []));
  }

  // Deck
  add(e('deck', '牌堆', 'card-deck', 650, 400,
    { color: '#1565c0', width: 70, height: 100, shape: 'rectangle' }, [
      { type: 'clickable', enabled: true, params: { eventName: 'draw-card', toggle: false, activeColor: '', action: 'addScore', actionValue: 5 } },
      { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.05, colorOnHover: '' } },
    ], { content: '抽牌', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' }));

  // Hand cards
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5'];
  const colors = ['#ffffff', '#e91e63', '#ff9800', '#4caf50'];
  for (let i = 0; i < 5; i++) {
    const suit = suits[i % 4];
    const value = values[i];
    const textColor = i % 4 === 0 || i % 4 === 3 ? '#333333' : colors[i % 4];
    add(e(`card-${i}`, `${suit}${value}`, 'card', 150 + i * 90, 480,
      { color: '#ffffff', width: 70, height: 100, shape: 'rectangle' }, [
        { type: 'draggable', enabled: true, params: { snapToGrid: false, gridSize: 40, bounds: true } },
        { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.12, colorOnHover: '' } },
      ], { content: `${suit}${value}`, fontSize: 22, color: textColor, fontFamily: 'Arial' }));
  }

  // Score
  add(e('score', '得分', 'score-ui', 70, 25, null, [
    { type: 'score-display', enabled: true, params: { prefix: '得分: ', initial: 0 } },
  ], { content: '得分: 0', fontSize: 18, color: '#ffffff', fontFamily: 'Arial' }));

  // Opponent area label
  add(e('opp-label', '对手区域', 'label-ui', 400, 100, null, [],
    { content: '— 对手区域 —', fontSize: 14, color: '#546e7a', fontFamily: 'Arial' }));

  // Opponent cards (face down)
  for (let i = 0; i < 3; i++) {
    add(e(`opp-card-${i}`, `对手卡${i + 1}`, 'rectangle', 300 + i * 80, 140,
      { color: '#c62828', width: 60, height: 85, shape: 'rectangle' }, [
        { type: 'tween', enabled: true, params: { property: 'y', from: 0, to: -3, duration: 1.5 + i * 0.2, loop: true, easing: 'sine', yoyo: true } },
      ]));
  }

  add(e('hint', '提示', 'label-ui', 400, 570, null, [],
    { content: '拖动手牌到卡槽中 | 点击牌堆抽牌', fontSize: 12, color: '#666666', fontFamily: 'Arial' }));

  return {
    id: 'card-project',
    name: '卡牌对战',
    scenes: [{
      id: 'card-scene', name: '牌桌', entities, rootEntities: roots,
      backgroundColor: '#1b5e20', gravity: 0,
      gameState: { score: 0, health: 20, time: 0, isWin: false, isLose: false },
      variables: [],
    }],
    activeSceneId: 'card-scene',
    settings: { width: 800, height: 600, backgroundColor: '#1b5e20', fps: 60 },
    globalVariables: [
      { id: 'v-score', name: 'score', type: 'number', value: 0, scope: 'global' },
      { id: 'v-turn', name: 'turn', type: 'number', value: 1, scope: 'global' },
    ],
    assets: [],
  };
}
