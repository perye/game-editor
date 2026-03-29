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

export function createClickerTemplate(): GameProject {
  const entities: Record<string, Entity> = {};
  const roots: string[] = [];
  const add = (ent: Entity) => { entities[ent.id] = ent; roots.push(ent.id); };

  // Title
  add(e('title', '标题', 'label-ui', 400, 50, null, [],
    { content: '点击大亨', fontSize: 36, color: '#ff9800', fontFamily: 'Arial' }));

  // Main clicker button
  add(e('main-btn', '点击按钮', 'clicker-button', 400, 250,
    { color: '#ff9800', width: 120, height: 120, shape: 'circle' }, [
      { type: 'click-action', enabled: true, params: { action: 'score', target: 'self' } },
      { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.15, colorOnHover: '' } },
    ], { content: '点击!', fontSize: 24, color: '#ffffff', fontFamily: 'Arial' }));

  // Score display
  add(e('score', '金币数', 'score-ui', 400, 120, null, [
    { type: 'score-display', enabled: true, params: { prefix: '金币: ', initial: 0 } },
  ], { content: '金币: 0', fontSize: 28, color: '#ffd54f', fontFamily: 'Arial' }));

  // Auto producers
  const producers = [
    { id: 'prod1', name: '矿工', x: 150, y: 420, color: '#8d6e63', interval: 3 },
    { id: 'prod2', name: '工厂', x: 300, y: 420, color: '#26a69a', interval: 2 },
    { id: 'prod3', name: '银行', x: 450, y: 420, color: '#5c6bc0', interval: 1.5 },
    { id: 'prod4', name: '量子机', x: 600, y: 420, color: '#ab47bc', interval: 0.5 },
  ];

  producers.forEach(p => {
    add(e(p.id, p.name, 'auto-producer', p.x, p.y,
      { color: p.color, width: 80, height: 80, shape: 'rectangle' }, [
        { type: 'timer', enabled: true, params: { duration: p.interval, repeat: true, autoStart: true, eventName: 'produce', onFireAction: 'addScore', onFireValue: 1 } },
        { type: 'hoverable', enabled: true, params: { scaleOnHover: 1.05, colorOnHover: '' } },
      ], { content: p.name, fontSize: 12, color: '#ffffff', fontFamily: 'Arial' }));
  });

  // Labels for producers
  add(e('prod-label', '提示', 'label-ui', 400, 520, null, [],
    { content: '自动生产器 — 每隔一段时间自动 +1', fontSize: 12, color: '#666666', fontFamily: 'Arial' }));

  // Progress bar
  add(e('progress', '进度', 'progress-bar-ui', 400, 560, null, [
    { type: 'progress-bar', enabled: true, params: { variable: 'score', maxValue: 100, width: 200, height: 10, fillColor: '#ff9800', bgColor: '#333' } },
  ], { content: '░░░░░░░░░░', fontSize: 14, color: '#ff9800', fontFamily: 'monospace' }));

  return {
    id: 'clicker-project',
    name: '点击大亨',
    scenes: [{
      id: 'clicker-scene', name: '主界面', entities, rootEntities: roots,
      backgroundColor: '#1a1a2e', gravity: 0,
      gameState: { score: 0, health: 99, time: 0, isWin: false, isLose: false },
      variables: [],
    }],
    activeSceneId: 'clicker-scene',
    settings: { width: 800, height: 600, backgroundColor: '#1a1a2e', fps: 60 },
    globalVariables: [
      { id: 'v-score', name: 'score', type: 'number', value: 0, scope: 'global' },
      { id: 'v-level', name: 'level', type: 'number', value: 1, scope: 'global' },
    ],
    assets: [],
  };
}
