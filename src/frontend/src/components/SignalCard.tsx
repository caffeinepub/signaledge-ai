import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import type { ChartPattern } from "../chartPatterns";
import type { Signal } from "../hooks/useQueries";
import { Outcome } from "../hooks/useQueries";
import { formatDistanceToNow } from "../utils/time";

interface SignalCardProps {
  signal: Signal;
  onMarkWin?: (id: bigint) => void;
  onMarkLoss?: (id: bigint) => void;
  index?: number;
  compact?: boolean;
}

const CONFIDENCE_COLOR = (c: number) => {
  if (c >= 95) return "text-buy";
  if (c >= 85) return "text-orange-400";
  return "text-yellow-400";
};

export function SignalCard({
  signal,
  onMarkWin,
  onMarkLoss,
  index = 1,
  compact = false,
}: SignalCardProps) {
  const isBuy = signal.direction === "buy";
  const confidence = Number(signal.confidence);
  const isPending = signal.outcome === Outcome.pending;
  const isWin = signal.outcome === Outcome.win;
  const isLoss = signal.outcome === Outcome.loss;

  const bgColor = isBuy
    ? "bg-buy-muted border-buy-border"
    : "bg-sell-muted border-sell-border";
  const glowClass = isBuy ? "buy-glow" : "sell-glow";

  return (
    <motion.div
      data-ocid={`signals.item.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-xl border p-4 transition-all hover:brightness-110",
        bgColor,
        compact ? "p-3" : "p-4",
        glowClass,
      )}
    >
      {/* Direction pulse dot */}
      {isPending && (
        <div
          className={cn(
            "absolute top-3 right-3 w-2 h-2 rounded-full animate-dot-pulse",
            isBuy ? "bg-buy" : "bg-sell",
          )}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left: Asset + Direction */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
              isBuy
                ? "bg-buy/20 border border-buy/30"
                : "bg-sell/20 border border-sell/30",
            )}
          >
            {isBuy ? (
              <TrendingUp className="w-4 h-4 text-buy" />
            ) : (
              <TrendingDown className="w-4 h-4 text-sell" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground font-mono truncate">
              {signal.asset}
            </div>
            <Badge
              className={cn(
                "text-[10px] font-bold px-1.5 py-0 h-4 font-mono",
                isBuy
                  ? "bg-buy/20 text-buy border-buy/30 hover:bg-buy/25"
                  : "bg-sell/20 text-sell border-sell/30 hover:bg-sell/25",
              )}
              variant="outline"
            >
              {isBuy ? "▲ BUY" : "▼ SELL"}
            </Badge>
          </div>
        </div>

        {/* Right: Confidence */}
        <div className="text-right flex-shrink-0">
          <div
            className={cn(
              "text-xl font-black font-mono leading-none",
              CONFIDENCE_COLOR(confidence),
            )}
          >
            {confidence}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            confidence
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Indicator values */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "RSI", value: Number(signal.rsi).toFixed(1) },
              { label: "K%", value: Number(signal.stochasticK).toFixed(1) },
              { label: "MACD", value: signal.macdValue.toFixed(4) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-background/40 rounded-md px-2 py-1.5 text-center"
              >
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {label}
                </div>
                <div className="text-xs font-mono font-medium text-foreground/90 mt-0.5">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Footer: time + expiry + outcome */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(Number(signal.timestamp) / 1_000_000)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span className="font-mono">
                  {Number(signal.expiryMinutes)}m expiry
                </span>
              </div>
            </div>

            {/* Outcome */}
            {isWin && (
              <Badge className="bg-buy/20 text-buy border-buy/30 text-[10px] font-bold">
                ✓ WIN
              </Badge>
            )}
            {isLoss && (
              <Badge className="bg-sell/20 text-sell border-sell/30 text-[10px] font-bold">
                ✗ LOSS
              </Badge>
            )}
            {isPending && onMarkWin && onMarkLoss && (
              <div className="flex gap-1.5">
                <Button
                  data-ocid={`signals.win.button.${index}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkWin(signal.id)}
                  className="h-6 px-2 text-[10px] text-buy border border-buy/30 hover:bg-buy/15 font-mono font-bold"
                >
                  <ChevronUp className="w-3 h-3 mr-0.5" />
                  WIN
                </Button>
                <Button
                  data-ocid={`signals.loss.button.${index}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkLoss(signal.id)}
                  className="h-6 px-2 text-[10px] text-sell border border-sell/30 hover:bg-sell/15 font-mono font-bold"
                >
                  <ChevronDown className="w-3 h-3 mr-0.5" />
                  LOSS
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// Type for generated signal to display
export interface GeneratedSignalUI {
  asset: string;
  direction: "buy" | "sell";
  confidence: number;
  expiryMinutes: number;
  timestamp: number;
  pattern?: ChartPattern | null;
}

// Pattern badge
function PatternBadge({ pattern }: { pattern: ChartPattern }) {
  const isBullish = pattern.direction === "bullish";
  const isBearish = pattern.direction === "bearish";
  return (
    <div
      className={cn(
        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2",
        isBullish
          ? "border-buy/30 bg-buy/10"
          : isBearish
            ? "border-sell/30 bg-sell/10"
            : "border-border bg-muted/30",
      )}
    >
      <span className="text-sm mt-0.5">
        {isBullish ? "🕯" : isBearish ? "🕯" : "🔍"}
      </span>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[11px] font-bold font-mono tracking-wide",
            isBullish
              ? "text-buy"
              : isBearish
                ? "text-sell"
                : "text-muted-foreground",
          )}
        >
          {pattern.name}
          <span className="ml-1.5 text-muted-foreground font-normal">
            {"★".repeat(pattern.strength)}
            {"☆".repeat(3 - pattern.strength)}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {pattern.description}
        </div>
      </div>
    </div>
  );
}

// Active signal card for dashboard
export function ActiveSignalCard({ signal }: { signal: GeneratedSignalUI }) {
  const isBuy = signal.direction === "buy";

  return (
    <motion.div
      data-ocid="dashboard.signal.card"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "rounded-xl border p-5",
        isBuy
          ? "bg-buy-muted border-buy-border buy-glow"
          : "bg-sell-muted border-sell-border sell-glow",
      )}
    >
      {/* Pulsing header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-signal-pulse",
              isBuy ? "bg-buy" : "bg-sell",
            )}
          />
          <span className="text-xs font-mono font-bold text-muted-foreground tracking-widest uppercase">
            🚨 Active Signal
          </span>
        </div>
        <div
          className={cn(
            "text-xs font-mono font-bold px-2 py-0.5 rounded-full border",
            isBuy
              ? "text-buy border-buy/40 bg-buy/10"
              : "text-sell border-sell/40 bg-sell/10",
          )}
        >
          {isBuy ? "▲ BUY CALL" : "▼ SELL PUT"}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-black font-mono text-foreground">
            {signal.asset}
          </div>
          <div className="text-sm text-muted-foreground mt-1 font-mono">
            {signal.expiryMinutes}m expiry · 1M chart
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-4xl font-black font-mono leading-none",
              signal.confidence >= 95
                ? "text-buy"
                : signal.confidence >= 85
                  ? "text-orange-400"
                  : "text-yellow-400",
            )}
          >
            {signal.confidence}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            AI Confidence
          </div>
        </div>
      </div>

      {/* Pattern badge */}
      {signal.pattern && <PatternBadge pattern={signal.pattern} />}
    </motion.div>
  );
}
