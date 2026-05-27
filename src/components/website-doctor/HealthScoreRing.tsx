interface Props {
  score?: number | null;
  size?: number;
}

export function HealthScoreRing({ score, size = 88 }: Props) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 80 ? 'hsl(var(--primary))'
    : value >= 50 ? 'hsl(38 92% 50%)'
    : 'hsl(var(--destructive))';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{score == null ? '|' : Math.round(value)}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">health</span>
      </div>
    </div>
  );
}
