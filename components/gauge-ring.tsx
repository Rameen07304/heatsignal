interface Props {
  /** 0–1 fill of the ring. */
  fraction: number;
  color: string;
  /** Big number in the centre. */
  value: string;
  unit?: string;
  label: string;
  /** Category under the label, e.g. "High". */
  sub?: string;
  size?: number;
}

/** Circular gauge drawn with one SVG arc. */
export function GaugeRing({ fraction, color, value, unit, label, sub, size = 76 }: Props) {
  const stroke = Math.max(5, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(Math.max(fraction, 0), 1);
  return (
    <div className="flex flex-col items-center text-center" role="img" aria-label={`${label}: ${value}${unit ?? ""}${sub ? `, ${sub}` : ""}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - f)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-bold tabular-nums" style={{ fontSize: size / 4.2 }}>{value}</span>
          {unit && <span className="mt-0.5 text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && <div className="max-w-[7rem] truncate text-xs font-semibold text-foreground">{sub}</div>}
    </div>
  );
}
