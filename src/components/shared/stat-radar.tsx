"use client";

import { STAT_META } from "@/lib/poke-constants";

interface StatRadarProps {
  stats: {
    baseHP: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    baseSpAttack: number;
    baseSpDefense: number;
  };
  size?: number;
  compareStats?: Partial<Record<keyof StatRadarProps["stats"], number>> | null;
}

export function StatRadar({ stats, size = 220, compareStats }: StatRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const n = STAT_META.length; // 6
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Normalize 0-255 → 0-1
  const norm = (v: number) => Math.max(0, Math.min(1, v / 255));

  const point = (v: number, i: number) => {
    const r = radius * norm(v);
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };

  const mainPts = STAT_META.map((s, i) => point(stats[s.key as keyof typeof stats] ?? 0, i));
  const mainPath = mainPts.map((p) => `${p[0]},${p[1]}`).join(" ");

  const comparePts = compareStats
    ? STAT_META.map((s, i) => point((compareStats as any)[s.key] ?? 0, i))
    : null;
  const comparePath = comparePts?.map((p) => `${p[0]},${p[1]}`).join(" ");

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label="Stat radar chart">
      {/* Grid rings */}
      {rings.map((r, idx) => {
        const pts = STAT_META.map((_, i) => {
          const rr = radius * r;
          return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))];
        });
        return (
          <polygon
            key={idx}
            points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        );
      })}

      {/* Axes */}
      {STAT_META.map((s, i) => {
        const [x, y] = [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))];
        return (
          <g key={s.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text
              x={cx + (radius + 14) * Math.cos(angle(i))}
              y={cy + (radius + 14) * Math.sin(angle(i))}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontWeight={600}
              fill={s.color}
            >
              {s.label}
            </text>
            <text
              x={cx + (radius + 14) * Math.cos(angle(i))}
              y={cy + (radius + 14) * Math.sin(angle(i)) + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {stats[s.key as keyof typeof stats] ?? 0}
            </text>
          </g>
        );
      })}

      {/* Compare polygon (e.g. base species) */}
      {comparePath && (
        <polygon
          points={comparePath}
          fill="rgba(148, 163, 184, 0.15)"
          stroke="rgba(148, 163, 184, 0.6)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}

      {/* Main polygon */}
      <polygon
        points={mainPath}
        fill="rgba(16, 185, 129, 0.2)"
        stroke="rgb(16, 185, 129)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {mainPts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={STAT_META[i].color} />
      ))}
    </svg>
  );
}
