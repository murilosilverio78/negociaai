"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept: string;
  onFileSelect: (file: File) => void;
}

export function FileUpload({ accept, onFileSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      )}
    >
      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-sm font-medium mb-1">
        Arraste um arquivo ou clique para selecionar
      </p>
      <p className="text-xs text-muted-foreground mb-4">CSV ou Excel (.xlsx)</p>
      <label className="cursor-pointer">
        <span className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Selecionar Arquivo
        </span>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
