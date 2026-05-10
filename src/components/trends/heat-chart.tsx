interface HeatPoint { time: string; score: number; }

export function HeatChart({ data }: { data: HeatPoint[] }) {
  if (!data.length) return <p className="text-sm text-white/20 text-center py-4">暂无热度数据</p>;

  const width = 600; const height = 200; const padding = 30;
  const maxScore = Math.max(...data.map(d => d.score), 1);
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
    y: height - padding - (d.score / maxScore) * (height - padding * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - padding - ratio * (height - padding * 2);
        return <line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />;
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#heatGradient)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#a855f7" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      ))}
    </svg>
  );
}
