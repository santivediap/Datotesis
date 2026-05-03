import { useRef, useState } from "react";
import { Upload } from "lucide-react";

interface Props {
  onFileSelect: (fileName: string, fileText: string) => void;
}

export default function UploadZone({ onFileSelect }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onFileSelect(file.name, text);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        "glass-card cursor-pointer p-8 flex items-center justify-between gap-6 transition-all snap-in",
        dragOver
          ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
          : "hover:border-border-strong",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.xlsx,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-md border border-border-strong bg-surface-2 flex items-center justify-center text-primary">
          <Upload className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-[-0.015em]">
            Upload dataset
          </p>
          <p className="font-mono text-[11px] mt-1 text-muted-foreground tracking-wider">
            DROP .csv / .json / .xlsx · MAX 20MB
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="btn-primary-premium rounded-md px-4 py-2 text-sm font-medium tracking-tight"
      >
        Select file
      </button>
    </div>
  );
}
