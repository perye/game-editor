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

export function createVisualNovelTemplate(): GameProject {
  const entities: Record<string, Entity> = {};
  const roots: string[] = [];
  const add = (ent: Entity) => { entities[ent.id] = ent; roots.push(ent.id); };

  // Background
  add(e('bg', '背景', 'rectangle', 400, 300,
    { color: '#1a237e', width: 800, height: 600, shape: 'rectangle' }, []));

  // Sky effect
  add(e('sky', '星空', 'rectangle', 400, 150,
    { color: '#0d1b3e', width: 800, height: 300, shape: 'rectangle' }, []));

  // Character portrait (left)
  add(e('char-left', '角色A', 'character-portrait', 200, 320,
    { color: '#7e57c2', width: 100, height: 160, shape: 'rectangle' }, [
      { type: 'tween', enabled: true, params: { property: 'y', from: 0, to: -4, duration: 2.5, loop: true, easing: 'sine', yoyo: true } },
    ]));

  // Character portrait (right)
  add(e('char-right', '角色B', 'character-portrait', 600, 330,
    { color: '#42a5f5', width: 90, height: 150, shape: 'rectangle' }, [
      { type: 'tween', enabled: true, params: { property: 'y', from: 0, to: -3, duration: 2, loop: true, easing: 'sine', yoyo: true } },
    ]));

  // Name background (renders first, below text)
  add(e('name-bg', '名字背景', 'rectangle', 180, 430,
    { color: '#1a1a2e', width: 120, height: 28, shape: 'rectangle' }, []));

  // Character name label (renders on top)
  add(e('name-label', '角色名', 'label-ui', 180, 430, null, [],
    { content: '爱丽丝', fontSize: 16, color: '#ce93d8', fontFamily: 'Arial' }));

  // Dialogue box background
  add(e('dialog-bg', '对话框背景', 'rectangle', 400, 520,
    { color: '#1a1a2e', width: 720, height: 140, shape: 'rectangle' }, []));

  // Dialogue text
  add(e('dialog', '对话文字', 'dialogue-manager', 400, 510,
    { color: '#00000000', width: 1, height: 1, shape: 'rectangle' }, [
      { type: 'dialogue-box', enabled: true, params: {
        dialogues: '你好，旅行者。欢迎来到银河边境。|我是爱丽丝，星际联盟的向导。|在这里，每一个选择都将决定你的命运…|你准备好开始这段旅程了吗？|点击继续或按空格键推进对话。',
        speed: 25,
        autoAdvance: false,
      }},
    ], { content: '', fontSize: 18, color: '#e0e0e0', fontFamily: 'Arial' }));

  // Choice buttons
  add(e('choice1', '选项A', 'choice-button', 300, 470,
    { color: '#3f51b5', width: 180, height: 36, shape: 'rectangle' }, [
      { type: 'button', enabled: true, params: { label: '接受任务', fontSize: 14, bgColor: '#3f51b5', hoverColor: '#5c6bc0', eventName: 'choice-accept', action: 'setVariable', actionVariable: 'affinity', actionValue: 1 } },
    ], { content: '接受任务', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' }));

  add(e('choice2', '选项B', 'choice-button', 500, 470,
    { color: '#455a64', width: 180, height: 36, shape: 'rectangle' }, [
      { type: 'button', enabled: true, params: { label: '再想想', fontSize: 14, bgColor: '#455a64', hoverColor: '#607d8b', eventName: 'choice-decline', action: 'setVariable', actionVariable: 'affinity', actionValue: -1 } },
    ], { content: '再想想', fontSize: 14, color: '#ffffff', fontFamily: 'Arial' }));

  // Title
  add(e('title', '游戏标题', 'label-ui', 400, 30, null, [],
    { content: '✦ 银河边境 ✦', fontSize: 24, color: '#ffd54f', fontFamily: 'Arial' }));

  // Hint
  add(e('hint', '操作提示', 'label-ui', 700, 585, null, [],
    { content: '点击/空格 继续', fontSize: 11, color: '#555', fontFamily: 'Arial' }));

  return {
    id: 'vn-project',
    name: '银河边境',
    scenes: [{
      id: 'vn-scene', name: '序章', entities, rootEntities: roots,
      backgroundColor: '#0d1b3e', gravity: 0,
      gameState: { score: 0, health: 3, time: 0, isWin: false, isLose: false },
      variables: [],
    }],
    activeSceneId: 'vn-scene',
    settings: { width: 800, height: 600, backgroundColor: '#0d1b3e', fps: 60 },
    globalVariables: [
      { id: 'v-chapter', name: 'chapter', type: 'number', value: 1, scope: 'global' },
      { id: 'v-affinity', name: 'affinity', type: 'number', value: 0, scope: 'global' },
    ],
    assets: [],
  };
}
