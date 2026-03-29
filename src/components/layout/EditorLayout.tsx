import { LeftPanel } from '../left-panel/LeftPanel';
import { CenterEditor } from '../center-editor/CenterEditor';
import { RightPreview } from '../right-preview/RightPreview';
import { Toolbar } from './Toolbar';
import { ResizablePanels } from './ResizablePanels';

export function EditorLayout() {
  return (
    <div className="flex flex-col w-full h-full">
      <Toolbar />
      <div className="flex-1 min-h-0">
        <ResizablePanels
          left={<LeftPanel />}
          center={<CenterEditor />}
          right={<RightPreview />}
        />
      </div>
    </div>
  );
}
