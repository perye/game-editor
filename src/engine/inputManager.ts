import type { InputAction } from '@/types';
import { DEFAULT_INPUT_MAP } from '@/types';

export interface MouseState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

export class InputManager {
  keys = new Set<string>();
  private prevKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private justReleasedKeys = new Set<string>();

  mouse: MouseState = {
    x: 0, y: 0,
    worldX: 0, worldY: 0,
    pressed: false,
    justPressed: false,
    justReleased: false,
  };

  private actionMap: InputAction[];
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private onMouseMove: ((e: MouseEvent) => void) | null = null;
  private onMouseDown: ((e: MouseEvent) => void) | null = null;
  private onMouseUp: ((e: MouseEvent) => void) | null = null;
  private canvas: HTMLElement | null = null;

  constructor(actionMap?: InputAction[]) {
    this.actionMap = actionMap || [...DEFAULT_INPUT_MAP];
  }

  attach(canvas: HTMLElement) {
    this.canvas = canvas;

    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key);
    };
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    };
    this.onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    };
    this.onMouseDown = (_e: MouseEvent) => {
      this.mouse.pressed = true;
      this.mouse.justPressed = true;
    };
    this.onMouseUp = (_e: MouseEvent) => {
      this.mouse.pressed = false;
      this.mouse.justReleased = true;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  detach() {
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.canvas) {
      if (this.onMouseMove) this.canvas.removeEventListener('mousemove', this.onMouseMove);
      if (this.onMouseDown) this.canvas.removeEventListener('mousedown', this.onMouseDown);
      if (this.onMouseUp) this.canvas.removeEventListener('mouseup', this.onMouseUp);
    }
    this.canvas = null;
  }

  update() {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();

    for (const k of this.keys) {
      if (!this.prevKeys.has(k)) this.justPressedKeys.add(k);
    }
    for (const k of this.prevKeys) {
      if (!this.keys.has(k)) this.justReleasedKeys.add(k);
    }

    this.prevKeys = new Set(this.keys);
    this.mouse.justPressed = false;
    this.mouse.justReleased = false;
  }

  isAction(name: string): boolean {
    const action = this.actionMap.find(a => a.name === name);
    if (!action) return false;
    return action.keys.some(k => this.keys.has(k));
  }

  isActionJustPressed(name: string): boolean {
    const action = this.actionMap.find(a => a.name === name);
    if (!action) return false;
    return action.keys.some(k => this.justPressedKeys.has(k));
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  isKeyJustPressed(key: string): boolean {
    return this.justPressedKeys.has(key);
  }

  setWorldMouse(worldX: number, worldY: number) {
    this.mouse.worldX = worldX;
    this.mouse.worldY = worldY;
  }

  isPointInEntity(px: number, py: number, ex: number, ey: number, ew: number, eh: number): boolean {
    return px >= ex - ew / 2 && px <= ex + ew / 2 && py >= ey - eh / 2 && py <= ey + eh / 2;
  }

  reset() {
    this.keys.clear();
    this.prevKeys.clear();
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
    this.mouse.pressed = false;
    this.mouse.justPressed = false;
    this.mouse.justReleased = false;
  }
}
