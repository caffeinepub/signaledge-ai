import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Analytics,
  BacktestResult,
  DailyCount,
  Direction as DirectionEnum,
  IndicatorConfig,
  Outcome as OutcomeEnum,
  Signal,
} from "../backend.d.ts";
import { useActor } from "./useActor";

export type { Signal, Analytics, BacktestResult, DailyCount, IndicatorConfig };
export type DirectionValue = DirectionEnum;
export type OutcomeValue = OutcomeEnum;

// Re-export enum-like const objects (enums cannot be imported from .d.ts as values)
export const Direction = {
  buy: "buy" as unknown as DirectionEnum,
  sell: "sell" as unknown as DirectionEnum,
} as const;

export const Outcome = {
  win: "win" as unknown as OutcomeEnum,
  pending: "pending" as unknown as OutcomeEnum,
  loss: "loss" as unknown as OutcomeEnum,
} as const;

// ── Signals ────────────────────────────────────────────────────────────────

export function useGetAllSignals() {
  const { actor, isFetching } = useActor();
  return useQuery<Signal[]>({
    queryKey: ["signals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSignals();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useGetSignalsByAsset(asset: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Signal[]>({
    queryKey: ["signals", asset],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSignalsByAsset(asset);
    },
    enabled: !!actor && !isFetching && !!asset,
    refetchInterval: 30_000,
  });
}

export function useAddSignal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      asset: string;
      direction: DirectionEnum;
      confidence: number;
      expiryMinutes: number;
      rsi: number;
      stochasticK: number;
      stochasticD: number;
      macdValue: number;
      macdSignalLine: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addSignal(
        params.asset,
        params.direction,
        BigInt(Math.round(params.confidence)),
        BigInt(params.expiryMinutes),
        BigInt(Math.round(params.rsi)),
        BigInt(Math.round(params.stochasticK)),
        BigInt(Math.round(params.stochasticD)),
        params.macdValue,
        params.macdSignalLine,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useUpdateSignalOutcome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      outcome,
    }: { id: bigint; outcome: OutcomeEnum }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSignalOutcome(id, outcome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function useGetAnalytics() {
  const { actor, isFetching } = useActor();
  return useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => {
      if (!actor)
        return {
          totalSignals: 0n,
          winCount: 0n,
          lossCount: 0n,
          winRate: 0n,
          perAssetBreakdown: [],
        } as unknown as Analytics;
      return actor.getAnalytics();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useGetDailySignalCounts() {
  const { actor, isFetching } = useActor();
  return useQuery<DailyCount[]>({
    queryKey: ["dailyCounts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDailySignalCounts();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

// ── Backtesting ───────────────────────────────────────────────────────────

export function useGetBacktestResults() {
  const { actor, isFetching } = useActor();
  return useQuery<BacktestResult[]>({
    queryKey: ["backtestResults"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBacktestResults();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveBacktestResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (result: BacktestResult) => {
      if (!actor) throw new Error("No actor");
      return actor.saveBacktestResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtestResults"] });
    },
  });
}

// ── Indicator Config ──────────────────────────────────────────────────────

export function useGetIndicatorConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<IndicatorConfig | null>({
    queryKey: ["indicatorConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getIndicatorConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveIndicatorConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: IndicatorConfig) => {
      if (!actor) throw new Error("No actor");
      return actor.saveIndicatorConfig(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicatorConfig"] });
    },
  });
}
