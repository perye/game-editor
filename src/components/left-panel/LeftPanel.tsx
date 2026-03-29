import * as Tabs from '@radix-ui/react-tabs';
import { Blocks, Layers, Settings2, FolderOpen } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { ComponentLibrary } from './ComponentLibrary';
import { HierarchyPanel } from './HierarchyPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { AssetPanel } from './AssetPanel';

export function LeftPanel() {
  const leftPanelTab = useEditorStore(s => s.leftPanelTab);
  const setLeftPanelTab = useEditorStore(s => s.setLeftPanelTab);

  return (
    <div className="h-full bg-panel flex flex-col">
      <Tabs.Root
        value={leftPanelTab}
        onValueChange={(v) => setLeftPanelTab(v as 'components' | 'hierarchy' | 'properties')}
        className="flex flex-col h-full"
      >
        <Tabs.List className="flex border-b border-panel-border shrink-0">
          <TabTrigger value="components" icon={<Blocks size={14} />} label="组件库" />
          <TabTrigger value="hierarchy" icon={<Layers size={14} />} label="层级" />
          <TabTrigger value="properties" icon={<Settings2 size={14} />} label="属性" />
        </Tabs.List>

        <Tabs.Content value="components" className="flex-1 overflow-y-auto p-2 flex flex-col" forceMount style={{ display: leftPanelTab === 'components' ? undefined : 'none' }}>
          <ComponentLibrary />
          <div className="mt-3 pt-3 border-t border-panel-border">
            <div className="flex items-center gap-1 text-[11px] text-text-secondary font-semibold mb-2 px-1">
              <FolderOpen size={12} /> 素材库
            </div>
            <AssetPanel />
          </div>
        </Tabs.Content>
        <Tabs.Content value="hierarchy" className="flex-1 overflow-y-auto p-2" forceMount style={{ display: leftPanelTab === 'hierarchy' ? undefined : 'none' }}>
          <HierarchyPanel />
        </Tabs.Content>
        <Tabs.Content value="properties" className="flex-1 overflow-y-auto p-2" forceMount style={{ display: leftPanelTab === 'properties' ? undefined : 'none' }}>
          <PropertiesPanel />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function TabTrigger({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <Tabs.Trigger value={value}
      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium text-text-muted
        hover:text-text-primary transition-all border-b-2 border-transparent
        data-[state=active]:text-accent data-[state=active]:border-accent data-[state=active]:bg-accent/5">
      {icon}{label}
    </Tabs.Trigger>
  );
}
