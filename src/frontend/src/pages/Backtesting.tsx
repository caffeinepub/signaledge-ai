import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Activity,
  FlaskConical,
  Percent,
  Play,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestResult } from "../backend.d.ts";
import {
  useGetBacktestResults,
  useSaveBacktestResult,
} from "../hooks/useQueries";
import { ASSETS, type AssetSymbol } from "../marketEngine";

type Period = "30" | "90" | "180";

function generateBacktestData(
  asset: AssetSymbol,
  days: number,
): {
  result: Omit<BacktestResult, "startDate" | "endDate">;
  dailyWinRate: { day: string; winRate: number }[];
} {
  // Deterministic seed based on asset + days
  const seed = asset.charCodeAt(0) * 100 + asset.charCodeAt(2) * 37 + days;
  const rng = (s: number) => {
    let x = Math.sin(s + seed) * 10000;
    return x - Math.floor(x);
  };

  const baseWinRate = 55 + rng(1) * 20; // 55-75%
  const totalTrades = Math.round(days * (2 + rng(2) * 3));
  const wins = Math.round(totalTrades * (baseWinRate / 100));
  const losses = totalTrades - wins;

  const avgProfit = 0.8 + rng(3) * 1.5; // 0.8-2.3%
  const maxDrawdown = -(3 + rng(4) * 8); // -3% to -11%

  // Generate daily win rate
  const dailyWinRate: { day: string; winRate: number }[] = [];
  for (let i = 0; i < Math.min(days, 30); i++) {
    const variance = (rng(i + 10) - 0.5) * 30;
    dailyWinRate.push({
      day: `Day ${i + 1}`,
      winRate: Math.max(20, Math.min(100, baseWinRate + variance)),
    });
  }

  return {
    result: {
      asset,
      totalTrades: BigInt(totalTrades),
      wins: BigInt(wins),
      losses: BigInt(losses),
      winRate: BigInt(Math.round(baseWinRate)),
      avgProfit,
      maxDrawdown,
    },
    dailyWinRate,
  };
}

export function Backtesting() {
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>("EUR/USD");
  const [period, setPeriod] = useState<Period>("30");
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    result: Omit<BacktestResult, "startDate" | "endDate">;
    dailyWinRate: { day: string; winRate: number }[];
  } | null>(null);

  const { data: backtestHistory, isLoading } = useGetBacktestResults();
  const saveResult = useSaveBacktestResult();

  const handleRunBacktest = async () => {
    setIsRunning(true);
    setCurrentResult(null);

    // Simulate 2 second run time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const days = Number.parseInt(period);
    const generated = generateBacktestData(selectedAsset, days);
    setCurrentResult(generated);

    const now = Date.now();
    const fullResult: BacktestResult = {
      ...generated.result,
      startDate: BigInt(now - days * 24 * 60 * 60 * 1000) * 1_000_000n,
      endDate: BigInt(now) * 1_000_000n,
    };

    saveResult.mutate(fullResult);
    setIsRunning(false);
  };

  const winRate = currentResult ? Number(currentResult.result.winRate) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="px-6 py-4 border-b border-border bg-card/30 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Backtesting</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 pb-24 lg:pb-6">
        {/* Controls */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
            Strategy Configuration
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-mono">
                Asset
              </Label>
              <Select
                value={selectedAsset}
                onValueChange={(v) => setSelectedAsset(v as AssetSymbol)}
              >
                <SelectTrigger
                  data-ocid="backtesting.asset.select"
                  className="w-36 h-9 text-xs font-mono bg-muted/60 border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map((a) => (
                    <SelectItem key={a} value={a} className="text-xs font-mono">
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-mono">
                Period
              </Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as Period)}
              >
                <SelectTrigger
                  data-ocid="backtesting.period.select"
                  className="w-40 h-9 text-xs font-mono bg-muted/60 border-border"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30" className="text-xs font-mono">
                    Last 30 days
                  </SelectItem>
                  <SelectItem value="90" className="text-xs font-mono">
                    Last 90 days
                  </SelectItem>
                  <SelectItem value="180" className="text-xs font-mono">
                    Last 180 days
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              data-ocid="backtesting.run.button"
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="h-9 px-5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-mono text-xs font-bold"
            >
              {isRunning ? (
                <>
                  <Activity className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Running state */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl border border-primary/20 p-6"
            data-ocid="backtesting.result.card"
          >
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm font-mono text-primary">
                Simulating strategy on {period} days of {selectedAsset} data...
              </span>
            </div>
            <div className="space-y-2">
              {["s1", "s2", "s3", "s4"].map((k) => (
                <Skeleton key={k} className="h-10 rounded-lg bg-muted/40" />
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {currentResult && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="backtesting.result.card"
            className="space-y-4"
          >
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Trades",
                  value: Number(currentResult.result.totalTrades).toString(),
                  icon: Activity,
                  color: "text-primary",
                  bg: "bg-card border-primary/20",
                },
                {
                  label: "Win Rate",
                  value: `${winRate}%`,
                  icon: Percent,
                  color:
                    winRate >= 60
                      ? "text-buy"
                      : winRate >= 50
                        ? "text-yellow-400"
                        : "text-sell",
                  bg:
                    winRate >= 60
                      ? "bg-buy-muted border-buy-border"
                      : "bg-card border-border",
                },
                {
                  label: "Avg Profit",
                  value: `+${currentResult.result.avgProfit.toFixed(2)}%`,
                  icon: TrendingUp,
                  color: "text-buy",
                  bg: "bg-buy-muted border-buy-border",
                },
                {
                  label: "Max Drawdown",
                  value: `${currentResult.result.maxDrawdown.toFixed(2)}%`,
                  icon: TrendingDown,
                  color: "text-sell",
                  bg: "bg-sell-muted border-sell-border",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={cn("rounded-xl border p-4", bg)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {label}
                    </span>
                    <Icon className={cn("w-3.5 h-3.5", color)} />
                  </div>
                  <div className={cn("text-2xl font-black font-mono", color)}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Daily win rate chart */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
                Accuracy Over Time
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={currentResult.dailyWinRate}
                  margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="oklch(0.22 0.03 255 / 0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fill: "oklch(0.55 0.025 240)",
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                    }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fill: "oklch(0.55 0.025 240)",
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.14 0.025 257)",
                      border: "1px solid oklch(0.22 0.03 255)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "JetBrains Mono",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Win Rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke="oklch(0.72 0.18 195)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* History table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Backtest History
            </span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {["b1", "b2", "b3"].map((k) => (
                <Skeleton key={k} className="h-10 rounded bg-muted/40" />
              ))}
            </div>
          ) : !backtestHistory || backtestHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No backtest results yet. Run your first backtest above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase">
                    Asset
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Trades
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Win Rate
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Avg Profit
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Max DD
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backtestHistory
                  .slice()
                  .reverse()
                  .map((r) => {
                    const rate = Number(r.winRate);
                    return (
                      <TableRow
                        key={`${r.asset}-${Number(r.startDate)}`}
                        className="border-border hover:bg-secondary/40"
                      >
                        <TableCell className="font-mono font-bold text-foreground text-sm">
                          {r.asset}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {Number(r.totalTrades)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-xs",
                              rate >= 60
                                ? "text-buy border-buy/30"
                                : rate >= 50
                                  ? "text-yellow-400 border-yellow-400/30"
                                  : "text-sell border-sell/30",
                            )}
                          >
                            {rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-buy">
                          +{r.avgProfit.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-sell">
                          {r.maxDrawdown.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
