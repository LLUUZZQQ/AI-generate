"use client";
import { useState, useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function UploadZone({ files, onFilesChange, maxFiles = 20 }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const newFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    onFilesChange([...files, ...newFiles].slice(0, maxFiles));
  }, [files, maxFiles, onFilesChange]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
      onFilesChange([...files, ...newFiles].slice(0, maxFiles));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
          dragging
            ? "border-purple-400 bg-purple-500/5"
            : "border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center py-12 px-4 cursor-pointer">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
            dragging ? "bg-purple-500/20" : "bg-white/[0.04]"
          }`}>
            <Upload className={`w-7 h-7 ${dragging ? "text-purple-400" : "text-white/30"}`} />
          </div>
          <p className="text-sm text-white/60">拖拽照片到此处，或点击选择</p>
          <p className="text-xs text-white/30 mt-2">支持 PNG / JPG / WebP，最多 {maxFiles} 张</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {files.map((file, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08]">
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              {files.length > 1 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-white/40 text-center">
          已选择 {files.length} 张照片
        </p>
      )}
    </div>
  );
}
