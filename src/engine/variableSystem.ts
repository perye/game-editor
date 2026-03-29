import type { GameVariable, VariableValue } from '@/types';
import type { EventBus } from './eventBus';

export class VariableStore {
  private globals = new Map<string, VariableValue>();
  private entityVars = new Map<string, Map<string, VariableValue>>();
  private eventBus: EventBus | null = null;

  setEventBus(bus: EventBus) {
    this.eventBus = bus;
  }

  loadGlobals(vars: GameVariable[]) {
    this.globals.clear();
    for (const v of vars) {
      this.globals.set(v.name, v.value);
    }
  }

  loadEntityVars(entityId: string, vars: GameVariable[]) {
    const map = new Map<string, VariableValue>();
    for (const v of vars) {
      map.set(v.name, v.value);
    }
    this.entityVars.set(entityId, map);
  }

  getGlobal(name: string): VariableValue | undefined {
    return this.globals.get(name);
  }

  setGlobal(name: string, value: VariableValue) {
    const old = this.globals.get(name);
    this.globals.set(name, value);
    this.eventBus?.emit('variable-changed', { name, value, oldValue: old, scope: 'global' });
  }

  getEntityVar(entityId: string, name: string): VariableValue | undefined {
    return this.entityVars.get(entityId)?.get(name);
  }

  setEntityVar(entityId: string, name: string, value: VariableValue) {
    if (!this.entityVars.has(entityId)) {
      this.entityVars.set(entityId, new Map());
    }
    const old = this.entityVars.get(entityId)!.get(name);
    this.entityVars.get(entityId)!.set(name, value);
    this.eventBus?.emit('variable-changed', { name, value, oldValue: old, scope: 'entity', entityId });
  }

  get(name: string, entityId?: string): VariableValue | undefined {
    if (entityId) {
      const ev = this.getEntityVar(entityId, name);
      if (ev !== undefined) return ev;
    }
    return this.getGlobal(name);
  }

  set(name: string, value: VariableValue, entityId?: string) {
    if (entityId && this.entityVars.has(entityId)) {
      this.setEntityVar(entityId, name, value);
    } else {
      this.setGlobal(name, value);
    }
  }

  clear() {
    this.globals.clear();
    this.entityVars.clear();
  }

  evaluate(variable: string, operator: string, target: number | string | boolean): boolean {
    const val = this.getGlobal(variable);
    if (val === undefined) return false;

    switch (operator) {
      case '==': return val === target;
      case '!=': return val !== target;
      case '>':  return typeof val === 'number' && typeof target === 'number' && val > target;
      case '<':  return typeof val === 'number' && typeof target === 'number' && val < target;
      case '>=': return typeof val === 'number' && typeof target === 'number' && val >= target;
      case '<=': return typeof val === 'number' && typeof target === 'number' && val <= target;
      default: return false;
    }
  }
}
