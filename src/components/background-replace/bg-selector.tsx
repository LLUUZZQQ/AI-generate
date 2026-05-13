"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Wand2, LayoutGrid, Upload, Trash2, Image, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type BgMode = "preset" | "ai" | "custom";

interface SavedBg { key: string; name: string; url: string; savedAt: number; }

interface BgSelectorProps {
  mode: BgMode;
  onModeChange: (mode: BgMode) => void;
  selectedBgIds: string[];
  onToggleBg: (id: string) => void;
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  customBgFile: File | null;
  onCustomBgChange: (file: File | null) => void;
  recommendedIds?: string[];
}

export function BgSelector({
  mode, onModeChange, selectedBgIds, onToggleBg,
  aiPrompt, onAiPromptChange, customBgFile, onCustomBgChange,
}: BgSelectorProps) {
  const [savedBgs, setSavedBgs] = useState<SavedBg[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [presetUploading, setPresetUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetFileRef = useRef<HTMLInputElement>(null);

  // Load saved backgrounds from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("framecraft_saved_bgs");
      if (raw) setSavedBgs(JSON.parse(raw));
    } catch { }
  }, []);

  // Direct preset upload
  const handlePresetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPresetUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.code !== 0) { toast.error(data.message || "上传失败"); return; }
      const key = data.data.key || data.data.filename;
      const url = `/api/s3/${key}`;
      saveBackground(key, file.name, url);
      toast.success("预设已添加");
    } catch { toast.error("上传失败"); }
    finally {
      setPresetUploading(false);
      if (presetFileRef.current) presetFileRef.current.value = "";
    }
  };

  // Save new background to localStorage when customBgFile changes and is uploaded
  const saveBackground = useCallback((key: string, name: string, url: string) => {
    setSavedBgs(prev => {
      if (prev.some(b => b.key === key)) return prev;
      const updated = [{ key, name, url, savedAt: Date.now() }, ...prev].slice(0, 20);
      localStorage.setItem("framecraft_saved_bgs", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Delete saved background
  const deleteSaved = (key: string) => {
    const updated = savedBgs.filter(b => b.key !== key);
    setSavedBgs(updated);
    localStorage.setItem("framecraft_saved_bgs", JSON.stringify(updated));
    if (selectedBgIds.includes(key)) onToggleBg(key);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) onCustomBgChange(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onCustomBgChange(file);
  };

  const modes: { key: BgMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "preset", label: "我的预设", icon: <LayoutGrid className="w-4 h-4" />, desc: "已保存的背景图片" },
    { key: "ai", label: "AI 生成", icon: <Wand2 className="w-4 h-4" />, desc: "描述你想要的背景场景" },
    { key: "custom", label: "自定义上传", icon: <Upload className="w-4 h-4" />, desc: "上传新背景图" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {modes.map((m) => (
          <button key={m.key} onClick={() => onModeChange(m.key)}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              mode === m.key ? "border-purple-400/50 bg-purple-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
            }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={mode === m.key ? "text-purple-400" : "text-white/40"}>{m.icon}</span>
              <span className={`text-sm font-medium ${mode === m.key ? "text-purple-400" : "text-white/70"}`}>{m.label}</span>
            </div>
            <p className="text-xs text-white/40">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* My Presets */}
      {mode === "preset" && (<>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/25">{savedBgs.length > 0 ? `${savedBgs.length} 个预设` : ""}</span>
          <button type="button" disabled={presetUploading}
            onClick={() => presetFileRef.current?.click()}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50">
            {presetUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            添加预设
          </button>
        </div>
        {savedBgs.length === 0 ? (
          <div className="text-center py-10">
            <Image className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">还没有预设背景</p>
            <p className="text-xs text-white/15 mt-2">点击「添加预设」上传背景图</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {savedBgs.map((bg) => {
              const isSelected = selectedBgIds.includes(bg.key);
              return (
                <div key={bg.key} className="relative">
                  <button onClick={() => onToggleBg(bg.key)}
                    className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? "border-purple-400 ring-2 ring-purple-400/30" : "border-white/[0.08] hover:border-white/[0.2]"
                    }`}>
                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">✓</span>
                    )}
                  </button>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/30 truncate max-w-[80%]">{bg.name}</span>
                    <button onClick={() => deleteSaved(bg.key)}
                      className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>)}

      {/* AI prompt */}
      {mode === "ai" && (
        <div className="space-y-3">
          <Input placeholder="例如：浅色木地板，自然光线，旁边有绿植，手机拍摄"
            value={aiPrompt} onChange={(e) => onAiPromptChange(e.target.value)}
            className="bg-white/[0.04] border-white/[0.12] text-sm h-12" />
          <p className="text-xs text-white/40">AI 将根据描述生成真实室内场景作为背景</p>
        </div>
      )}

      {/* Custom upload with drag-drop */}
      {mode === "custom" && (
        <div>
          <input type="file" accept="image/*" ref={presetFileRef} onChange={handlePresetUpload} className="hidden" />
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="custom-bg-input" />
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? "border-purple-400/60 bg-purple-500/10" :
              customBgFile ? "border-purple-400/50 bg-purple-500/5" :
              "border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02]"
            }`}>
            {customBgFile ? (
              <div className="space-y-2">
                <img src={URL.createObjectURL(customBgFile)} alt="Custom" className="max-h-40 mx-auto rounded-lg" />
                <p className="text-sm text-purple-400">{customBgFile.name}</p>
                <p className="text-xs text-white/30">点击更换 / 拖放新图片</p>
              </div>
            ) : (
              <div className="text-sm text-white/40">
                <Upload className="w-10 h-10 mx-auto mb-3 text-white/15" />
                <p>拖放图片到这里，或点击选择</p>
                <p className="text-xs text-white/20 mt-1.5">支持 JPG / PNG / WebP</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
