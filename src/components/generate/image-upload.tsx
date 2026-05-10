"use client";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  accept?: string;
}

export function ImageUpload({ value, onChange, label, accept = "image/*" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("请上传图片或视频文件");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.code !== 0) { toast.error(json.message); return; }
      onChange(json.data.url);
      toast.success("上传成功");
    } catch { toast.error("上传失败"); }
    finally { setUploading(false); }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <label className="text-[11px] font-medium text-white/40 mb-1.5 block">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.02]">
          {value.endsWith(".mp4") || value.endsWith(".webm") ? (
            <video src={value} controls className="w-full max-h-48 object-contain" />
          ) : (
            <img src={value} alt="Reference" className="w-full max-h-48 object-contain" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 size-6 rounded-full bg-black/60 text-white/80 text-xs hover:bg-black/80 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragging ? "border-purple-500/50 bg-purple-500/[0.04]" : "border-white/[0.06] hover:border-white/[0.12]"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = accept;
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {uploading ? (
            <>
              <div className="size-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              <span className="text-xs text-white/30">上传中...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">📁</span>
              <span className="text-xs text-white/25">拖拽文件到此处或点击上传</span>
              <span className="text-[10px] text-white/15">{accept.includes("video") ? "支持图片/视频，最大 20MB" : "支持 PNG/JPG/WebP，最大 20MB"}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
