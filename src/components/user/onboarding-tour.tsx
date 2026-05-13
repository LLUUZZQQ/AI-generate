"use client";
import { useState, useEffect } from "react";
import { ArrowRight, X, Image, Sparkles, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "framecraft_onboarding_done";

const steps = [
  {
    title: "上传产品照片",
    desc: "拖放或点击上传你想换背景的产品照片。支持 JPG/PNG/WebP，一次最多 20 张。",
    icon: Image,
  },
  {
    title: "选择背景",
    desc: "从你的预设中选择背景，或上传自定义背景，或描述场景让 AI 生成。AI 会智能推荐匹配的背景。",
    icon: Sparkles,
  },
  {
    title: "确认并提交",
    desc: "确认照片数量、背景方式和积分消耗，点击提交后 AI 会自动融合处理。",
    icon: CheckCircle2,
  },
];

export function useOnboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setDone(false);
      // Auto-show after short delay on first visit
      const timer = setTimeout(() => { setStep(0); setShow(true); }, 800);
      return () => clearTimeout(timer);
    } else {
      setDone(true);
    }
  }, []);

  const start = () => { setStep(0); setShow(true); };
  const close = () => { setShow(false); localStorage.setItem(STORAGE_KEY, "1"); setDone(true); };
  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else close();
  };

  const TourModal = show ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={close}>
      <div className="glass p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="absolute top-3 right-3 text-white/20 hover:text-white/50">
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full flex-1 transition-colors ${i <= step ? "bg-purple-400" : "bg-white/[0.08]"}`} />
          ))}
        </div>

        {/* Step icon */}
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center mb-4">
          {(() => { const Icon = steps[step].icon; return <Icon className="w-6 h-6 text-purple-400" />; })()}
        </div>

        {/* Step content */}
        <h3 className="text-lg font-semibold mb-2">{steps[step].title}</h3>
        <p className="text-sm text-white/50 leading-relaxed mb-6">{steps[step].desc}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button onClick={close} className="text-xs text-white/25 hover:text-white/50">跳过</button>
          <button onClick={next}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 text-sm text-purple-300 hover:bg-purple-500/30 transition-colors">
            {step === steps.length - 1 ? "开始使用" : "下一步"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { show, start, TourModal, done };
}
