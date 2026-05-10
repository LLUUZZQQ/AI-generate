interface SuggestionData {
  bestTimes?: string[];
  caption?: string;
  hashtags?: string[];
  bgm?: { name: string }[];
}

interface PublishPanelProps {
  suggestion?: SuggestionData | null;
}

export function PublishPanel({ suggestion }: PublishPanelProps) {
  if (!suggestion) {
    return (
      <div className="glass rounded-xl p-6">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">📝 AI 发布建议</h3>
        <div className="flex items-center gap-3 text-sm text-white/20">
          <div className="size-4 rounded-full border-2 border-white/10 border-t-purple-400 animate-spin" />
          生成中...
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">📝 AI 发布建议</h3>

      {suggestion.bestTimes && suggestion.bestTimes.length > 0 && (
        <div>
          <h4 className="text-[11px] font-medium text-white/50 mb-2">⏰ 最佳发布时间</h4>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.bestTimes.map((t, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60">{t}</span>
            ))}
          </div>
        </div>
      )}

      {suggestion.caption && (
        <div>
          <h4 className="text-[11px] font-medium text-white/50 mb-2">✍️ 推荐配文</h4>
          <p className="text-sm text-white/70 leading-relaxed bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">{suggestion.caption}</p>
        </div>
      )}

      {suggestion.hashtags && suggestion.hashtags.length > 0 && (
        <div>
          <h4 className="text-[11px] font-medium text-white/50 mb-2">#️⃣ 推荐标签</h4>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.hashtags.map((t, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">{t}</span>
            ))}
          </div>
        </div>
      )}

      {suggestion.bgm && suggestion.bgm.length > 0 && (
        <div>
          <h4 className="text-[11px] font-medium text-white/50 mb-2">🎵 推荐 BGM</h4>
          <div className="flex flex-wrap gap-1.5">
            {suggestion.bgm.map((b, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/15">{b.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
