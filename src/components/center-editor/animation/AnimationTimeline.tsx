import { useRef, useCallback } from 'react';
import { Play, Pause, Plus, Trash2, Diamond } from 'lucide-react';
import { useAnimationStore } from '@/store/useAnimationStore';
import { useEditorStore } from '@/store/useEditorStore';

export function AnimationTimeline() {
  const tracks = useAnimationStore(s => s.tracks);
  const currentTime = useAnimationStore(s => s.currentTime);
  const duration = useAnimationStore(s => s.duration);
  const isPlaying = useAnimationStore(s => s.isPlaying);
  const setCurrentTime = useAnimationStore(s => s.setCurrentTime);
  const setPlaying = useAnimationStore(s => s.setPlaying);
  const addTrack = useAnimationStore(s => s.addTrack);
  const removeTrack = useAnimationStore(s => s.removeTrack);
  const addKeyframe = useAnimationStore(s => s.addKeyframe);
  const selectedTrackId = useAnimationStore(s => s.selectedTrackId);
  const selectTrack = useAnimationStore(s => s.selectTrack);
  const selectedEntity = useEditorStore(s => {
    if (!s.selectedEntityId) return undefined;
    const scene = s.project.scenes.find(sc => sc.id === s.project.activeSceneId) || s.project.scenes[0];
    return scene?.entities[s.selectedEntityId];
  });
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    setCurrentTime(Math.round(((e.clientX - rect.left) / rect.width) * duration * 20) / 20);
  }, [duration, setCurrentTime]);

  const timeMarkers = [];
  for (let t = 0; t <= duration; t += 0.5) timeMarkers.push(t);

  return (
    <div className="h-full flex flex-col bg-panel">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-panel-border shrink-0">
        <button onClick={() => setPlaying(!isPlaying)}
          className={`p-1 rounded transition-colors ${isPlaying ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <span className="text-[10px] text-text-muted font-mono">{currentTime.toFixed(2)}秒 / {duration}秒</span>
        <div className="flex-1" />
        <button onClick={() => { if (selectedEntity) addTrack(selectedEntity.id, selectedEntity.name); }}
          disabled={!selectedEntity}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none">
          <Plus size={10} />添加轨道
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            选中一个实体，然后点击「添加轨道」来创建动画
          </div>
        ) : (
          <div className="min-w-[500px]">
            <div className="relative h-5 border-b border-panel-border bg-surface" ref={timelineRef} onClick={handleTimelineClick}>
              {timeMarkers.map(t => (
                <div key={t} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${(t / duration) * 100}%` }}>
                  <div className="w-px h-2 bg-panel-border" />
                  {Number.isInteger(t) && <span className="text-[8px] text-text-muted">{t}秒</span>}
                </div>
              ))}
              <div className="absolute top-0 h-full w-px bg-accent z-10" style={{ left: `${(currentTime / duration) * 100}%` }}>
                <div className="w-2 h-2 bg-accent rounded-full -translate-x-1/2" />
              </div>
            </div>
            {tracks.map(track => (
              <div key={track.id} onClick={() => selectTrack(track.id)}
                className={`flex border-b border-panel-border cursor-pointer ${selectedTrackId === track.id ? 'bg-accent-muted' : 'hover:bg-surface-hover'}`}>
                <div className="w-36 shrink-0 px-2 py-1.5 border-r border-panel-border flex items-center gap-1">
                  <span className="text-xs text-text-primary truncate flex-1">{track.entityName}</span>
                  <button onClick={(e) => { e.stopPropagation(); addKeyframe(track.id, { time: currentTime, property: 'x', value: 0, easing: 'linear' }); }}
                    className="p-0.5 rounded hover:bg-panel-border text-accent" title="在当前时间添加关键帧">
                    <Diamond size={9} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                    className="p-0.5 rounded hover:bg-panel-border text-danger"><Trash2 size={9} /></button>
                </div>
                <div className="flex-1 relative h-8" onClick={(e) => { e.stopPropagation(); handleTimelineClick(e); }}>
                  {track.keyframes.map((kf, i) => (
                    <div key={i} className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent rounded-sm rotate-45 hover:bg-accent-hover cursor-pointer z-10"
                      style={{ left: `calc(${(kf.time / duration) * 100}% - 5px)` }}
                      title={`${kf.property}: ${kf.value} @ ${kf.time}秒`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
