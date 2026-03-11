import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Signal {
    id: bigint;
    rsi: bigint;
    direction: Direction;
    asset: string;
    macdValue: number;
    timestamp: Time;
    expiryMinutes: bigint;
    confidence: bigint;
    stochasticD: bigint;
    stochasticK: bigint;
    outcome: Outcome;
    macdSignalLine: number;
}
export type Time = bigint;
export interface IndicatorConfig {
    rsiPeriod: bigint;
    timeframe: string;
    stochasticOverbought: bigint;
    stochasticDPeriod: bigint;
    macdLongPeriod: bigint;
    rsiOversold: bigint;
    stochasticKPeriod: bigint;
    rsiOverbought: bigint;
    stochasticOversold: bigint;
    macdSignalPeriod: bigint;
    minConfidence: bigint;
    macdShortPeriod: bigint;
}
export interface BacktestResult {
    totalTrades: bigint;
    endDate: Time;
    asset: string;
    wins: bigint;
    losses: bigint;
    winRate: bigint;
    maxDrawdown: number;
    avgProfit: number;
    startDate: Time;
}
export interface Analytics {
    lossCount: bigint;
    perAssetBreakdown: Array<[string, AssetStats]>;
    winCount: bigint;
    winRate: bigint;
    totalSignals: bigint;
}
export interface AssetStats {
    wins: bigint;
    losses: bigint;
    winRate: bigint;
    totalSignals: bigint;
}
export interface UserProfile {
    name: string;
}
export interface DailyCount {
    date: string;
    count: bigint;
}
export enum Direction {
    buy = "buy",
    sell = "sell"
}
export enum Outcome {
    win = "win",
    pending = "pending",
    loss = "loss"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addSignal(asset: string, direction: Direction, confidence: bigint, expiryMinutes: bigint, rsi: bigint, stochasticK: bigint, stochasticD: bigint, macdValue: number, macdSignalLine: number): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllSignals(): Promise<Array<Signal>>;
    getAnalytics(): Promise<Analytics>;
    getBacktestResults(): Promise<Array<BacktestResult>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailySignalCounts(): Promise<Array<DailyCount>>;
    getIndicatorConfig(): Promise<IndicatorConfig | null>;
    getSignalsByAsset(asset: string): Promise<Array<Signal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveBacktestResult(result: BacktestResult): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveIndicatorConfig(config: IndicatorConfig): Promise<void>;
    updateSignalOutcome(id: bigint, outcome: Outcome): Promise<void>;
}
