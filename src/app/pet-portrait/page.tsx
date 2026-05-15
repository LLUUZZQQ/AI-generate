"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Sparkles, Download, ArrowLeft, Coins, History, RefreshCw, Shuffle, Zap, ChevronLeft, ChevronRight, X, Share2, Heart, Trash2, Grid3X3, GalleryHorizontal, Camera, Wand2 } from "lucide-react";
import Link from "next/link";

const STYLES = [
  { id: "royal", label: "皇家肖像", icon: "👑", color: "from-amber-800 via-red-900 to-amber-900", preview: "奢华宫廷 · 贵族气质", prompt: "Majestic royal portrait, jeweled collar, dramatic lighting, velvet background" },
  { id: "oil-painting", label: "古典油画", icon: "🎨", color: "from-yellow-800 via-amber-700 to-yellow-900", preview: "伦勃朗光影 · 古典笔触", prompt: "Classical oil painting, Old Master style, warm chiaroscuro" },
  { id: "disney", label: "迪士尼", icon: "🏰", color: "from-blue-700 via-indigo-600 to-purple-700", preview: "手绘动画 · 童话魔法", prompt: "Disney animation cel, 1950s style, expressive eyes, magical" },
  { id: "anime", label: "吉卜力", icon: "✨", color: "from-emerald-600 via-teal-500 to-cyan-600", preview: "治愈魔法 · 温暖细腻", prompt: "Studio Ghibli scene, soft watercolor bg, gentle lighting" },
  { id: "vangogh", label: "梵高风格", icon: "🌻", color: "from-blue-800 via-yellow-600 to-blue-900", preview: "漩涡笔触 · 浓烈色彩", prompt: "Van Gogh painting, bold swirling brushstrokes, thick impasto" },
  { id: "pop-art", label: "波普艺术", icon: "🎯", color: "from-pink-600 via-yellow-400 to-cyan-500", preview: "饱和色彩 · 漫画风格", prompt: "Warhol pop art print, bold saturation, halftone dots" },
  { id: "cyberpunk", label: "赛博朋克", icon: "🤖", color: "from-purple-900 via-fuchsia-700 to-cyan-800", preview: "霓虹未来 · 科幻都市", prompt: "Cyberpunk, neon city, glowing accessories, rain, purple/cyan" },
  { id: "neon", label: "霓虹灯牌", icon: "💡", color: "from-gray-900 via-pink-600 to-purple-700", preview: "发光灯管 · 复古招牌", prompt: "Neon sign on brick wall, glowing tubes, retro bar aesthetic" },
  { id: "watercolor", label: "清新水彩", icon: "🖌️", color: "from-rose-300 via-sky-300 to-violet-300", preview: "柔和色彩 · 轻盈通透", prompt: "Delicate watercolor, flowing washes, textured paper, airy" },
  { id: "pencil", label: "铅笔素描", icon: "✏️", color: "from-stone-400 via-stone-300 to-stone-500", preview: "细腻线条 · 艺术质感", prompt: "Graphite pencil sketch, fine crosshatching, textured paper" },
  { id: "baroque", label: "巴洛克", icon: "🏛️", color: "from-red-900 via-amber-700 to-yellow-900", preview: "戏剧光影 · 华丽金红", prompt: "Baroque chiaroscuro, dramatic spotlight, crimson and gold" },
  { id: "ukiyo-e", label: "浮世绘", icon: "🗾", color: "from-amber-50 via-red-200 to-amber-100", preview: "和风木版 · 传统美学", prompt: "Ukiyo-e woodblock print, flat colors, bold outlines, washi" },
  { id: "stained-glass", label: "彩色玻璃", icon: "🌈", color: "from-blue-700 via-red-600 via-yellow-500 to-green-600", preview: "宝石色块 · 教堂光芒", prompt: "Stained glass window, jewel tones, black leading, Gothic arch" },
  { id: "pixel", label: "像素游戏", icon: "👾", color: "from-green-800 via-lime-600 to-emerald-700", preview: "16-bit 复古 · 颗粒美学", prompt: "16-bit pixel art, SNES RPG sprite, limited palette, dithering" },
  { id: "egyptian", label: "埃及法老", icon: "🔱", color: "from-yellow-700 via-amber-600 to-orange-800", preview: "黄金青金石 · 古老壁画", prompt: "Egyptian tomb painting, gold leaf, lapis blue, hieroglyphics" },
  { id: "astronaut", label: "太空宇航员", icon: "🚀", color: "from-indigo-900 via-blue-800 to-violet-900", preview: "太空头盔 · 深空星云", prompt: "Cute astronaut, white spacesuit helmet, nebula, stars, NASA" },
];

const MODELS = [
  { id: "google/gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash", sub: "快速 · 默认" },
  { id: "openai/gpt-5.4-image-2", label: "GPT-5.4 Image 2", sub: "高质量细节" },
];

const INTENSITIES = [
  { id: "light", label: "轻度", desc: "保留原图特色" },
  { id: "medium", label: "中度", desc: "平衡风格与原图" },
  { id: "strong", label: "重度", desc: "完全风格化" },
];

function StylePreview({ s, onClick, active }: { s: typeof STYLES[0]; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick}
      className={`relative w-full aspect-[3/2] rounded-xl overflow-hidden transition-all group ${
        active ? "ring-2 ring-purple-400/60 scale-[0.97]" : "hover:scale-[0.98]"
      }`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.color}`} />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
        <span className="text-3xl mb-1 drop-shadow-lg">{s.icon}</span>
        <span className="text-xs font-medium text-white/90 drop-shadow-lg text-center leading-tight">{s.label}</span>
      </div>
      {active && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-400 flex items-center justify-center">
        <span className="text-white text-[8px]">✓</span>
      </div>}
    </button>
  );
}

export default function PetPortraitPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const pageRef = useRef<HTMLDivElement>(null);

  const { data: userData } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const r = await fetch("/api/user/me"); return r.json(); },
    enabled: !!session,
  });
  const credits = userData?.data?.user?.credits ?? 0;

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["pet-portrait-history"],
    queryFn: async () => { const r = await fetch("/api/pet-portrait"); return r.json(); },
    enabled: !!session,
  });
  const history = historyData?.data?.list ?? [];

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [style, setStyle] = useState("royal");
  const [model, setModel] = useState("google/gemini-3.1-flash-image-preview");
  const [numImages, setNumImages] = useState(2);
  const [intensity, setIntensity] = useState("medium");
  const [hd, setHd] = useState(false);
  const [customStyle, setCustomStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<string[][]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "compare">("grid");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [comparePos, setComparePos] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [galleryFilter, setGalleryFilter] = useState<"all" | "favs">("all");

  useEffect(() => {
    const saved = localStorage.getItem("pet-portrait-favs");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFav = (url: string) => {
    const next = favorites.includes(url) ? favorites.filter(f => f !== url) : [...favorites, url];
    setFavorites(next);
    localStorage.setItem("pet-portrait-favs", JSON.stringify(next));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length + files.length > 5) { toast.error("最多上传 5 张"); return; }
    const valid = newFiles.filter(f => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} 超过 10MB`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    setResults([]);
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleRandomStyle = () => {
    const others = STYLES.filter(s => s.id !== style);
    setStyle(others[Math.floor(Math.random() * others.length)].id);
  };

  const costPer = 3 + (hd ? 5 : 0);
  const totalCost = files.length * numImages * costPer;

  const handleGenerate = async () => {
    if (files.length === 0) { toast.error("请先上传照片"); return; }
    if (!session) { toast.error("请先登录"); return; }
    if (credits < totalCost) { toast.error(`积分不足，需要 ${totalCost} 积分`); return; }
    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: files.length });

    try {
      // Upload all files
      const fileKeys: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("file", files[i]);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) throw new Error(`上传失败: ${files[i].name}`);
        const d = await uploadRes.json();
        if (d.code !== 0) throw new Error(d.message);
        fileKeys.push(d.data.key || d.data.filename);
        setProgress({ current: i + 1, total: files.length });
      }

      // Generate
      setProgress({ current: 0, total: 0 });
      const genRes = await fetch("/api/pet-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKeys, style, model, numImages, intensity, hd,
          customStyle: customStyle.trim() || undefined,
        }),
      });
      if (!genRes.ok) throw new Error("生成失败");
      const genData = await genRes.json();
      if (genData.code !== 0) throw new Error(genData.message);

      setResults(genData.data.results);
      setSelectedBatch(0);
      setSelectedIdx(0);
      toast.success(`生成成功！消耗 ${genData.data.cost} 积分`);
      qc.invalidateQueries({ queryKey: ["user-me"] });
      refetchHistory();
    } catch (e: any) {
      toast.error(e.message || "网络错误");
    }
    setLoading(false);
    setProgress({ current: 0, total: 0 });
  };

  const handleDownload = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl; a.download = `pet-portrait-${style}.png`; a.click();
    URL.revokeObjectURL(objUrl);
  };

  const handleShareCard = async (imgUrl: string) => {
    try {
      // Create share card with watermark
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 1600;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, 1200, 1600);

      // Load and draw the portrait
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load failed"));
        img.src = imgUrl;
      });

      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const targetSize = 1000;
      const margin = 100;
      ctx.drawImage(img, sx, sy, size, size, margin, margin, targetSize, targetSize);

      // Title
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AI 宠物艺术写真", 600, 1250);

      // Style tag
      const styleLabel = STYLES.find(s => s.id === style)?.label || style;
      ctx.fillStyle = "rgba(168, 85, 247, 0.3)";
      ctx.beginPath();
      ctx.roundRect(480, 1280, 240, 56, 28);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "24px Inter, sans-serif";
      ctx.fillText(styleLabel, 600, 1318);

      // Brand
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "20px Inter, sans-serif";
      ctx.fillText("FrameCraft · AI 生成", 600, 1380);

      // Bottom watermark
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "16px Inter, sans-serif";
      ctx.fillText("frame-craft.vercel.app", 600, 1550);

      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.92));
      await navigator.clipboard.write([new ClipboardItem({ "image/jpeg": blob })]);
      toast.success("分享卡片已复制到剪贴板！");
    } catch {
      // Fallback: just copy the image
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("图片已复制到剪贴板");
    }
  };

  const nav = (dir: -1 | 1) => {
    const batch = results[selectedBatch];
    if (!batch) return;
    setSelectedIdx(prev => dir === -1 ? (prev <= 0 ? batch.length - 1 : prev - 1) : (prev >= batch.length - 1 ? 0 : prev + 1));
  };

  const currentResult = results[selectedBatch]?.[selectedIdx];
  const allFavorites = history.filter((h: any) => {
    const urls = typeof h.results === "string" ? JSON.parse(h.results) : (h.results || []);
    return galleryFilter === "favs" ? urls.some((u: string) => favorites.includes(u)) : true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12" ref={pageRef}>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">🐾 AI 宠物艺术写真</h1>
          <p className="text-sm text-white/35">上传宠物照片，AI 生成大师级艺术肖像</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
            <Coins className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm font-medium text-white/80">{credits}</span>
            <span className="text-[10px] text-white/25">积分</span>
          </div>
          <button onClick={() => setShowGallery(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors">
            <GalleryHorizontal className="w-3.5 h-3.5" /> 画廊
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
              showHistory ? "bg-purple-500/15 border border-purple-400/30 text-purple-300" : "bg-white/[0.04] border border-white/[0.06] text-white/50"
            }`}>
            <History className="w-3.5 h-3.5" /> 历史
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="glass p-5 mb-6">
          <h3 className="text-sm font-medium text-white/50 mb-4">生成历史</h3>
          {history.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-8">暂无记录</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {history.slice(0, 18).map((h: any) => {
                const urls = typeof h.results === "string" ? JSON.parse(h.results) : (h.results || []);
                return (
                  <button key={h.id} onClick={() => { setResults(urls.length > 0 ? [urls] : []); setSelectedBatch(0); setSelectedIdx(0); setShowHistory(false); }}
                    className="aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all bg-black/20 relative group">
                    <img src={urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-white/70">{STYLES.find(s => s.id === h.style)?.label || h.style}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="glass p-6 md:p-8 space-y-6">
        {/* Upload Area */}
        {previews.length === 0 ? (
          <label className="block relative border-2 border-dashed rounded-xl border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02] cursor-pointer transition-colors">
            <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
            <div className="flex flex-col items-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-sm text-white/60">点击上传宠物照片（可多选）</p>
              <p className="text-xs text-white/25 mt-2">支持 JPG/PNG/WebP · 最大 10MB · 最多 5 张</p>
            </div>
          </label>
        ) : (
          <>
            {/* Uploaded photos row */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {previews.map((p, i) => (
                <div key={i} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-white/[0.08]">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <label className="shrink-0 w-20 h-20 rounded-lg border border-dashed border-white/[0.1] hover:border-white/[0.2] bg-white/[0.01] cursor-pointer flex items-center justify-center transition-colors">
                  <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                  <span className="text-white/20 text-2xl">+</span>
                </label>
              )}
            </div>

            {/* Results area */}
            {results.length > 0 && (
              <div className="flex gap-4 items-start">
                {/* Batch selector */}
                {results.length > 1 && (
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {previews.map((p, i) => (
                      <button key={i} onClick={() => { setSelectedBatch(i); setSelectedIdx(0); }}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          i === selectedBatch ? "border-purple-400/60" : "border-white/[0.06] opacity-50 hover:opacity-80"
                        }`}>
                        <img src={p} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main result */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/30">
                      {results.length > 1 && `照片 ${selectedBatch + 1}/${results.length} · `}
                      结果 {results[selectedBatch]?.length > 0 ? `${selectedIdx + 1}/${results[selectedBatch].length}` : "0"}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewMode(viewMode === "grid" ? "compare" : "grid")}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.06] text-white/40 hover:text-white/70">
                        {viewMode === "grid" ? "前后对比" : "网格视图"}
                      </button>
                      {results[selectedBatch]?.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => nav(-1)} className="p-1 rounded hover:bg-white/[0.06] text-white/40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                          <span className="text-[10px] text-white/25">{selectedIdx + 1}/{results[selectedBatch].length}</span>
                          <button onClick={() => nav(1)} className="p-1 rounded hover:bg-white/[0.06] text-white/40"><ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-black/20 relative">
                    {viewMode === "compare" && currentResult ? (
                      <div className="relative w-full h-full overflow-hidden cursor-ew-resize"
                        onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setComparePos(((e.clientX - r.left) / r.width) * 100); }}
                        onTouchMove={e => { const r = e.currentTarget.getBoundingClientRect(); setComparePos(((e.touches[0].clientX - r.left) / r.width) * 100); }}>
                        <img src={currentResult} alt="" className="absolute inset-0 w-full h-full object-contain" />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: `${comparePos}%` }}>
                          <img src={previews[selectedBatch]} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ minWidth: `${100 / (comparePos / 100)}%` }} />
                        </div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg" style={{ left: `${comparePos}%` }} />
                        <div className="absolute top-2 left-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded">生成</div>
                        <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded">原图</div>
                      </div>
                    ) : currentResult ? (
                      <img src={currentResult} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-white/15">等待生成</p>
                      </div>
                    )}
                  </div>

                  {/* Action bar */}
                  {currentResult && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <button onClick={() => handleDownload(currentResult)}
                        className="flex items-center gap-1 text-[11px] bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 rounded-lg px-3 py-1.5 transition-colors">
                        <Download className="w-3.5 h-3.5" /> 下载
                      </button>
                      <button onClick={() => handleShareCard(currentResult)}
                        className="flex items-center gap-1 text-[11px] bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 rounded-lg px-3 py-1.5 transition-colors">
                        <Share2 className="w-3.5 h-3.5" /> 分享卡片
                      </button>
                      <button onClick={() => toggleFav(currentResult)}
                        className={`flex items-center gap-1 text-[11px] rounded-lg px-3 py-1.5 transition-colors ${
                          favorites.includes(currentResult) ? "bg-pink-500/10 border border-pink-400/30 text-pink-300" : "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.10]"
                        }`}>
                        <Heart className={`w-3.5 h-3.5 ${favorites.includes(currentResult) ? "fill-pink-400" : ""}`} />
                        {favorites.includes(currentResult) ? "已收藏" : "收藏"}
                      </button>
                    </div>
                  )}

                  {/* Thumbnail strip */}
                  {results[selectedBatch]?.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {results[selectedBatch].map((url, i) => (
                        <button key={i} onClick={() => setSelectedIdx(i)}
                          className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                            i === selectedIdx ? "border-purple-400/60" : "border-white/[0.06] opacity-60 hover:opacity-100"
                          }`}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && results.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="size-10 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                <p className="text-sm text-white/40">
                  {progress.total > 0 ? `上传中 ${progress.current}/${progress.total}` : "AI 正在创作中..."}
                </p>
                {progress.total > 0 && (
                  <div className="w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/60 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Style Grid with Previews */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white/30">选择风格</p>
            <button onClick={handleRandomStyle}
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-purple-400 transition-colors">
              <Shuffle className="w-3 h-3" /> 随机
            </button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {STYLES.map((s) => (
              <StylePreview key={s.id} s={s} active={style === s.id} onClick={() => setStyle(s.id)} />
            ))}
          </div>
          <input type="text" value={customStyle} onChange={e => setCustomStyle(e.target.value)}
            placeholder="或输入自定义风格描述..."
            className="mt-2 w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/[0.12]" />
        </div>

        {/* Settings */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <Wand2 className="w-3.5 h-3.5" />
            {showSettings ? "收起设置" : "高级设置"}
          </button>
          <span className="text-[10px] text-white/20">
            {files.length}照片 × {numImages}张 = {totalCost} 积分
          </span>
        </div>

        {showSettings && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div>
              <p className="text-[10px] text-white/25 mb-1.5">AI 模型</p>
              <div className="flex gap-1.5">
                {MODELS.map(m => (
                  <button key={m.id} onClick={() => setModel(m.id)}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] transition-all ${
                      model === m.id ? "bg-purple-500/15 border border-purple-400/20 text-purple-300" : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white/60"
                    }`}>{m.label}<div className="text-[8px] opacity-60">{m.sub}</div></button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1.5">每张生成数量</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setNumImages(n)}
                    className={`w-8 h-7 rounded-lg text-xs transition-all ${
                      numImages === n ? "bg-purple-500/15 border border-purple-400/20 text-purple-300" : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white/60"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/25 mb-1.5">风格强度</p>
              <div className="flex gap-1">
                {INTENSITIES.map(i => (
                  <button key={i.id} onClick={() => setIntensity(i.id)}
                    className={`flex-1 text-center py-1 rounded-lg text-[10px] transition-all ${
                      intensity === i.id ? "bg-purple-500/15 border border-purple-400/20 text-purple-300" : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white/60"
                    }`}>{i.label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={() => setHd(!hd)}
                className={`flex items-center gap-1.5 text-[10px] px-3 py-2 rounded-lg border transition-all ${
                  hd ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-white/40"
                }`}>
                <Zap className="w-3.5 h-3.5" /> HD 增强 (+5 积分/张)
              </button>
            </div>
          </div>
        )}

        {/* Generate */}
        <button onClick={handleGenerate} disabled={files.length === 0 || loading}
          className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          {loading ? "AI 创作中..." : files.length > 1 ? `生成宠物写真 · ${files.length} 张照片 · ${totalCost} 积分` : `生成宠物写真 · ${totalCost} 积分`}
        </button>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowGallery(false)}>
          <div className="bg-neutral-950 border border-white/[0.08] rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">🖼️ 作品画廊</h3>
                <div className="flex gap-1">
                  <button onClick={() => setGalleryFilter("all")}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${galleryFilter === "all" ? "bg-white/[0.08] text-white/80" : "text-white/30 hover:text-white/60"}`}>全部</button>
                  <button onClick={() => setGalleryFilter("favs")}
                    className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${galleryFilter === "favs" ? "bg-pink-500/15 text-pink-300" : "text-white/30 hover:text-white/60"}`}>收藏 ({favorites.length})</button>
                </div>
              </div>
              <button onClick={() => setShowGallery(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {allFavorites.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-12">{galleryFilter === "favs" ? "还没有收藏作品" : "暂无生成记录"}</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {allFavorites.map((h: any) => {
                    const urls = typeof h.results === "string" ? JSON.parse(h.results) : (h.results || []);
                    return urls.map((url: string, i: number) => (
                      <div key={`${h.id}-${i}`} className="group relative aspect-square rounded-lg overflow-hidden border border-white/[0.06] bg-black/20">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleDownload(url)}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><Download className="w-4 h-4" /></button>
                          <button onClick={() => toggleFav(url)}
                            className={`p-1.5 rounded-lg ${favorites.includes(url) ? "bg-pink-500/50 text-pink-200" : "bg-white/20 hover:bg-white/30 text-white"}`}>
                            <Heart className={`w-4 h-4 ${favorites.includes(url) ? "fill-pink-400" : ""}`} />
                          </button>
                          <button onClick={() => handleShareCard(url)}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><Share2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ));
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
