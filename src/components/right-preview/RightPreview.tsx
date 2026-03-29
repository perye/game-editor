import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePreviewCanvas } from './usePreviewCanvas';

export function RightPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPlaying = useEditorStore(s => s.isPlaying);
  const setPlaying = useEditorStore(s => s.setPlaying);
  const [fps, setFps] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { onFpsUpdate } = usePreviewCanvas(canvasRef, containerRef);

  useEffect(() => { onFpsUpdate(setFps); }, [onFpsUpdate]);

  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="h-full bg-panel flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium">实时预览</span>
          {isPlaying && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /><span className="text-[10px] text-success">运行中</span></span>}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setPlaying(!isPlaying)}
            className={`p-1.5 rounded-md transition-all active:scale-90 ${isPlaying ? 'bg-danger/20 text-danger hover:bg-danger/30' : 'bg-success/20 text-success hover:bg-success/30'}`}
            title={isPlaying ? '暂停' : '运行'}>
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={() => { setPlaying(false); setTimeout(() => setPlaying(true), 50); }}
            className="p-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-all active:scale-90" title="重新开始">
            <RotateCcw size={13} />
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-all active:scale-90" title={isFullscreen ? '退出全屏' : '全屏'}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#0a0a16]">
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
      <div className="flex items-center justify-between px-3 py-1 border-t border-panel-border shrink-0 text-[10px] text-text-muted">
        <span className="font-mono">{fps} FPS</span>
        <span>{isPlaying ? 'WASD/方向键移动 · 鼠标/F键射击' : '点击 ▶ 开始游戏'}</span>
      </div>
    </div>
  );
}
