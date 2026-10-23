import { useId } from 'react';

interface SparklineProps {
  values: number[];
  color: string;
  height?: number;
}

const W = 120;

export default function Sparkline({ values, color, height = 34 }: SparklineProps) {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * W;
    const y = height - 3 - ((value - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${W},${height} L 0,${height} Z`} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
