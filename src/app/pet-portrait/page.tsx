"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Upload, Sparkles, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

const STYLES = [
  { id: "oil-painting", label: "古典油画", icon: "🎨", desc: "伦勃朗式光影 · 贵族气质" },
  { id: "watercolor", label: "清新水彩", icon: "🖌️", desc: "柔和色彩 · 轻盈通透" },
  { id: "cyberpunk", label: "赛博朋克", icon: "🤖", desc: "霓虹灯光 · 未来科幻" },
  { id: "royal", label: "皇家肖像", icon: "👑", desc: "奢华宫廷 · 尊贵典雅" },
  { id: "anime", label: "吉卜力动漫", icon: "✨", desc: "治愈魔法 · 温暖细腻" },
  { id: "vangogh", label: "梵高风格", icon: "🌻", desc: "漩涡笔触 · 浓烈色彩" },
];

export default function PetPortraitPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [style, setStyle] = useState("oil-painting");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("图片不能超过 10MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult("");
  };

  const handleGenerate = async () => {
    if (!file) { toast.error("请先上传宠物照片"); return; }
    if (!session) { toast.error("请先登录"); return; }
    setLoading(true);

    try {
      // Upload
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) { toast.error("上传失败"); setLoading(false); return; }
      const uploadData = await uploadRes.json();
      if (uploadData.code !== 0) { toast.error(uploadData.message); setLoading(false); return; }
      const fileKey = uploadData.data.key || uploadData.data.filename;

      // Generate
      const genRes = await fetch("/api/pet-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, style }),
      });
      if (!genRes.ok) { toast.error("生成失败"); setLoading(false); return; }
      const genData = await genRes.json();
      if (genData.code !== 0) { toast.error(genData.message || "生成失败"); setLoading(false); return; }

      console.log("[pet-portrait] result URL:", genData.data?.url);
      setResult(genData.data.url);
      toast.success("生成成功！消耗 3 积分");
    } catch {
      toast.error("网络错误，请重试");
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!result) return;
    const res = await fetch(result);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pet-portrait.png"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white/70 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
          🐾 AI 宠物艺术写真
        </h1>
        <p className="text-sm text-white/35 max-w-md mx-auto">
          上传一张宠物照片，AI 生成大师级艺术肖像。多种风格可选，每张仅需 <span className="text-purple-400 font-medium">3 积分</span>
        </p>
      </div>

      <div className="glass p-6 md:p-8 space-y-6">
        {/* Upload */}
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
            {/* Preview */}
            <div className="w-full md:w-1/2">
              <p className="text-xs text-white/30 mb-2">原图</p>
              <div className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-black/20">
                <img src={preview} alt="预览" className="w-full h-full object-contain" />
              </div>
              <button
                onClick={() => { setFile(null); setPreview(""); setResult(""); }}
                className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                重新上传
              </button>
            </div>

            {/* Result */}
            <div className="w-full md:w-1/2">
              <p className="text-xs text-white/30 mb-2">生成结果</p>
              {result ? (
                <div className="aspect-square rounded-xl overflow-hidden border border-purple-400/20 bg-black/20">
                  <img src={result} alt="生成结果" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="aspect-square rounded-xl border border-white/[0.06] bg-white/[0.01] flex items-center justify-center">
                  {loading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                      <p className="text-xs text-white/30">AI 正在创作...</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/15">等待生成</p>
                  )}
                </div>
              )}
              {result && (
                <button
                  onClick={handleDownload}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> 下载
                </button>
              )}
            </div>
          </div>
        )}

        {/* Style selector */}
        <div>
          <p className="text-xs font-medium text-white/30 mb-3">选择风格</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`text-center p-3 rounded-xl border transition-all ${
                  style === s.id
                    ? "border-purple-400/40 bg-purple-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-[11px] font-medium text-white/70">{s.label}</div>
                <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!file || loading}
          className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? "AI 创作中..." : "生成宠物写真 · 消耗 3 积分"}
        </button>
      </div>
    </div>
  );
}
