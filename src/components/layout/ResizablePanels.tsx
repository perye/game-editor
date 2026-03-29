import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface ResizablePanelsProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minCenterWidth?: number;
  minRightWidth?: number;
}

export function ResizablePanels({
  left,
  center,
  right,
  defaultLeftWidth = 220,
  defaultRightWidth = 480,
  minLeftWidth = 180,
  minCenterWidth = 300,
  minRightWidth = 320,
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const draggingRef = useRef<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = side;
      startXRef.current = e.clientX;
      startWidthRef.current = side === 'left' ? leftWidth : rightWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [leftWidth, rightWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startXRef.current;

      if (draggingRef.current === 'left') {
        const newLeft = Math.max(minLeftWidth, Math.min(startWidthRef.current + delta, containerWidth - rightWidth - minCenterWidth));
        setLeftWidth(newLeft);
      } else {
        const newRight = Math.max(minRightWidth, Math.min(startWidthRef.current - delta, containerWidth - leftWidth - minCenterWidth));
        setRightWidth(newRight);
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftWidth, rightWidth, minLeftWidth, minRightWidth, minCenterWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      <div style={{ width: leftWidth, minWidth: minLeftWidth }} className="shrink-0 h-full overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={handleMouseDown('left')}
        className="w-1 shrink-0 bg-panel-border hover:bg-accent cursor-col-resize transition-colors duration-150"
      />
      <div className="flex-1 h-full overflow-hidden" style={{ minWidth: minCenterWidth }}>
        {center}
      </div>
      <div
        onMouseDown={handleMouseDown('right')}
        className="w-1 shrink-0 bg-panel-border hover:bg-accent cursor-col-resize transition-colors duration-150"
      />
      <div style={{ width: rightWidth, minWidth: minRightWidth }} className="shrink-0 h-full overflow-hidden">
        {right}
      </div>
    </div>
  );
}
