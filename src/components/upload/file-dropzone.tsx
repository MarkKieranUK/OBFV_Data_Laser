"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  warning: string | null;
}

export function FileDropzone({
  onFileSelected,
  isLoading,
  error,
  warning,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center
          rounded-xl border-2 border-dashed p-12 transition-all duration-200
          ${
            isDragging
              ? "border-accent-red bg-accent-red/5 scale-[1.02]"
              : "border-border hover:border-muted-foreground/50 hover:bg-surface-raised/50"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-accent-red" />
            <p className="text-sm text-muted-foreground">Parsing file...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-full bg-surface-raised p-4">
              {isDragging ? (
                <FileSpreadsheet className="h-8 w-8 text-accent-red" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <p className="mb-1 text-lg font-medium text-foreground">
              {isDragging ? "Drop your file here" : "Upload your dataset"}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Drag and drop or click to browse
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary">.csv</Badge>
              <Badge variant="secondary">.xlsx</Badge>
              <Badge variant="secondary">.xls</Badge>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warning && !error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}
