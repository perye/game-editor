import { useRef } from 'react';
import { Upload, Trash2, Image, Music, FileAudio } from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { generateId } from '@/utils/id';
import type { AssetItem } from '@/types';

export function AssetPanel() {
  const assets = useEditorStore(s => s.project.assets || []);
  const addAsset = useEditorStore(s => s.addAsset);
  const removeAsset = useEditorStore(s => s.removeAsset);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const isImage = file.type.startsWith('image/');
        const isAudio = file.type.startsWith('audio/');

        if (!isImage && !isAudio) return;

        const asset: AssetItem = {
          id: generateId('asset'),
          name: file.name,
          type: isImage ? 'image' : 'audio',
          dataUrl,
          mimeType: file.type,
        };
        addAsset(asset);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const imageAssets = assets.filter(a => a.type === 'image');
  const audioAssets = assets.filter(a => a.type === 'audio');

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,audio/mp3,audio/wav,audio/ogg"
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent/40 text-accent text-xs hover:bg-accent-muted transition-colors"
      >
        <Upload size={14} />
        上传素材 (图片/音频)
      </button>

      {assets.length === 0 && (
        <div className="text-text-muted text-[10px] text-center py-4">
          暂无素材<br />
          支持 PNG、JPG、SVG 图片<br />
          及 MP3、WAV、OGG 音频
        </div>
      )}

      {imageAssets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5 px-1">
            <Image size={12} /> 图片 ({imageAssets.length})
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {imageAssets.map(asset => (
              <div key={asset.id} className="relative group rounded border border-panel-border overflow-hidden bg-surface">
                <img src={asset.dataUrl} alt={asset.name} className="w-full aspect-square object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                  <span className="text-[8px] text-white truncate block">{asset.name}</span>
                </div>
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-danger/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {audioAssets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1.5 px-1">
            <Music size={12} /> 音频 ({audioAssets.length})
          </h3>
          <div className="space-y-1">
            {audioAssets.map(asset => (
              <div key={asset.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface group">
                <FileAudio size={14} className="text-accent shrink-0" />
                <span className="text-[11px] text-text-primary flex-1 truncate">{asset.name}</span>
                <span className="text-[9px] text-text-muted">{asset.id.slice(-4)}</span>
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="p-0.5 rounded text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
