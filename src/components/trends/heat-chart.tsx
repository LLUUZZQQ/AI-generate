interface HeatPoint { time: string; score: number; }

export function HeatChart({ data }: { data: HeatPoint[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">暂无热度数据</p>;

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
      <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/><stop offset="100%" stopColor="#f97316" stopOpacity="0"/></linearGradient></defs>
      <path d={areaD} fill="url(#fade)" />
      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f97316" />)}
    </svg>
  );
}
