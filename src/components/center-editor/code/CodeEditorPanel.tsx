import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw } from 'lucide-react';

const DEFAULT_SCRIPT = `// Game Script - TypeScript
// This script runs in the game runtime

interface Entity {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

// Called once when the game starts
function onStart(entity: Entity) {
  console.log(\`\${entity.name} initialized at (\${entity.x}, \${entity.y})\`);
}

// Called every frame
function onUpdate(entity: Entity, deltaTime: number) {
  // Rotate the entity
  entity.rotation += 90 * deltaTime;

  // Bounce movement
  entity.x += Math.sin(Date.now() / 1000) * 2;
}

// Called when clicked
function onClick(entity: Entity) {
  console.log(\`\${entity.name} was clicked!\`);
  entity.scaleX = 1.2;
  entity.scaleY = 1.2;
}
`;

const API_TYPES = `
declare interface GameAPI {
  /** Get entity by name */
  getEntity(name: string): Entity | null;
  /** Get all entities */
  getAllEntities(): Entity[];
  /** Create a new entity */
  spawn(type: string, x: number, y: number): Entity;
  /** Remove an entity */
  destroy(entity: Entity): void;
  /** Log a message to the console */
  log(message: string): void;
}

declare const game: GameAPI;
`;

export function CodeEditorPanel() {
  const [code, setCode] = useState(DEFAULT_SCRIPT);
  const [output, setOutput] = useState<string[]>([]);

  const handleRun = () => {
    setOutput(prev => [...prev, '> Running script...', '> Script executed successfully.']);
  };

  const handleClear = () => {
    setOutput([]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-panel border-b border-panel-border shrink-0">
        <span className="text-xs text-text-secondary">game-script.ts</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRun}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-success/20 text-success hover:bg-success/30 transition-colors"
          >
            <Play size={11} />
            Run
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <RotateCcw size={11} />
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="typescript"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v || '')}
          beforeMount={(monaco) => {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(API_TYPES, 'game-api.d.ts');
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 8 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
          }}
        />
      </div>

      {output.length > 0 && (
        <div className="h-28 border-t border-panel-border bg-[#1a1a1a] overflow-y-auto shrink-0">
          <div className="px-2 py-1 text-[10px] text-text-muted font-semibold uppercase border-b border-panel-border">
            Output
          </div>
          <div className="p-2 font-mono text-xs space-y-0.5">
            {output.map((line, i) => (
              <div key={i} className="text-text-secondary">{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
