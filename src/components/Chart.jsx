// Biểu đồ đường SVG đơn giản (không cần thư viện)
export default function Chart({ points, unit = "" }) {
  if (!points.length) return <div className="empty-box">Chưa có dữ liệu trong khoảng thời gian này</div>;

  const W = 720, H = 220, P = { l: 52, r: 14, t: 14, b: 28 };
  const xs = points.map((p) => new Date(p.ts).getTime());
  const ys = points.map((p) => p.value);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
  const span = hi - lo || 1;
  const [minY, maxY] = [lo - span * 0.1, hi + span * 0.1];
  const sx = (x) => P.l + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * (W - P.l - P.r);
  const sy = (y) => P.t + (1 - (y - minY) / (maxY - minY)) * (H - P.t - P.b);

  const line = points.map((p, i) => `${i ? "L" : "M"}${sx(xs[i]).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3].map((i) => minY + ((maxY - minY) * i) / 3);
  const fmtT = (t) => new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const fmtD = (t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={sy(t)} y2={sy(t)} className="grid" />
          <text x={P.l - 8} y={sy(t) + 4} textAnchor="end" className="axis">
            {Number(t.toFixed(1))}
          </text>
        </g>
      ))}
      <path d={line} className="line" fill="none" />
      {points.length <= 60 &&
        points.map((p, i) => (
          <circle key={i} cx={sx(xs[i])} cy={sy(p.value)} r="3" className="dot">
            <title>{`${p.value}${unit} — ${new Date(p.ts).toLocaleString("vi-VN")}`}</title>
          </circle>
        ))}
      <text x={P.l} y={H - 8} className="axis">
        {fmtD(minX)} {fmtT(minX)}
      </text>
      <text x={W - P.r} y={H - 8} textAnchor="end" className="axis">
        {fmtD(maxX)} {fmtT(maxX)}
      </text>
    </svg>
  );
}
