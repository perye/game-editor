export type EventCallback = (data: Record<string, unknown>) => void;

export class EventBus {
  private listeners = new Map<string, EventCallback[]>();

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    }
  }

  emit(event: string, data: Record<string, unknown> = {}): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of [...cbs]) {
        cb(data);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  hasListeners(event: string): boolean {
    return (this.listeners.get(event)?.length ?? 0) > 0;
  }
}

// Predefined event names
export const EVENTS = {
  COLLISION_ENTER: 'collision-enter',
  TRIGGER_ENTER: 'trigger-enter',
  TRIGGER_EXIT: 'trigger-exit',
  ENTITY_DESTROYED: 'entity-destroyed',
  VARIABLE_CHANGED: 'variable-changed',
  TIMER_COMPLETE: 'timer-complete',
  INPUT_ACTION: 'input-action',
  ENTITY_CLICKED: 'entity-clicked',
  ENTITY_HOVER: 'entity-hover',
  BUTTON_CLICK: 'button-click',
  CONDITION_MET: 'condition-met',
  STATE_CHANGED: 'state-changed',
  DIALOGUE_END: 'dialogue-end',
  SCENE_LOADED: 'scene-loaded',
  GAME_OVER: 'game-over',
  LEVEL_COMPLETE: 'level-complete',
  SPAWN: 'spawn',
} as const;
