import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Plus, X, Copy, Edit3, Check, Layers } from 'lucide-react';

export function SceneManager() {
  const scenes = useEditorStore(s => s.project.scenes);
  const activeId = useEditorStore(s => s.project.activeSceneId);
  const { addScene, removeScene, switchScene, renameScene, duplicateScene } = useEditorStore.getState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="flex items-center gap-0.5 px-1 py-0.5 bg-panel/80 border-b border-panel-border/50 overflow-x-auto scrollbar-thin">
      <Layers size={12} className="text-text-muted shrink-0 mr-1" />
      {scenes.map(scene => (
        <div key={scene.id}
          className={`group flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer shrink-0 transition-all
            ${scene.id === activeId
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent'}`}
          onClick={() => switchScene(scene.id)}
          onDoubleClick={() => { setEditingId(scene.id); setEditName(scene.name); }}
        >
          {editingId === scene.id ? (
            <form onSubmit={(e) => { e.preventDefault(); renameScene(scene.id, editName); setEditingId(null); }}
              className="flex items-center gap-1">
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                onBlur={() => { renameScene(scene.id, editName); setEditingId(null); }}
                className="bg-transparent border-b border-accent text-[11px] w-16 outline-none text-text-primary" />
              <button type="submit" className="text-accent"><Check size={10} /></button>
            </form>
          ) : (
            <>
              <span className="truncate max-w-20">{scene.name}</span>
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingId(scene.id); setEditName(scene.name); }}
                  className="hover:text-accent" title="重命名"><Edit3 size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); duplicateScene(scene.id); }}
                  className="hover:text-blue-400" title="复制"><Copy size={10} /></button>
                {scenes.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeScene(scene.id); }}
                    className="hover:text-red-400" title="删除"><X size={10} /></button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      <button onClick={() => addScene()}
        className="shrink-0 p-1 rounded text-text-muted hover:text-accent hover:bg-accent/10 transition-colors ml-1"
        title="新建场景">
        <Plus size={13} />
      </button>
    </div>
  );
}
