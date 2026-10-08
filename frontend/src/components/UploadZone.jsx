import { useRef, useState } from "react";
import { UploadCloud, FileAudio, FileVideo, X } from "lucide-react";

const ACCEPT =
  ".mp3,.wav,.flac,.m4a,.ogg,.aac,.aiff,.wma,.mp4,.avi,.mov,.mkv,.webm,.flv,.m4v,.mpg,.mpeg,audio/*,video/*";

const fmtSize = (bytes) => {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / 1024).toFixed(0)} КБ`;
};

export const UploadZone = ({ file, onFile, disabled }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const isVideo = file && /\.(mp4|avi|mov|mkv|webm|flv|m4v|mpg|mpeg)$/i.test(file.name);

  return (
    <div
      data-testid="file-upload-zone"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer grid-texture ${
        dragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/50 bg-card/40"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        data-testid="file-dropzone-input"
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {!file ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-heading font-semibold text-lg">
              Перетащите аудио или видео
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              или нажмите, чтобы выбрать файл
            </p>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground mt-2">
            MP3 · WAV · M4A · FLAC · MP4 · MOV · WEBM
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            {isVideo ? (
              <FileVideo className="w-7 h-7 text-primary" />
            ) : (
              <FileAudio className="w-7 h-7 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{file.name}</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              {fmtSize(file.size)} {isVideo ? "· видео → извлечём аудио" : ""}
            </p>
          </div>
          <button
            data-testid="file-remove-button"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
            className="w-9 h-9 rounded-lg bg-secondary hover:bg-destructive/20 hover:text-destructive border border-border flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
