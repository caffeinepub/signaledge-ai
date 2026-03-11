import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Activity, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectPatterns } from "../chartPatterns";
import type { ChartPattern } from "../chartPatterns";
import { CandlestickChart, MACDChart } from "../components/CandlestickChart";
import {
  ActiveSignalCard,
  type GeneratedSignalUI,
} from "../components/SignalCard";
import { useAddSignal } from "../hooks/useQueries";
import { Direction } from "../hooks/useQueries";
import { calcMACDHistory } from "../indicators";
import type { Candle } from "../indicators";
import {
  ASSETS,
  type AssetSymbol,
  DECIMALS,
  useMarketEngine,
} from "../marketEngine";
import {
  DEFAULT_CONFIG,
  type IndicatorValues,
  calcIndicators,
  generateSignal,
} from "../signalGenerator";

const COOLDOWN_MS = 15_000; // 15s between signals per asset
const lastSignalTime: Map<string, number> = new Map();

function formatPrice(price: number, asset: AssetSymbol): string {
  return price.toFixed(DECIMALS[asset] ?? 4);
}

interface IndicatorPanelProps {
  indicators: IndicatorValues;
  patterns: ChartPattern[];
}

function IndicatorPanel({ indicators, patterns }: IndicatorPanelProps) {
  const rsiColor =
    indicators.rsi > 70
      ? "text-sell"
      : indicators.rsi < 30
        ? "text-buy"
        : "text-foreground";

  return (
    <div className="space-y-4">
      {/* 1M Pattern Detection */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            1M Patterns
          </span>
          <span className="text-[10px] font-mono text-primary">
            {patterns.length > 0
              ? `${patterns.length} detected`
              : "Scanning..."}
          </span>
        </div>
        {patterns.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/60 font-mono text-center py-2">
            No patterns on current candle
          </div>
        ) : (
          <div className="space-y-1.5">
            {patterns.slice(0, 3).map((p) => {
              const isBull = p.direction === "bullish";
              const isBear = p.direction === "bearish";
              return (
                <div
                  key={p.name}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-1.5 border text-[10px] font-mono",
                    isBull
                      ? "bg-buy/10 border-buy/20 text-buy"
                      : isBear
                        ? "bg-sell/10 border-sell/20 text-sell"
                        : "bg-muted/30 border-border text-muted-foreground",
                  )}
                >
                  <span className="font-bold truncate">{p.name}</span>
                  <span className="ml-2 flex-shrink-0">
                    {"★".repeat(p.strength)}
                    {"☆".repeat(3 - p.strength)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RSI */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            RSI (14)
          </span>
          <span className={cn("text-sm font-black font-mono", rsiColor)}>
            {indicators.rsi.toFixed(1)}
          </span>
        </div>
        <div className="relative">
          <Progress value={indicators.rsi} className="h-2 bg-muted" />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 left-[30%] w-px bg-buy/40" />
            <div className="absolute top-0 bottom-0 left-[70%] w-px bg-sell/40" />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-buy">OS 30</span>
          <span className="text-[9px] font-mono text-sell">OB 70</span>
        </div>
      </div>

      {/* Stochastic */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Stochastic
          </span>
          <div className="flex gap-2 text-xs font-mono">
            <span className="text-primary">
              K: {indicators.stochK.toFixed(1)}
            </span>
            <span className="text-yellow-400">
              D: {indicators.stochD.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="relative">
            <Progress value={indicators.stochK} className="h-1.5 bg-muted" />
          </div>
          <div className="relative">
            <Progress
              value={indicators.stochD}
              className="h-1.5 bg-muted [&>div]:bg-yellow-400"
            />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-buy">OS 20</span>
          <span className="text-[9px] font-mono text-sell">OB 80</span>
        </div>
      </div>

      {/* MACD */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            MACD
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "MACD",
              value: indicators.macd.toFixed(5),
              color: "text-primary",
            },
            {
              label: "Signal",
              value: indicators.macdSignal.toFixed(5),
              color: "text-yellow-400",
            },
            {
              label: "Hist",
              value: indicators.macdHistogram.toFixed(5),
              color: indicators.macdHistogram >= 0 ? "text-buy" : "text-sell",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-[9px] text-muted-foreground uppercase">
                {label}
              </div>
              <div
                className={cn(
                  "text-[10px] font-mono font-bold mt-0.5 truncate",
                  color,
                )}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADX / Volatility */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Trend Strength
          </span>
          <span
            className={cn(
              "text-xs font-mono font-bold",
              indicators.adx >= 25 ? "text-buy" : "text-muted-foreground",
            )}
          >
            ADX {indicators.adx.toFixed(0)}
          </span>
        </div>
        <Progress
          value={Math.min(100, indicators.adx)}
          className="h-2 bg-muted"
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[9px] font-mono text-muted-foreground">
            Weak
          </span>
          <span
            className={cn(
              "text-[9px] font-mono",
              indicators.adx >= 25 ? "text-buy" : "text-muted-foreground",
            )}
          >
            {indicators.adx >= 25 ? "Trending" : "Ranging"}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">
            Strong
          </span>
        </div>
      </div>
    </div>
  );
}

// Price ticker component with flash animation
function PriceTicker({
  price,
  prevPrice,
  asset,
}: { price: number; prevPrice: number; asset: AssetSymbol }) {
  const isUp = price > prevPrice;
  const [flashKey, setFlashKey] = useState(0);
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price !== prevPrice) {
      setFlashDir(isUp ? "up" : "down");
      setFlashKey((k) => k + 1);
    }
  }, [price, prevPrice, isUp]);

  return (
    <motion.div
      key={flashKey}
      initial={{
        color:
          flashDir === "up"
            ? "oklch(0.72 0.22 142)"
            : flashDir === "down"
              ? "oklch(0.6 0.22 25)"
              : undefined,
      }}
      animate={{ color: "oklch(0.92 0.01 220)" }}
      transition={{ duration: 0.5 }}
      className="text-4xl font-black font-mono tracking-tight"
    >
      {formatPrice(price, asset)}
    </motion.div>
  );
}

export function Dashboard() {
  const {
    asset,
    setAsset,
    candles,
    currentPrice,
    priceChange,
    priceChangePct,
  } = useMarketEngine();

  const [timeframe, setTimeframe] = useState<"1M" | "5M">("1M");
  const [indicators, setIndicators] = useState<IndicatorValues>({
    rsi: 50,
    stochK: 50,
    stochD: 50,
    macd: 0,
    macdSignal: 0,
    macdHistogram: 0,
    atr: 0,
    adx: 25,
  });
  const [activeSignal, setActiveSignal] = useState<GeneratedSignalUI | null>(
    null,
  );
  const [macdChartData, setMacdChartData] = useState<
    { time: string; macd: number; signal: number; histogram: number }[]
  >([]);
  const [currentPatterns, setCurrentPatterns] = useState<ChartPattern[]>([]);
  const prevPriceRef = useRef(currentPrice);
  const addSignal = useAddSignal();

  const updateIndicators = useCallback((targetCandles: Candle[]) => {
    if (targetCandles.length < 30) return;
    const ind = calcIndicators(targetCandles, DEFAULT_CONFIG);
    setIndicators(ind);

    // Update pattern detection
    const patterns = detectPatterns(targetCandles);
    setCurrentPatterns(patterns);

    // Build MACD chart data
    const closes = targetCandles.map((c) => c.close);
    const macdHistory = calcMACDHistory(closes, 12, 26, 9);
    const chartData = macdHistory.slice(-30).map((m, i) => ({
      time: new Date(
        targetCandles[targetCandles.length - macdHistory.length + i]?.time ??
          Date.now(),
      ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      macd: m.macd,
      signal: m.signal,
      histogram: m.histogram,
    }));
    setMacdChartData(chartData);
  }, []);

  // Update indicators whenever candles change
  useEffect(() => {
    updateIndicators(candles);
    prevPriceRef.current = currentPrice;
  }, [candles, currentPrice, updateIndicators]);

  const addSignalMutate = addSignal.mutate;

  // Signal detection - runs whenever candles update
  useEffect(() => {
    if (candles.length < 40) return;

    const now = Date.now();
    const lastTime = lastSignalTime.get(asset) ?? 0;
    if (now - lastTime < COOLDOWN_MS) return;

    const signal = generateSignal(asset, candles, DEFAULT_CONFIG);
    if (!signal) return;

    lastSignalTime.set(asset, now);

    setActiveSignal({
      asset: signal.asset,
      direction: signal.direction,
      confidence: signal.confidence,
      expiryMinutes: signal.expiryMinutes,
      timestamp: now,
      pattern: signal.pattern,
    });

    // Save to backend (fire and forget)
    addSignalMutate({
      asset: signal.asset,
      direction: signal.direction === "buy" ? Direction.buy : Direction.sell,
      confidence: signal.confidence,
      expiryMinutes: signal.expiryMinutes,
      rsi: signal.rsi,
      stochasticK: signal.stochasticK,
      stochasticD: signal.stochasticD,
      macdValue: signal.macdValue,
      macdSignalLine: signal.macdSignalLine,
    });

    // Clear signal after expiry
    const expiryMs = signal.expiryMinutes * 60 * 1000;
    setTimeout(() => {
      setActiveSignal((prev) => (prev?.timestamp === now ? null : prev));
    }, expiryMs);
  }, [candles, asset, addSignalMutate]);

  const isPositive = priceChange >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/30">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Asset tabs */}
          <div className="flex-1 min-w-0">
            <Tabs
              value={asset}
              onValueChange={(v) => setAsset(v as AssetSymbol)}
            >
              <TabsList className="bg-muted/60 h-9 gap-0.5 flex-wrap">
                {ASSETS.map((a, i) => (
                  <TabsTrigger
                    key={a}
                    value={a}
                    data-ocid={`dashboard.asset.tab.${i + 1}`}
                    className="font-mono text-xs px-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                  >
                    {a}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Timeframe + Price */}
          <div className="flex items-center gap-6">
            <ToggleGroup
              type="single"
              value={timeframe}
              onValueChange={(v) => v && setTimeframe(v as "1M" | "5M")}
              data-ocid="dashboard.timeframe.toggle"
              className="bg-muted/60 rounded-lg p-0.5"
            >
              {["1M", "5M"].map((tf) => (
                <ToggleGroupItem
                  key={tf}
                  value={tf}
                  className="h-8 px-3 text-xs font-mono data-[state=on]:bg-primary/20 data-[state=on]:text-primary rounded-md"
                >
                  {tf}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="flex items-end gap-2">
              <PriceTicker
                price={currentPrice}
                prevPrice={prevPriceRef.current}
                asset={asset}
              />
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-mono mb-1",
                  isPositive ? "text-buy" : "text-sell",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {isPositive ? "+" : ""}
                {priceChangePct.toFixed(3)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 min-h-0 overflow-hidden">
        {/* Chart column */}
        <div className="flex flex-col min-h-0 overflow-y-auto scrollbar-thin p-4 gap-4">
          {/* Candlestick chart */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {asset} · {timeframe} · Candlestick
              </span>
              <div className="flex gap-3 text-[10px] font-mono">
                <span className="text-buy">● Bull</span>
                <span className="text-sell">● Bear</span>
              </div>
            </div>
            <CandlestickChart candles={candles} asset={asset} height={280} />
          </div>

          {/* MACD chart */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                MACD (12, 26, 9)
              </span>
              <div className="flex gap-3 text-[10px] font-mono">
                <span className="text-primary">● MACD</span>
                <span className="text-yellow-400">● Signal</span>
              </div>
            </div>
            <MACDChart data={macdChartData} height={120} />
          </div>

          {/* Active signal on mobile */}
          <div className="lg:hidden">
            <AnimatePresence>
              {activeSignal && <ActiveSignalCard signal={activeSignal} />}
            </AnimatePresence>
            {!activeSignal && (
              <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-muted animate-dot-pulse" />
                <span className="text-xs text-muted-foreground font-mono">
                  Scanning for signals...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="hidden lg:flex flex-col gap-4 border-l border-border p-4 overflow-y-auto scrollbar-thin">
          {/* Signal card */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Signal Bot
              </span>
            </div>
            <AnimatePresence>
              {activeSignal ? (
                <ActiveSignalCard signal={activeSignal} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl border border-border p-4 flex flex-col items-center gap-3 py-6"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-muted-foreground">
                      Scanning market...
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1">
                      Min confidence: {DEFAULT_CONFIG.minConfidence}%
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[0, 0.2, 0.4].map((delay) => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-dot-pulse"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Indicators */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Indicators
              </span>
            </div>
            <IndicatorPanel
              indicators={indicators}
              patterns={currentPatterns}
            />
          </div>
        </div>
      </div>

      {/* Mobile indicator summary bar */}
      <div className="lg:hidden border-t border-border px-4 py-3 bg-card/30">
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "RSI",
              value: indicators.rsi.toFixed(1),
              color:
                indicators.rsi > 70
                  ? "text-sell"
                  : indicators.rsi < 30
                    ? "text-buy"
                    : "text-foreground",
            },
            {
              label: "K%",
              value: indicators.stochK.toFixed(1),
              color: "text-primary",
            },
            {
              label: "MACD",
              value: indicators.macd.toFixed(4),
              color: indicators.macd >= 0 ? "text-buy" : "text-sell",
            },
            {
              label: "ADX",
              value: indicators.adx.toFixed(0),
              color:
                indicators.adx >= 25 ? "text-buy" : "text-muted-foreground",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                {label}
              </div>
              <div className={cn("text-xs font-mono font-bold", color)}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
