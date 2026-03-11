import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "./indicators";

export type AssetSymbol =
  | "EUR/USD"
  | "GBP/USD"
  | "USD/JPY"
  | "AUD/USD"
  | "GBP/JPY";

export const ASSETS: AssetSymbol[] = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "GBP/JPY",
];

const SEED_PRICES: Record<AssetSymbol, number> = {
  "EUR/USD": 1.0872,
  "GBP/USD": 1.2743,
  "USD/JPY": 149.85,
  "AUD/USD": 0.6521,
  "GBP/JPY": 190.94,
};

const VOLATILITY: Record<AssetSymbol, number> = {
  "EUR/USD": 0.0005,
  "GBP/USD": 0.0007,
  "USD/JPY": 0.08,
  "AUD/USD": 0.0006,
  "GBP/JPY": 0.12,
};

const DECIMALS: Record<AssetSymbol, number> = {
  "EUR/USD": 4,
  "GBP/USD": 4,
  "USD/JPY": 2,
  "AUD/USD": 4,
  "GBP/JPY": 2,
};

export { DECIMALS };

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateInitialCandles(asset: AssetSymbol, count = 100): Candle[] {
  const rng = seededRandom(asset.charCodeAt(0) * 31 + asset.length * 7);
  const vol = VOLATILITY[asset];
  const candles: Candle[] = [];
  let price = SEED_PRICES[asset];
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const time = now - i * 2000; // 2s per candle
    const open = price;
    const change1 = (rng() - 0.5) * vol * 2;
    const change2 = (rng() - 0.5) * vol * 2;
    const change3 = (rng() - 0.5) * vol * 2;
    const close = open + change1 + change2;
    const high = Math.max(open, close) + Math.abs(change3) * 0.5;
    const low = Math.min(open, close) - Math.abs(change3) * 0.5;
    const volume = Math.round(rng() * 1000 + 500);

    candles.push({ time, open, high, low, close, volume });
    price = close;
  }

  return candles;
}

// Global candle store per asset (shared across hook instances)
const globalCandles: Map<AssetSymbol, Candle[]> = new Map();
const globalPrices: Map<AssetSymbol, number> = new Map();
let isInitialized = false;

function initializeMarket() {
  if (isInitialized) return;
  isInitialized = true;
  for (const asset of ASSETS) {
    const candles = generateInitialCandles(asset, 100);
    globalCandles.set(asset, candles);
    globalPrices.set(asset, candles[candles.length - 1].close);
  }
}

// Subscribers for market updates
type MarketListener = (asset: AssetSymbol) => void;
const listeners = new Set<MarketListener>();
let marketInterval: ReturnType<typeof setInterval> | null = null;

function startMarket() {
  if (marketInterval) return;
  marketInterval = setInterval(() => {
    for (const asset of ASSETS) {
      const candles = globalCandles.get(asset)!;
      const lastCandle = candles[candles.length - 1];
      const vol = VOLATILITY[asset];

      // Random walk with slight mean reversion
      const drift = (SEED_PRICES[asset] - lastCandle.close) * 0.001;
      const change = (Math.random() - 0.5) * vol * 2 + drift;

      const open = lastCandle.close;
      const close = open + change;
      const wickRange = Math.abs(change) * (0.3 + Math.random() * 0.7);
      const high = Math.max(open, close) + wickRange;
      const low = Math.min(open, close) - wickRange;
      const volume = Math.round(Math.random() * 1000 + 500);

      const newCandle: Candle = {
        time: Date.now(),
        open,
        high,
        low,
        close,
        volume,
      };

      candles.push(newCandle);
      if (candles.length > 100) candles.shift();
      globalPrices.set(asset, close);
    }

    // Notify all listeners
    for (const listener of listeners) {
      for (const asset of ASSETS) {
        listener(asset);
      }
    }
  }, 2000);
}

export interface MarketData {
  candles: Candle[];
  currentPrice: number;
  openPrice: number;
  priceChange: number;
  priceChangePct: number;
}

export function useMarketEngine() {
  const [asset, setAsset] = useState<AssetSymbol>("EUR/USD");
  const [, setTick] = useState(0);
  const assetRef = useRef(asset);
  assetRef.current = asset;

  useEffect(() => {
    initializeMarket();
    startMarket();

    const listener: MarketListener = () => {
      setTick((t) => t + 1);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getMarketData = useCallback((targetAsset: AssetSymbol): MarketData => {
    const candles = globalCandles.get(targetAsset) ?? [];
    const currentPrice =
      globalPrices.get(targetAsset) ?? SEED_PRICES[targetAsset];
    const openPrice = candles.length > 0 ? candles[0].open : currentPrice;
    const priceChange = currentPrice - openPrice;
    const priceChangePct =
      openPrice !== 0 ? (priceChange / openPrice) * 100 : 0;
    return {
      candles: [...candles],
      currentPrice,
      openPrice,
      priceChange,
      priceChangePct,
    };
  }, []);

  const marketData = getMarketData(asset);

  return {
    asset,
    setAsset,
    candles: marketData.candles,
    currentPrice: marketData.currentPrice,
    openPrice: marketData.openPrice,
    priceChange: marketData.priceChange,
    priceChangePct: marketData.priceChangePct,
    getAllCandles: (a: AssetSymbol) => globalCandles.get(a) ?? [],
    getAllPrices: () => Object.fromEntries(globalPrices.entries()),
  };
}
