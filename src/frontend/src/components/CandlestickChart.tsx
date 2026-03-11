import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Candle } from "../indicators";
import { type AssetSymbol, DECIMALS } from "../marketEngine";

interface CandleChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  // For bar rendering: [low, high] for wick, colored body
  wickRange: [number, number];
  bodyRange: [number, number];
  isBullish: boolean;
}

function formatCandles(
  candles: Candle[],
  asset: AssetSymbol,
): CandleChartData[] {
  const decimals = DECIMALS[asset] ?? 4;
  return candles.slice(-50).map((c) => {
    const isBullish = c.close >= c.open;
    const bodyLow = Math.min(c.open, c.close);
    const bodyHigh = Math.max(c.open, c.close);
    return {
      time: new Date(c.time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      open: Number.parseFloat(c.open.toFixed(decimals)),
      high: Number.parseFloat(c.high.toFixed(decimals)),
      low: Number.parseFloat(c.low.toFixed(decimals)),
      close: Number.parseFloat(c.close.toFixed(decimals)),
      wickRange: [
        Number.parseFloat(c.low.toFixed(decimals)),
        Number.parseFloat(c.high.toFixed(decimals)),
      ],
      bodyRange: [
        Number.parseFloat(bodyLow.toFixed(decimals)),
        Number.parseFloat(bodyHigh.toFixed(decimals)),
      ],
      isBullish,
    };
  });
}

// Custom candle bar shape
const CandleShape = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandleChartData;
  value?: [number, number];
  isBullish?: boolean;
  isWick?: boolean;
}) => {
  const { x = 0, width = 0, payload, value } = props;
  if (!payload || !value) return null;

  const isBullish = payload.isBullish;
  const bullColor = "oklch(0.72 0.22 142)";
  const bearColor = "oklch(0.6 0.22 25)";
  const color = isBullish ? bullColor : bearColor;

  // This is the wick bar
  return (
    <rect
      x={x + width * 0.45}
      width={Math.max(1, width * 0.1)}
      y={props.y ?? 0}
      height={props.height ?? 0}
      fill={color}
    />
  );
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CandleChartData }>;
  asset: AssetSymbol;
}

function CandleTooltip({ active, payload, asset }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const decimals = DECIMALS[asset] ?? 4;
  const isBullish = d.isBullish;
  const color = isBullish ? "oklch(0.72 0.22 142)" : "oklch(0.6 0.22 25)";

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <div className="text-muted-foreground mb-1">{d.time}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">O</span>
        <span style={{ color }}>{d.open.toFixed(decimals)}</span>
        <span className="text-muted-foreground">H</span>
        <span style={{ color }}>{d.high.toFixed(decimals)}</span>
        <span className="text-muted-foreground">L</span>
        <span style={{ color }}>{d.low.toFixed(decimals)}</span>
        <span className="text-muted-foreground">C</span>
        <span style={{ color }}>{d.close.toFixed(decimals)}</span>
      </div>
    </div>
  );
}

interface Props {
  candles: Candle[];
  asset: AssetSymbol;
  height?: number;
}

export function CandlestickChart({ candles, asset, height = 300 }: Props) {
  const data = formatCandles(candles, asset);
  const decimals = DECIMALS[asset] ?? 4;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading chart data...
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.low, d.high]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
      >
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="oklch(0.22 0.03 255 / 0.4)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{
            fill: "oklch(0.55 0.025 240)",
            fontSize: 10,
            fontFamily: "JetBrains Mono",
          }}
          tickLine={false}
          axisLine={{ stroke: "oklch(0.22 0.03 255)" }}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          domain={[minVal - padding, maxVal + padding]}
          tick={{
            fill: "oklch(0.55 0.025 240)",
            fontSize: 10,
            fontFamily: "JetBrains Mono",
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(decimals)}
          width={60}
        />
        <Tooltip content={<CandleTooltip asset={asset} />} />

        {/* Wick bars */}
        <Bar
          dataKey="wickRange"
          fill="oklch(0.55 0.025 240)"
          shape={(props: unknown) => {
            const p = props as {
              x?: number;
              y?: number;
              width?: number;
              height?: number;
              payload?: CandleChartData;
            };
            if (!p.payload) return <g />;
            const color = p.payload.isBullish
              ? "oklch(0.72 0.22 142)"
              : "oklch(0.6 0.22 25)";
            const cx = (p.x ?? 0) + (p.width ?? 0) / 2;
            return (
              <rect
                x={cx - 0.5}
                y={p.y ?? 0}
                width={1.5}
                height={p.height ?? 0}
                fill={color}
                opacity={0.7}
              />
            );
          }}
        />

        {/* Candle body bars */}
        <Bar
          dataKey="bodyRange"
          shape={(props: unknown) => {
            const p = props as {
              x?: number;
              y?: number;
              width?: number;
              height?: number;
              payload?: CandleChartData;
            };
            if (!p.payload) return <g />;
            const isBullish = p.payload.isBullish;
            const bullColor = "oklch(0.72 0.22 142)";
            const bearColor = "oklch(0.6 0.22 25)";
            const color = isBullish ? bullColor : bearColor;
            const w = Math.max(2, (p.width ?? 6) * 0.7);
            const cx = (p.x ?? 0) + (p.width ?? 0) / 2;
            const minH = Math.max(1, p.height ?? 0);
            return (
              <rect
                x={cx - w / 2}
                y={p.y ?? 0}
                width={w}
                height={minH}
                fill={isBullish ? `${color}` : color}
                stroke={color}
                strokeWidth={0.5}
                opacity={isBullish ? 0.85 : 1}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// MACD Histogram Chart
interface MACDData {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

interface MACDChartProps {
  data: MACDData[];
  height?: number;
}

export function MACDChart({ data, height = 120 }: MACDChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
      >
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="oklch(0.22 0.03 255 / 0.4)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tick={{
            fill: "oklch(0.55 0.025 240)",
            fontSize: 9,
            fontFamily: "JetBrains Mono",
          }}
          tickLine={false}
          axisLine={{ stroke: "oklch(0.22 0.03 255)" }}
          interval={Math.floor(data.length / 5)}
        />
        <YAxis
          tick={{
            fill: "oklch(0.55 0.025 240)",
            fontSize: 9,
            fontFamily: "JetBrains Mono",
          }}
          tickLine={false}
          axisLine={false}
          width={45}
          tickFormatter={(v) => v.toFixed(4)}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.14 0.025 257)",
            border: "1px solid oklch(0.22 0.03 255)",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: "JetBrains Mono",
          }}
        />
        <ReferenceLine
          y={0}
          stroke="oklch(0.35 0.03 255)"
          strokeDasharray="3 3"
        />
        <Bar
          dataKey="histogram"
          shape={(props: unknown) => {
            const p = props as {
              x?: number;
              y?: number;
              width?: number;
              height?: number;
              payload?: MACDData;
            };
            if (!p.payload) return <g />;
            const isPositive = (p.payload.histogram ?? 0) >= 0;
            const color = isPositive
              ? "oklch(0.72 0.22 142 / 0.7)"
              : "oklch(0.6 0.22 25 / 0.7)";
            return (
              <rect
                x={p.x ?? 0}
                y={p.y ?? 0}
                width={Math.max(1, (p.width ?? 4) - 1)}
                height={Math.max(1, p.height ?? 0)}
                fill={color}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="macd"
          stroke="oklch(0.72 0.18 195)"
          strokeWidth={1.5}
          dot={false}
          name="MACD"
        />
        <Line
          type="monotone"
          dataKey="signal"
          stroke="oklch(0.75 0.19 60)"
          strokeWidth={1.5}
          dot={false}
          name="Signal"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export { CandleShape };
