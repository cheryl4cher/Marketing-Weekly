'use client';

interface StarRatingProps {
  /** 0-5 with one decimal allowed. */
  value: number | null;
  size?: number;
}

/** Renders 5 stars with partial fill via overlay clip. */
export default function StarRating({ value, size = 18 }: StarRatingProps) {
  const stars = [0, 1, 2, 3, 4];
  const pct = value == null ? 0 : Math.max(0, Math.min(5, value)) / 5;
  const label = value == null ? '暂无评分' : `${value.toFixed(1)} / 5`;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={label}
      aria-label={label}
    >
      <span className="relative inline-block" style={{ fontSize: size }}>
        <span className="text-black/15 tracking-[2px]" aria-hidden>
          {'★★★★★'}
        </span>
        <span
          className="absolute left-0 top-0 overflow-hidden text-accent tracking-[2px] whitespace-nowrap"
          style={{ width: `${pct * 100}%` }}
          aria-hidden
        >
          {'★★★★★'}
        </span>
      </span>
      <span className="text-xs font-semibold text-ink/70">{label}</span>
    </span>
  );
}
