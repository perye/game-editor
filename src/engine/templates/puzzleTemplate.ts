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

export function createPuzzleTemplate(): GameProject {
  const entities: Record<string, Entity> = {};
  const roots: string[] = [];
  const add = (ent: Entity) => { entities[ent.id] = ent; roots.push(ent.id); };

  // Grid background
  add(e('bg', '背景', 'rectangle', 400, 300, { color: '#263238', width: 500, height: 500, shape: 'rectangle' }, []));

  // Target zones (where blocks need to go)
  const targets = [
    { id: 'target1', x: 250, y: 200 },
    { id: 'target2', x: 350, y: 200 },
    { id: 'target3', x: 300, y: 300 },
  ];
  targets.forEach(t => {
    add(e(t.id, '目标位置', 'puzzle-target', t.x, t.y,
      { color: '#4caf50', width: 56, height: 56, shape: 'rectangle' }, []));
  });

  // Draggable blocks
  const blocks = [
    { id: 'block1', x: 500, y: 150, color: '#ff7043' },
    { id: 'block2', x: 500, y: 250, color: '#42a5f5' },
    { id: 'block3', x: 500, y: 350, color: '#ab47bc' },
  ];
  blocks.forEach(b => {
    add(e(b.id, '拼图块', 'puzzle-block', b.x, b.y,
      { color: b.color, width: 50, height: 50, shape: 'rectangle' }, [
        { type: 'draggable', enabled: true, params: { snapToGrid: false, gridSize: 50, bounds: true } },
        { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.1, colorOnHover: '' } },
      ]));
  });

  // Reset button
  add(e('reset-btn', '重置按钮', 'button-ui', 400, 520,
    { color: '#f44336', width: 100, height: 36, shape: 'rectangle' }, [
      { type: 'button', enabled: true, params: { label: '重置', fontSize: 14, bgColor: '#f44336', hoverColor: '#e53935', eventName: 'reset-puzzle', action: 'resetPositions' } },
    ], { content: '重置', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' }));

  // Instructions
  add(e('hint', '提示', 'label-ui', 400, 560, null, [],
    { content: '拖动彩色方块到绿色目标区域', fontSize: 14, color: '#9e9e9e', fontFamily: 'Arial' }));

  add(e('score', '得分', 'score-ui', 70, 25, null, [
    { type: 'score-display', enabled: true, params: { prefix: '已放置: ', initial: 0 } },
  ], { content: '已放置: 0', fontSize: 18, color: '#ffffff', fontFamily: 'Arial' }));

  // Win condition
  add(e('win-check', '胜利检测', 'rectangle', 0, 0,
    { color: '#00000000', width: 1, height: 1, shape: 'rectangle' }, [
      { type: 'condition-check', enabled: true, params: { variable: 'score', operator: '>=', value: 3, eventName: 'puzzle-complete', action: 'win', message: '拼图完成！恭喜通关！' } },
    ]));

  return {
    id: 'puzzle-project',
    name: '解谜拼图',
    scenes: [{
      id: 'puzzle-scene', name: '第一关', entities, rootEntities: roots,
      backgroundColor: '#1a2332', gravity: 0,
      gameState: { score: 0, health: 3, time: 0, isWin: false, isLose: false },
      variables: [],
    }],
    activeSceneId: 'puzzle-scene',
    settings: { width: 800, height: 600, backgroundColor: '#1a2332', fps: 60 },
    globalVariables: [
      { id: 'v-score', name: 'score', type: 'number', value: 0, scope: 'global' },
    ],
    assets: [],
  };
}
