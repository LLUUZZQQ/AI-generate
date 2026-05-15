"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Sparkles, Download, ArrowLeft, Coins, History, RefreshCw, Shuffle, Zap, ChevronLeft, ChevronRight, ImageIcon, SlidersHorizontal, X, Share2, Heart } from "lucide-react";
import Link from "next/link";

const STYLES = [
  { id: "royal", label: "皇家肖像", icon: "👑", preview: "✨ 奢华宫廷 · 尊贵典雅" },
  { id: "oil-painting", label: "古典油画", icon: "🎨", preview: "伦勃朗式光影 · 贵族气质" },
  { id: "anime", label: "吉卜力动漫", icon: "✨", preview: "治愈魔法 · 温暖细腻" },
  { id: "disney", label: "迪士尼", icon: "🏰", preview: "经典手绘动画 · 童话感" },
  { id: "vangogh", label: "梵高风格", icon: "🌻", preview: "漩涡笔触 · 浓烈色彩" },
  { id: "watercolor", label: "清新水彩", icon: "🖌️", preview: "柔和色彩 · 轻盈通透" },
  { id: "cyberpunk", label: "赛博朋克", icon: "🤖", preview: "霓虹灯光 · 未来科幻" },
  { id: "neon", label: "霓虹灯牌", icon: "💡", preview: "发光灯管 · 复古招牌" },
  { id: "pop-art", label: "波普艺术", icon: "🎯", preview: "饱和色彩 · 漫画风格" },
  { id: "baroque", label: "巴洛克", icon: "🏛️", preview: "戏剧光影 · 华丽金红" },
  { id: "pencil", label: "铅笔素描", icon: "✏️", preview: "细腻线条 · 艺术质感" },
  { id: "stained-glass", label: "彩色玻璃", icon: "🌈", preview: "宝石色块 · 教堂光芒" },
  { id: "ukiyo-e", label: "浮世绘", icon: "🗾", preview: "和风平面 · 木版画质感" },
  { id: "pixel", label: "像素游戏", icon: "👾", preview: "16-bit 复古 · 颗粒美学" },
  { id: "egyptian", label: "埃及法老", icon: "🔱", preview: "黄金青金石 · 壁画风格" },
  { id: "astronaut", label: "太空宇航员", icon: "🚀", preview: "太空头盔 · 深空星云" },
];

const SIZES = [
  { id: "1:1", label: "正方形", sub: "头像/社交" },
  { id: "3:4", label: "竖版", sub: "手机壁纸" },
  { id: "4:3", label: "横版", sub: "桌面壁纸" },
  { id: "9:16", label: "全屏竖版", sub: "朋友圈/小红书" },
];

const INTENSITIES = [
  { id: "light", label: "轻度", desc: "保留原图特色" },
  { id: "medium", label: "中度", desc: "平衡风格与原图" },
  { id: "strong", label: "重度", desc: "完全风格化" },
];

const MODELS = [
  { id: "google/gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash", sub: "快速通用" },
  { id: "black-forest-labs/flux.2-pro", label: "Flux 2 Pro", sub: "细节最佳" },
];

export default function PetPortraitPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();

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

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("royal");
  const [model, setModel] = useState("google/gemini-3.1-flash-image-preview");
  const [numImages, setNumImages] = useState(2);
  const [intensity, setIntensity] = useState("medium");
  const [size, setSize] = useState("1:1");
  const [hd, setHd] = useState(false);
  const [customStyle, setCustomStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [comparePos, setComparePos] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("pet-portrait-favs");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFav = (url: string) => {
    const next = favorites.includes(url) ? favorites.filter(f => f !== url) : [...favorites, url];
    setFavorites(next);
    localStorage.setItem("pet-portrait-favs", JSON.stringify(next));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("图片不能超过 10MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults([]);
  };

  const handleRandomStyle = () => {
    const others = STYLES.filter(s => s.id !== style);
    setStyle(others[Math.floor(Math.random() * others.length)].id);
  };

  const cost = numImages * (3 + (hd ? 5 : 0));

  const handleGenerate = async () => {
    if (!file) { toast.error("请先上传宠物照片"); return; }
    if (!session) { toast.error("请先登录"); return; }
    if (credits < cost) { toast.error(`积分不足，需要 ${cost} 积分`); return; }
    setLoading(true);
    setResults([]);

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("上传失败");
      const uploadData = await uploadRes.json();
      if (uploadData.code !== 0) throw new Error(uploadData.message);
      const fileKey = uploadData.data.key || uploadData.data.filename;

      const genRes = await fetch("/api/pet-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKey, style, model, numImages, intensity, size, hd,
          customStyle: customStyle.trim() || undefined,
        }),
      });
      if (!genRes.ok) throw new Error("生成失败");
      const genData = await genRes.json();
      if (genData.code !== 0) throw new Error(genData.message);

      setResults(genData.data.urls);
      setSelectedIdx(0);
      toast.success(`生成成功！消耗 ${genData.data.cost} 积分`);
      qc.invalidateQueries({ queryKey: ["user-me"] });
      refetchHistory();
    } catch (e: any) {
      toast.error(e.message || "网络错误，请重试");
    }
    setLoading(false);
  };

  const handleDownload = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl; a.download = `pet-portrait-${style}.png`; a.click();
    URL.revokeObjectURL(objUrl);
  };

  const handleShare = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("已复制到剪贴板！可直接粘贴发送");
    } catch {
      toast.error("分享失败，请下载后手动分享");
    }
  };

  const nav = (dir: -1 | 1) => {
    setSelectedIdx(prev => {
      if (dir === -1) return prev <= 0 ? results.length - 1 : prev - 1;
      return prev >= results.length - 1 ? 0 : prev + 1;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
            🐾 AI 宠物艺术写真
          </h1>
          <p className="text-sm text-white/35">上传宠物照片，AI 生成大师级艺术肖像</p>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
              <Coins className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-sm font-medium text-white/80">{credits}</span>
              <span className="text-[10px] text-white/25">积分</span>
            </div>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
              showHistory ? "bg-purple-500/15 border border-purple-400/30 text-purple-300" : "bg-white/[0.04] border border-white/[0.06] text-white/50"
            }`}
          >
            <History className="w-3.5 h-3.5" /> 历史
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="glass p-5 mb-6">
          <h3 className="text-sm font-medium text-white/50 mb-4">生成历史</h3>
          {history.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-8">暂无记录</p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {history.map((h: any) => {
                const urls = typeof h.results === "string" ? JSON.parse(h.results) : (h.results || []);
                return (
                  <button key={h.id} onClick={() => { setResults(urls); setSelectedIdx(0); setShowHistory(false); }}
                    className="aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all bg-black/20">
                    <img src={urls[0]} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="glass p-6 md:p-8 space-y-6">
        {/* Upload / Result */}
        {!preview ? (
          <label className="block relative border-2 border-dashed rounded-xl border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02] cursor-pointer transition-colors">
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <div className="flex flex-col items-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-sm text-white/60">点击上传宠物照片</p>
              <p className="text-xs text-white/25 mt-2">支持 JPG / PNG / WebP，最大 10MB</p>
            </div>
          </label>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Original */}
            <div className="w-full md:w-1/3">
              <p className="text-xs text-white/30 mb-2">原图</p>
              <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-black/20">
                <img src={preview} alt="预览" className="w-full h-full object-contain" />
              </div>
              <button onClick={() => { setFile(null); setPreview(""); setResults([]); }}
                className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                重新上传
              </button>
            </div>

            {/* Result */}
            <div className="w-full md:w-2/3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/30">
                  生成结果 {results.length > 0 && `(${selectedIdx + 1}/${results.length})`}
                </p>
                {results.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowCompare(!showCompare)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                        showCompare ? "border-purple-400/30 bg-purple-500/10 text-purple-300" : "border-white/[0.06] text-white/40 hover:text-white/70"
                      }`}>
                      {showCompare ? "关闭对比" : "前后对比"}
                    </button>
                    {results.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => nav(-1)} className="p-1 rounded hover:bg-white/[0.06] text-white/40"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-[10px] text-white/25">{selectedIdx + 1}/{results.length}</span>
                        <button onClick={() => nav(1)} className="p-1 rounded hover:bg-white/[0.06] text-white/40"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-black/20 relative">
                {results.length > 0 ? (
                  showCompare ? (
                    <div className="relative w-full h-full overflow-hidden" onMouseMove={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setComparePos(((e.clientX - rect.left) / rect.width) * 100);
                    }}>
                      <img src={results[selectedIdx]} alt="" className="absolute inset-0 w-full h-full object-contain" />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: `${comparePos}%` }}>
                        <img src={preview} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ minWidth: `${100 / (comparePos / 100)}%` }} />
                      </div>
                      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg" style={{ left: `${comparePos}%` }} />
                      <div className="absolute top-2 left-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded">生成</div>
                      <div className="absolute top-2 right-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded">原图</div>
                    </div>
                  ) : (
                    <img src={results[selectedIdx]} alt="" className="w-full h-full object-contain" />
                  )
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    <p className="text-xs text-white/30">AI 正在创作中...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-white/15">等待生成</p>
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => handleDownload(results[selectedIdx])}
                    className="flex items-center gap-1 text-[11px] bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 rounded-lg px-3 py-1.5 transition-colors">
                    <Download className="w-3.5 h-3.5" /> 下载
                  </button>
                  <button onClick={() => handleShare(results[selectedIdx])}
                    className="flex items-center gap-1 text-[11px] bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] text-white/70 rounded-lg px-3 py-1.5 transition-colors">
                    <Share2 className="w-3.5 h-3.5" /> 复制分享
                  </button>
                  <button onClick={() => toggleFav(results[selectedIdx])}
                    className={`flex items-center gap-1 text-[11px] rounded-lg px-3 py-1.5 transition-colors ${
                      favorites.includes(results[selectedIdx])
                        ? "bg-pink-500/10 border border-pink-400/30 text-pink-300"
                        : "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.10]"
                    }`}>
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(results[selectedIdx]) ? "fill-pink-400" : ""}`} />
                    {favorites.includes(results[selectedIdx]) ? "已收藏" : "收藏"}
                  </button>
                </div>
              )}

              {/* Thumbnails for multi-image */}
              {results.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {results.map((url, i) => (
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

        {/* Style Grid */}
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
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={`text-center p-2.5 rounded-xl border transition-all ${
                  style === s.id
                    ? "border-purple-400/40 bg-purple-500/10"
                    : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.10]"
                }`}
              >
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="text-[10px] font-medium text-white/70">{s.label}</div>
              </button>
            ))}
          </div>
          {/* Custom style */}
          <div className="mt-2">
            <input
              type="text"
              value={customStyle}
              onChange={e => setCustomStyle(e.target.value)}
              placeholder="或输入自定义风格描述..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/[0.12]"
            />
          </div>
        </div>

        {/* Settings row */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showSettings ? "收起设置" : "高级设置"}
          </button>
          <span className="text-[10px] text-white/20">
            {numImages}张 × {hd ? "HD" : "标清"} = {cost} 积分
          </span>
        </div>

        {showSettings && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            {/* Model */}
            <div>
              <p className="text-[10px] text-white/25 mb-1.5">AI 模型</p>
              <div className="flex gap-1.5">
                {MODELS.map(m => (
                  <button key={m.id} onClick={() => setModel(m.id)}
                    className={`flex-1 text-center py-1.5 rounded-lg text-[10px] transition-all ${
                      model === m.id ? "bg-purple-500/15 border border-purple-400/20 text-purple-300" : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white/60"
                    }`}>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[8px] opacity-60">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of images */}
            <div>
              <p className="text-[10px] text-white/25 mb-1.5">生成数量</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setNumImages(n)}
                    className={`w-8 h-7 rounded-lg text-xs transition-all ${
                      numImages === n ? "bg-purple-500/15 border border-purple-400/20 text-purple-300" : "bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white/60"
                    }`}>{n}</button>
                ))}
              </div>
            </div>

            {/* Intensity */}
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

            {/* Size + HD */}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-white/25 mb-1.5">输出尺寸</p>
                <select value={size} onChange={e => setSize(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-[10px] text-white/60">
                  {SIZES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.sub})</option>)}
                </select>
              </div>
              <button onClick={() => setHd(!hd)}
                className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                  hd ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-white/[0.06] bg-white/[0.02] text-white/40"
                }`}>
                <Zap className="w-3 h-3" /> HD 增强 (+5 积分)
              </button>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!file || loading}
          className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? "AI 创作中..." : `生成宠物写真 · ${cost} 积分`}
        </button>
      </div>
    </div>
  );
}
