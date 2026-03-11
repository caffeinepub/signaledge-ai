import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  Award,
  BarChart2,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAllSignals,
  useGetAnalytics,
  useGetDailySignalCounts,
} from "../hooks/useQueries";

interface MetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  bgColor,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border p-5", bgColor)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">
            {label}
          </div>
          <div className={cn("text-3xl font-black font-mono", color)}>
            {value}
          </div>
          {subLabel && (
            <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
          )}
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            `bg-${color.replace("text-", "")}/10`,
          )}
        >
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </motion.div>
  );
}

export function Analytics() {
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalytics();
  const { data: dailyCounts, isLoading: countsLoading } =
    useGetDailySignalCounts();
  const { data: signals } = useGetAllSignals();

  // Win rate trend from signals history
  const winRateTrend = useMemo(() => {
    if (!signals || signals.length === 0) return [];

    // Group signals by day (last 14 days)
    const byDay: Map<string, { wins: number; total: number }> = new Map();
    for (const s of signals) {
      const date = new Date(Number(s.timestamp) / 1_000_000).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" },
      );
      const existing = byDay.get(date) ?? { wins: 0, total: 0 };
      existing.total++;
      if (s.outcome === "win") existing.wins++;
      byDay.set(date, existing);
    }

    return Array.from(byDay.entries())
      .slice(-14)
      .map(([date, { wins, total }]) => ({
        date,
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        total,
      }));
  }, [signals]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    if (!dailyCounts || !signals) return [];

    return (dailyCounts ?? []).slice(-7).map((d) => {
      const daySignals = (signals ?? []).filter((s) => {
        const sDate = new Date(
          Number(s.timestamp) / 1_000_000,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return sDate === d.date;
      });
      const wins = daySignals.filter((s) => s.outcome === "win").length;
      const losses = daySignals.filter((s) => s.outcome === "loss").length;
      return {
        date: d.date,
        total: Number(d.count),
        wins,
        losses,
      };
    });
  }, [dailyCounts, signals]);

  const totalSignals = analytics ? Number(analytics.totalSignals) : 0;
  const winCount = analytics ? Number(analytics.winCount) : 0;
  const lossCount = analytics ? Number(analytics.lossCount) : 0;
  const winRate = analytics ? Number(analytics.winRate) : 0;

  const isLoading = analyticsLoading || countsLoading;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <div className="px-6 py-4 border-b border-border bg-card/30 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Analytics</h1>
        </div>
      </div>

      <div
        data-ocid="analytics.section"
        className="px-6 py-6 space-y-6 pb-24 lg:pb-6"
      >
        {/* Metric cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {["total", "winrate", "wins", "losses"].map((k) => (
              <Skeleton key={k} className="h-28 rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Signals"
              value={totalSignals.toString()}
              subLabel="All time"
              icon={Target}
              color="text-primary"
              bgColor="bg-card border-primary/20"
            />
            <MetricCard
              label="Win Rate"
              value={`${winRate}%`}
              subLabel={
                winRate >= 60 ? "Strong" : winRate >= 50 ? "Good" : "Needs work"
              }
              icon={TrendingUp}
              color={
                winRate >= 60
                  ? "text-buy"
                  : winRate >= 50
                    ? "text-yellow-400"
                    : "text-sell"
              }
              bgColor={
                winRate >= 60
                  ? "bg-buy-muted border-buy-border"
                  : "bg-card border-border"
              }
            />
            <MetricCard
              label="Total Wins"
              value={winCount.toString()}
              subLabel={`${totalSignals > 0 ? Math.round((winCount / totalSignals) * 100) : 0}% ratio`}
              icon={Award}
              color="text-buy"
              bgColor="bg-buy-muted border-buy-border"
            />
            <MetricCard
              label="Total Losses"
              value={lossCount.toString()}
              subLabel={`${totalSignals > 0 ? Math.round((lossCount / totalSignals) * 100) : 0}% ratio`}
              icon={AlertTriangle}
              color="text-sell"
              bgColor="bg-sell-muted border-sell-border"
            />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily signals bar chart */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Daily Signals (7d)
              </span>
            </div>
            <div className="flex gap-3 mb-3 text-[10px] font-mono">
              <span className="text-buy">● Wins</span>
              <span className="text-sell">● Losses</span>
              <span className="text-muted-foreground">● Total</span>
            </div>
            {dailyChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={dailyChartData}
                  margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="oklch(0.22 0.03 255 / 0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "oklch(0.55 0.025 240)",
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: "oklch(0.55 0.025 240)",
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                    }}
                    tickLine={false}
                    axisLine={false}
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
                  <Bar
                    dataKey="wins"
                    fill="oklch(0.72 0.22 142 / 0.7)"
                    radius={[2, 2, 0, 0]}
                    name="Wins"
                  />
                  <Bar
                    dataKey="losses"
                    fill="oklch(0.6 0.22 25 / 0.7)"
                    radius={[2, 2, 0, 0]}
                    name="Losses"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Win rate trend */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Win Rate Trend
              </span>
            </div>
            {winRateTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={winRateTrend}
                  margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="oklch(0.22 0.03 255 / 0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "oklch(0.55 0.025 240)",
                      fontSize: 9,
                      fontFamily: "JetBrains Mono",
                    }}
                    tickLine={false}
                    axisLine={false}
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
                    formatter={(v) => [`${v}%`, "Win Rate"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke="oklch(0.72 0.18 195)"
                    strokeWidth={2}
                    dot={{ fill: "oklch(0.72 0.18 195)", r: 3 }}
                    name="Win Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Asset performance table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Asset Performance
            </span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-2">
              {["a1", "a2", "a3", "a4", "a5"].map((k) => (
                <Skeleton key={k} className="h-10 rounded bg-muted/40" />
              ))}
            </div>
          ) : !analytics || analytics.perAssetBreakdown.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No performance data yet. Generate signals on the Dashboard.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase">
                    Asset
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Signals
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Wins
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Losses
                  </TableHead>
                  <TableHead className="text-xs font-mono text-muted-foreground uppercase text-right">
                    Win Rate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.perAssetBreakdown.map(([asset, stats]) => {
                  const rate = Number(stats.winRate);
                  return (
                    <TableRow
                      key={asset}
                      className="border-border hover:bg-secondary/40"
                    >
                      <TableCell className="font-mono font-bold text-foreground text-sm">
                        {asset}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {Number(stats.totalSignals)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-buy">
                        {Number(stats.wins)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-sell">
                        {Number(stats.losses)}
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
