import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RefreshCw, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { SignalCard } from "../components/SignalCard";
import {
  Outcome,
  useGetAllSignals,
  useUpdateSignalOutcome,
} from "../hooks/useQueries";
import { ASSETS } from "../marketEngine";

type DirectionFilter = "ALL" | "BUY" | "SELL";
type OutcomeFilter = "ALL" | "PENDING" | "WIN" | "LOSS";

export function Signals() {
  const [assetFilter, setAssetFilter] = useState("ALL");
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");

  const { data: signals, isLoading, refetch, isFetching } = useGetAllSignals();
  const updateOutcome = useUpdateSignalOutcome();

  const filtered = useMemo(() => {
    if (!signals) return [];
    return signals
      .filter((s) => {
        if (assetFilter !== "ALL" && s.asset !== assetFilter) return false;
        if (
          directionFilter !== "ALL" &&
          s.direction.toLowerCase() !== directionFilter.toLowerCase()
        )
          return false;
        if (
          outcomeFilter !== "ALL" &&
          s.outcome.toLowerCase() !== outcomeFilter.toLowerCase()
        )
          return false;
        return true;
      })
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [signals, assetFilter, directionFilter, outcomeFilter]);

  const handleMarkWin = (id: bigint) => {
    updateOutcome.mutate({ id, outcome: Outcome.win });
  };

  const handleMarkLoss = (id: bigint) => {
    updateOutcome.mutate({ id, outcome: Outcome.loss });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Signal Feed</h1>
            {signals && (
              <Badge
                variant="outline"
                className="font-mono text-xs border-primary/30 text-primary"
              >
                {filtered.length} signals
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-all",
              isFetching && "animate-spin text-primary",
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {!isFetching && "Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={assetFilter} onValueChange={setAssetFilter}>
            <SelectTrigger
              data-ocid="signals.filter.select"
              className="w-36 h-8 text-xs font-mono bg-muted/60 border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-mono">
                All Assets
              </SelectItem>
              {ASSETS.map((a) => (
                <SelectItem key={a} value={a} className="text-xs font-mono">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={directionFilter}
            onValueChange={(v) => setDirectionFilter(v as DirectionFilter)}
          >
            <SelectTrigger
              data-ocid="signals.direction.select"
              className="w-28 h-8 text-xs font-mono bg-muted/60 border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-mono">
                All Dirs
              </SelectItem>
              <SelectItem value="BUY" className="text-xs font-mono text-buy">
                ▲ BUY
              </SelectItem>
              <SelectItem value="SELL" className="text-xs font-mono text-sell">
                ▼ SELL
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={outcomeFilter}
            onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
          >
            <SelectTrigger
              data-ocid="signals.outcome.select"
              className="w-32 h-8 text-xs font-mono bg-muted/60 border-border"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-mono">
                All Outcomes
              </SelectItem>
              <SelectItem value="PENDING" className="text-xs font-mono">
                ⏳ Pending
              </SelectItem>
              <SelectItem value="WIN" className="text-xs font-mono text-buy">
                ✓ Win
              </SelectItem>
              <SelectItem value="LOSS" className="text-xs font-mono text-sell">
                ✗ Loss
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Signal list */}
      <ScrollArea className="flex-1 px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {["sk1", "sk2", "sk3", "sk4", "sk5"].map((k) => (
              <Skeleton key={k} className="h-32 rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            data-ocid="signals.empty_state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
              <Zap className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <div className="font-medium text-muted-foreground">
                No signals found
              </div>
              <div className="text-sm text-muted-foreground/60 mt-1">
                {signals?.length === 0
                  ? "Run the dashboard to generate signals"
                  : "Try adjusting the filters above"}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3 pb-20 lg:pb-4">
            {filtered.map((signal, i) => (
              <SignalCard
                key={Number(signal.id)}
                signal={signal}
                index={i + 1}
                onMarkWin={handleMarkWin}
                onMarkLoss={handleMarkLoss}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
