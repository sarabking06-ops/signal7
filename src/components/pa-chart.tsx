import {
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPack, ChartPoint, Level } from "@/lib/pa/engine";
import { formatPx, formatWhen } from "@/lib/pa/format";

const LEVEL_COLOR: Record<Level["kind"], string> = {
  entry: "var(--color-brass)",
  stop: "var(--color-down)",
  tp: "var(--color-up)",
  high: "var(--color-muted)",
  low: "var(--color-muted)",
};

type Axis = { scale: (value: number) => number };
type LayerProps = {
  xAxisMap?: Record<string, Axis>;
  yAxisMap?: Record<string, Axis>;
};

function CandleLayer({ xAxisMap, yAxisMap, points }: LayerProps & { points: ChartPoint[] }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis || points.length < 2) return null;
  const step = Math.abs(xAxis.scale(points[1].i) - xAxis.scale(points[0].i)) || 6;
  const bodyW = Math.max(2.5, Math.min(9, step * 0.62));
  return (
    <g>
      {points.map((point) => {
        const cx = xAxis.scale(point.i);
        const yHigh = yAxis.scale(point.h);
        const yLow = yAxis.scale(point.l);
        const yOpen = yAxis.scale(point.o);
        const yClose = yAxis.scale(point.c);
        if (![cx, yHigh, yLow, yOpen, yClose].every(Number.isFinite)) return null;
        const rising = point.c >= point.o;
        const color = rising ? "var(--color-up)" : "var(--color-down)";
        const top = Math.min(yOpen, yClose);
        const height = Math.max(1, Math.abs(yClose - yOpen));
        return (
          <g key={point.t}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
            <rect x={cx - bodyW / 2} y={top} width={bodyW} height={height} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

function Tip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartPoint }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg">
      <div className="font-num text-muted">{formatWhen(point.t)}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-num">
        <span>O {formatPx(point.o)}</span>
        <span>H {formatPx(point.h)}</span>
        <span>L {formatPx(point.l)}</span>
        <span>C {formatPx(point.c)}</span>
      </div>
    </div>
  );
}

export function PaChart({ pack }: { pack: ChartPack }) {
  const points = pack.points;
  if (points.length < 5) {
    return <p className="px-1 py-6 text-sm text-muted">کندل کافی برای نمودار نیست.</p>;
  }
  const values = points.flatMap((point) => [point.l, point.h]);
  for (const level of pack.levels) values.push(level.price);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.08 || Math.abs(high) * 0.02 || 1;

  function layer(props: LayerProps) {
    return <CandleLayer {...props} points={points} />;
  }

  return (
    <div dir="ltr" className="h-64 w-full min-w-0 lg:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="i" type="number" domain={["dataMin", "dataMax"]} hide />
          <YAxis
            domain={[low - pad, high + pad]}
            orientation="left"
            width={72}
            tickFormatter={(value: number) => formatPx(value)}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<Tip />} />
          {pack.levels.map((level) => (
            <ReferenceLine
              key={`${level.kind}-${level.price}`}
              y={level.price}
              stroke={LEVEL_COLOR[level.kind]}
              strokeDasharray={level.kind === "high" || level.kind === "low" ? "2 4" : "5 4"}
              strokeWidth={1}
            />
          ))}
          <Line
            dataKey="ema20"
            stroke="var(--color-brass)"
            dot={false}
            strokeWidth={1.4}
            connectNulls
            isAnimationActive={false}
            name="EMA20"
          />
          <Customized component={layer} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
