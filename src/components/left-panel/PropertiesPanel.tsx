import { useEditorStore } from '@/store/useEditorStore';
import type { ComponentData, TransformData, SpriteData, TextData, RigidBodyData, BehaviorConfig, BehaviorType } from '@/types';
import { BEHAVIOR_DEFAULTS as DEFAULTS } from '@/types';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  'keyboard-move': '键盘移动',
  'patrol': '来回巡逻',
  'chase': '追踪玩家',
  'collectible': '可拾取物',
  'obstacle': '障碍物 / 伤害源',
  'projectile': '弹射物',
  'score-display': '计分显示',
  'health-display': '生命显示',
  'timer-display': '倒计时器',
  'win-zone': '胜利区域',
  'lose-zone': '失败区域',
  'spawn-on-interval': '定时生成',
  'bounce': '弹跳动画',
  'rotate': '旋转动画',
  'platform': '实心平台',
  'gravity': '重力',
  'click-action': '点击动作',
  'follow-mouse': '跟随鼠标',
  'move-to-point': '移动到坐标',
  'physics-move': '物理移动',
  'shooter': '射击器',
  'health-system': '生命系统',
  'damage-on-contact': '接触伤害',
  'destroyable': '可摧毁',
  'draggable': '可拖拽',
  'clickable': '可点击',
  'hoverable': '悬停效果',
  'state-machine': '状态机',
  'timer': '定时器',
  'condition-check': '条件检查',
  'spawn-entity': '生成实体',
  'destroy-self': '自动销毁',
  'button': '按钮',
  'progress-bar': '进度条',
  'dialogue-box': '对话框',
  'tween': '补间动画',
  'play-sound': '播放音效',
};

const PARAM_LABELS: Record<string, string> = {
  speed: '速度', distance: '距离', axis: '方向', range: '范围',
  points: '分数', destroyOnCollect: '拾取后消失', sound: '播放音效',
  damage: '伤害', destroyPlayer: '直接击杀', direction: '方向',
  prefix: '前缀文字', initial: '初始值', maxHealth: '最大生命',
  showHearts: '显示爱心', seconds: '总秒数', countDown: '倒计时',
  loseOnZero: '归零即失败', message: '提示文字', interval: '间隔(秒)',
  entityType: '生成类型', limit: '最大数量', force: '力度',
  solid: '实心', oneWay: '单向穿越', action: '动作', target: '目标',
  useArrows: '方向键', useWASD: 'WASD键', maxFall: '最大下落速度',
  smooth: '平滑', targetX: '目标X', targetY: '目标Y', stopOnArrive: '到达停止',
  moveForce: '移动力', jumpForce: '跳跃力', maxSpeed: '最大速度', airControl: '空中控制',
  fireRate: '射速(秒)', bulletSpeed: '子弹速度', bulletColor: '子弹颜色',
  bulletSize: '子弹大小', autoFire: '自动射击', aimAtMouse: '瞄准鼠标',
  maxHp: '最大HP', currentHp: '当前HP', invincibleTime: '无敌时间',
  destroyOnDeath: '死亡销毁', flashOnHit: '受击闪烁',
  cooldown: '冷却时间', knockback: '击退距离', destroySelf: '自身销毁',
  hp: '血量', dropType: '掉落类型', dropChance: '掉落概率',
  snapToGrid: '网格吸附', gridSize: '网格大小', bounds: '限制边界',
  eventName: '事件名', toggle: '切换模式', activeColor: '激活颜色',
  scaleOnHover: '悬停缩放', colorOnHover: '悬停颜色',
  initialState: '初始状态', states: '状态列表',
  duration: '时长', repeat: '重复', autoStart: '自动开始',
  variable: '变量名', operator: '运算符', value: '目标值',
  offsetX: '偏移X', offsetY: '偏移Y',
  delay: '延迟', fadeOut: '淡出',
  label: '标签文字', fontSize: '字号', bgColor: '背景色', hoverColor: '悬停色',
  maxValue: '最大值', width: '宽度', height: '高度', fillColor: '填充色',
  dialogues: '对话内容(|分隔)', autoAdvance: '自动推进',
  property: '属性', from: '起始值', to: '结束值', loop: '循环', easing: '缓动', yoyo: '往返',
  soundId: '音效ID', trigger: '触发时机', volume: '音量',
  lifetime: '存活时间', destroyOnHit: '命中销毁', scoreOnKill: '击杀得分',
  onFireAction: '触发动作', onFireValue: '动作值', onFireVariable: '动作变量',
  horizontalOnly: '仅水平移动', jumpForce: '跳跃力',
  actionVariable: '变量名', actionValue: '值',
  mass: '质量', velocityX: '速度X', velocityY: '速度Y',
  gravityScale: '重力缩放', friction: '摩擦力', restitution: '弹性',
  isStatic: '静态', isKinematic: '运动学', collisionLayer: '碰撞层',
  collisionMask: '碰撞掩码', isTrigger: '触发器模式',
};

const ALL_BEHAVIOR_TYPES = Object.keys(BEHAVIOR_LABELS) as BehaviorType[];

export function PropertiesPanel() {
  const selectedEntity = useEditorStore(s => s.getSelectedEntity());
  const updateComponent = useEditorStore(s => s.updateComponent);
  const updateEntityName = useEditorStore(s => s.updateEntityName);
  const updateBehavior = useEditorStore(s => s.updateBehavior);
  const addBehavior = useEditorStore(s => s.addBehavior);
  const removeBehavior = useEditorStore(s => s.removeBehavior);

  if (!selectedEntity) {
    return <div className="text-text-muted text-xs text-center py-8">点击场景中的实体查看属性</div>;
  }

  const transform = selectedEntity.components.find(c => c.type === 'transform') as Extract<ComponentData, { type: 'transform' }> | undefined;
  const sprite = selectedEntity.components.find(c => c.type === 'sprite') as Extract<ComponentData, { type: 'sprite' }> | undefined;
  const text = selectedEntity.components.find(c => c.type === 'text') as Extract<ComponentData, { type: 'text' }> | undefined;
  const rigidbody = selectedEntity.components.find(c => c.type === 'rigidbody') as Extract<ComponentData, { type: 'rigidbody' }> | undefined;

  const updateTransform = (p: Partial<TransformData>) => { if (transform) updateComponent(selectedEntity.id, { type: 'transform', data: { ...transform.data, ...p } }); };
  const updateSprite = (p: Partial<SpriteData>) => { if (sprite) updateComponent(selectedEntity.id, { type: 'sprite', data: { ...sprite.data, ...p } }); };
  const updateText = (p: Partial<TextData>) => { if (text) updateComponent(selectedEntity.id, { type: 'text', data: { ...text.data, ...p } }); };
  const updateRB = (p: Partial<RigidBodyData>) => {
    if (rigidbody) {
      updateComponent(selectedEntity.id, { type: 'rigidbody', data: { ...rigidbody.data, ...p } });
    }
  };

  const existingTypes = new Set(selectedEntity.behaviors.map(b => b.type));
  const available = ALL_BEHAVIOR_TYPES.filter(t => !existingTypes.has(t));

  const addRigidBody = () => {
    updateComponent(selectedEntity.id, {
      type: 'rigidbody',
      data: { mass: 1, velocityX: 0, velocityY: 0, gravityScale: 1, friction: 0.1, restitution: 0, isStatic: false, isKinematic: false, collisionLayer: 1, collisionMask: 0xFFFF, isTrigger: false },
    });
  };

  return (
    <div className="space-y-3">
      <Section title="实体信息">
        <Field label="名称"><input type="text" value={selectedEntity.name} onChange={e => updateEntityName(selectedEntity.id, e.target.value)} className="input-field" /></Field>
        <Field label="类型"><span className="text-text-muted text-xs">{selectedEntity.type}</span></Field>
      </Section>

      {transform && (
        <Section title="变换">
          <div className="grid grid-cols-2 gap-2">
            <Field label="X"><NumInput value={transform.data.x} onChange={v => updateTransform({ x: v })} /></Field>
            <Field label="Y"><NumInput value={transform.data.y} onChange={v => updateTransform({ y: v })} /></Field>
          </div>
          <Field label="旋转"><NumInput value={transform.data.rotation} onChange={v => updateTransform({ rotation: v })} step={1} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="缩放X"><NumInput value={transform.data.scaleX} onChange={v => updateTransform({ scaleX: v })} step={0.1} /></Field>
            <Field label="缩放Y"><NumInput value={transform.data.scaleY} onChange={v => updateTransform({ scaleY: v })} step={0.1} /></Field>
          </div>
        </Section>
      )}

      {sprite && (
        <Section title="外观">
          <Field label="颜色">
            <div className="flex items-center gap-2">
              <input type="color" value={sprite.data.color} onChange={e => updateSprite({ color: e.target.value })} className="w-7 h-7 rounded border border-panel-border cursor-pointer bg-transparent" />
              <input type="text" value={sprite.data.color} onChange={e => updateSprite({ color: e.target.value })} className="input-field flex-1" />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="宽度"><NumInput value={sprite.data.width} onChange={v => updateSprite({ width: v })} min={1} /></Field>
            <Field label="高度"><NumInput value={sprite.data.height} onChange={v => updateSprite({ height: v })} min={1} /></Field>
          </div>
        </Section>
      )}

      {text && (
        <Section title="文本">
          <Field label="内容"><input type="text" value={text.data.content} onChange={e => updateText({ content: e.target.value })} className="input-field" /></Field>
          <Field label="字号"><NumInput value={text.data.fontSize} onChange={v => updateText({ fontSize: v })} min={1} /></Field>
          <Field label="颜色">
            <div className="flex items-center gap-2">
              <input type="color" value={text.data.color} onChange={e => updateText({ color: e.target.value })} className="w-7 h-7 rounded border border-panel-border cursor-pointer bg-transparent" />
              <input type="text" value={text.data.color} onChange={e => updateText({ color: e.target.value })} className="input-field flex-1" />
            </div>
          </Field>
        </Section>
      )}

      {rigidbody ? (
        <Section title="刚体物理">
          <div className="grid grid-cols-2 gap-2">
            <Field label="质量"><NumInput value={rigidbody.data.mass} onChange={v => updateRB({ mass: v })} step={0.1} min={0.1} /></Field>
            <Field label="重力"><NumInput value={rigidbody.data.gravityScale} onChange={v => updateRB({ gravityScale: v })} step={0.1} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="摩擦力"><NumInput value={rigidbody.data.friction} onChange={v => updateRB({ friction: v })} step={0.05} min={0} max={1} /></Field>
            <Field label="弹性"><NumInput value={rigidbody.data.restitution} onChange={v => updateRB({ restitution: v })} step={0.1} min={0} max={1} /></Field>
          </div>
          <div className="flex gap-2 flex-wrap">
            <BoolBtn label="静态" value={rigidbody.data.isStatic} onChange={v => updateRB({ isStatic: v })} />
            <BoolBtn label="触发器" value={rigidbody.data.isTrigger} onChange={v => updateRB({ isTrigger: v })} />
          </div>
        </Section>
      ) : (
        <div className="px-1">
          <button onClick={addRigidBody} className="w-full text-[10px] text-accent border border-dashed border-accent/30 rounded py-1 hover:bg-accent-muted transition-colors">
            + 添加刚体物理
          </button>
        </div>
      )}

      <Section title={`行为 (${selectedEntity.behaviors.length})`}>
        {selectedEntity.behaviors.length === 0 && <p className="text-[10px] text-text-muted">暂无行为，可从下方添加</p>}
        {selectedEntity.behaviors.map((b, i) => (
          <BehaviorEditor key={`${b.type}-${i}`} behavior={b}
            onUpdate={(v) => updateBehavior(selectedEntity.id, i, v)}
            onRemove={() => removeBehavior(selectedEntity.id, i)} />
        ))}
        {available.length > 0 && (
          <select className="input-field text-xs mt-1" value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const t = e.target.value as BehaviorType;
              addBehavior(selectedEntity.id, { type: t, enabled: true, params: { ...DEFAULTS[t] } });
            }}>
            <option value="">+ 添加行为...</option>
            {available.map(t => <option key={t} value={t}>{BEHAVIOR_LABELS[t]}</option>)}
          </select>
        )}
      </Section>
    </div>
  );
}

function BehaviorEditor({ behavior, onUpdate, onRemove }: {
  behavior: BehaviorConfig; onUpdate: (b: BehaviorConfig) => void; onRemove: () => void;
}) {
  return (
    <div className={`rounded-lg border transition-all ${behavior.enabled
      ? 'border-panel-border bg-surface/50 shadow-sm'
      : 'border-panel-border/50 opacity-40'}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-panel-border/50">
        <button onClick={() => onUpdate({ ...behavior, enabled: !behavior.enabled })}
          className={`transition-colors ${behavior.enabled ? 'text-accent' : 'text-text-muted'}`}>
          {behavior.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
        </button>
        <span className="text-[11px] font-semibold text-text-primary flex-1">{BEHAVIOR_LABELS[behavior.type]}</span>
        <button onClick={onRemove}
          className="p-1 rounded-md hover:bg-danger/15 text-text-muted hover:text-danger transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
      {behavior.enabled && (
        <div className="p-2.5 space-y-2">
          {Object.entries(behavior.params).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-[10px] text-text-muted w-20 shrink-0 text-right">{PARAM_LABELS[key] || key}</label>
              {typeof value === 'boolean' ? (
                <button onClick={() => onUpdate({ ...behavior, params: { ...behavior.params, [key]: !value } })}
                  className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-all ${
                    value ? 'bg-success/15 text-success border border-success/20' : 'bg-surface text-text-muted border border-panel-border'}`}>
                  {value ? '是' : '否'}
                </button>
              ) : typeof value === 'number' ? (
                <input type="number" value={value} step={value < 1 ? 0.1 : 1}
                  onChange={e => onUpdate({ ...behavior, params: { ...behavior.params, [key]: parseFloat(e.target.value) || 0 } })}
                  className="input-field text-[10px] flex-1" />
              ) : (
                <input type="text" value={value as string}
                  onChange={e => onUpdate({ ...behavior, params: { ...behavior.params, [key]: e.target.value } })}
                  className="input-field text-[10px] flex-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoolBtn({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-all ${
        value ? 'bg-success/15 text-success border border-success/20' : 'bg-surface text-text-muted border border-panel-border'}`}>
      {label}: {value ? '是' : '否'}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-text-secondary tracking-wide mb-1.5 px-1 flex items-center gap-1.5">
        <span className="w-1 h-3 rounded-full bg-accent/50" />{title}
      </h3>
      <div className="space-y-2 bg-surface/60 rounded-lg p-2.5 border border-panel-border/40">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] text-text-muted mb-1 block font-medium">{label}</label>{children}</div>;
}
function NumInput({ value, onChange, step = 1, min, max }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return <input type="number" value={Math.round(value * 100) / 100} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min} max={max} className="input-field" />;
}
