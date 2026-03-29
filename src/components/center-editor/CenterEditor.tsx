import * as Tabs from '@radix-ui/react-tabs';
import { Monitor, GitBranch, Code, Film } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { SceneEditor } from './scene/SceneEditor';
import { NodeGraphEditor } from './node-graph/NodeGraphEditor';
import { CodeEditorPanel } from './code/CodeEditorPanel';
import { AnimationTimeline } from './animation/AnimationTimeline';

type EditorTab = 'scene' | 'node-graph' | 'code' | 'animation';

export function CenterEditor() {
  const editorTab = useEditorStore(s => s.editorTab);
  const setEditorTab = useEditorStore(s => s.setEditorTab);

  return (
    <div className="h-full bg-surface flex flex-col">
      <Tabs.Root value={editorTab} onValueChange={(v) => setEditorTab(v as EditorTab)} className="flex flex-col h-full">
        <Tabs.List className="flex border-b border-panel-border shrink-0 bg-panel">
          <TabTrigger value="scene" icon={<Monitor size={13} />} label="场景编辑" />
          <TabTrigger value="node-graph" icon={<GitBranch size={13} />} label="逻辑节点" />
          <TabTrigger value="code" icon={<Code size={13} />} label="代码编辑" />
          <TabTrigger value="animation" icon={<Film size={13} />} label="动画时间轴" />
        </Tabs.List>
        <Tabs.Content value="scene" className="flex-1 relative overflow-hidden" forceMount style={{ display: editorTab === 'scene' ? 'block' : 'none' }}>
          <SceneEditor />
        </Tabs.Content>
        <Tabs.Content value="node-graph" className="flex-1 overflow-hidden"><NodeGraphEditor /></Tabs.Content>
        <Tabs.Content value="code" className="flex-1 overflow-hidden"><CodeEditorPanel /></Tabs.Content>
        <Tabs.Content value="animation" className="flex-1 overflow-hidden"><AnimationTimeline /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function TabTrigger({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <Tabs.Trigger value={value}
      className="flex items-center gap-1.5 px-4 py-2 text-xs text-text-secondary
        hover:text-text-primary transition-colors border-b-2 border-transparent
        data-[state=active]:text-accent data-[state=active]:border-accent">
      {icon}{label}
    </Tabs.Trigger>
  );
}
