import { useState, useRef, useEffect } from 'react';
import { Gamepad2, Save, FolderOpen, Download, Undo2, Redo2, Globe, Pencil, Plus, FileJson } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { exportToHTML } from '@/utils/exporter';
import { TemplateSelector } from './TemplateSelector';

export function Toolbar() {
  const projectName = useEditorStore(s => s.project.name);
  const exportProject = useEditorStore(s => s.exportProject);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  const pastLen = useHistoryStore(s => s.past.length);
  const futureLen = useHistoryStore(s => s.future.length);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [showTemplates, setShowTemplates] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(projectName);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, projectName]);

  const commitName = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== projectName) {
      useEditorStore.setState(s => ({
        project: { ...s.project, name: trimmed },
      }));
    }
    setEditing(false);
  };

  const handleSave = () => {
    const json = exportProject();
    try {
      localStorage.setItem('game-editor-save', json);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch { /* storage full */ }
  };

  const handleExportJSON = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        useEditorStore.getState().importProject(reader.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportHTML = () => {
    const html = exportToHTML(useEditorStore.getState().project);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    {showTemplates && <TemplateSelector onClose={() => setShowTemplates(false)} />}
    <div className="h-11 bg-gradient-to-r from-panel to-panel-lighter flex items-center px-4 border-b border-panel-border gap-1 shrink-0">
      <div className="flex items-center gap-2 text-accent mr-1">
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
          <Gamepad2 size={16} />
        </div>
        <span className="font-bold text-sm tracking-tight">GameForge</span>
      </div>

      <div className="mx-1.5 w-px h-5 bg-panel-border/60" />

      <ToolBtn icon={<Plus size={14} />} label="新建" onClick={() => setShowTemplates(true)} accent />

      <div className="mx-1.5 w-px h-5 bg-panel-border/60" />

      {editing ? (
        <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditing(false); }}
          className="bg-surface text-text-primary text-xs px-2.5 py-1 rounded-md border border-accent outline-none w-44 shadow-sm" maxLength={40} />
      ) : (
        <button onClick={() => setEditing(true)} title="点击修改项目名称"
          className="flex items-center gap-1.5 text-text-primary text-xs font-medium hover:text-accent transition-colors group px-2 py-1 rounded-md hover:bg-surface-hover">
          <span>{projectName}</span>
          <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity text-text-muted" />
        </button>
      )}

      <div className="mx-1.5 w-px h-5 bg-panel-border/60" />

      <ToolBtn icon={<Undo2 size={14} />} tip="撤销 Ctrl+Z" onClick={undo} disabled={pastLen === 0} />
      <ToolBtn icon={<Redo2 size={14} />} tip="重做 Ctrl+Shift+Z" onClick={redo} disabled={futureLen === 0} />

      <div className="flex-1" />

      <ToolBtn icon={<FolderOpen size={14} />} label="打开" onClick={handleImport} />
      <ToolBtn icon={<Save size={14} />} label={saved ? '已保存 ✓' : '保存'} onClick={handleSave} highlight={saved} />
      <ToolBtn icon={<FileJson size={14} />} label="导出JSON" onClick={handleExportJSON} />

      <div className="mx-1 w-px h-5 bg-panel-border/60" />

      <button onClick={handleExportHTML}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-all active:scale-95">
        <Globe size={14} />导出游戏
      </button>
    </div>
    </>
  );
}

function ToolBtn({ icon, label, tip, onClick, disabled, accent, highlight }: {
  icon: React.ReactNode; label?: string; tip?: string; onClick?: () => void;
  disabled?: boolean; accent?: boolean; highlight?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={tip || label}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all
        ${disabled ? 'opacity-30 pointer-events-none' : ''}
        ${accent ? 'text-accent hover:bg-accent-muted' : ''}
        ${highlight ? 'text-success' : ''}
        ${!accent && !highlight ? 'text-text-secondary hover:text-text-primary hover:bg-surface-hover' : ''}
        active:scale-95`}>
      {icon}{label && <span>{label}</span>}
    </button>
  );
}
