import { useState, useEffect, useCallback, useRef } from 'react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

let globalSetMenu: ((state: ContextMenuState | null) => void) | null = null;

export function showContextMenu(x: number, y: number, items: MenuItem[]) {
  globalSetMenu?.({ x, y, items });
}

export function ContextMenuProvider() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    globalSetMenu = setMenu;
    return () => { globalSetMenu = null; };
  }, []);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const handler = () => close();
    window.addEventListener('click', handler);
    window.addEventListener('contextmenu', handler);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('contextmenu', handler);
    };
  }, [menu, close]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = menu;
    if (x + rect.width > vw) x = vw - rect.width - 4;
    if (y + rect.height > vh) y = vh - rect.height - 4;
    if (x !== menu.x || y !== menu.y) setMenu({ ...menu, x, y });
  }, [menu]);

  if (!menu) return null;

  return (
    <div ref={menuRef}
      className="fixed z-[9999] bg-panel border border-panel-border rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}>
      {menu.items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="h-px bg-panel-border/50 my-1 mx-2" />;
        }
        return (
          <button key={i}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left transition-colors
              ${item.disabled ? 'text-text-muted/40 cursor-not-allowed' :
                item.danger ? 'text-text-secondary hover:bg-danger/10 hover:text-danger' :
                'text-text-secondary hover:bg-accent/10 hover:text-accent'}`}
            onClick={() => { item.action?.(); close(); }}>
            {item.icon && <span className="w-4 shrink-0 flex justify-center">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-[10px] text-text-muted/60 ml-4">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
