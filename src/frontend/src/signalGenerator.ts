import { getPatternScore } from "./chartPatterns";
import type { ChartPattern } from "./chartPatterns";
import {
  type Candle,
  calcADX,
  calcATR,
  calcMACD,
  calcMACDHistory,
  calcRSI,
  calcStochastic,
} from "./indicators";

export interface IndicatorValues {
  rsi: number;
  stochK: number;
  stochD: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  adx: number;
}

export interface SignalConfig {
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  stochasticKPeriod: number;
  stochasticDPeriod: number;
  stochasticOverbought: number;
  stochasticOversold: number;
  macdShortPeriod: number;
  macdLongPeriod: number;
  macdSignalPeriod: number;
  minConfidence: number;
  timeframe: string;
}

export const DEFAULT_CONFIG: SignalConfig = {
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  stochasticKPeriod: 14,
  stochasticDPeriod: 3,
  stochasticOverbought: 80,
  stochasticOversold: 20,
  macdShortPeriod: 12,
  macdLongPeriod: 26,
  macdSignalPeriod: 9,
  minConfidence: 70,
  timeframe: "1M",
};

export type SignalDirection = "buy" | "sell";

export interface GeneratedSignal {
  asset: string;
  direction: SignalDirection;
  confidence: number;
  expiryMinutes: number;
  rsi: number;
  stochasticK: number;
  stochasticD: number;
  macdValue: number;
  macdSignalLine: number;
  pattern: ChartPattern | null;
}

export function calcIndicators(
  candles: Candle[],
  config: SignalConfig,
): IndicatorValues {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  const rsi = calcRSI(closes, config.rsiPeriod);
  const { k: stochK, d: stochD } = calcStochastic(
    highs,
    lows,
    closes,
    config.stochasticKPeriod,
    config.stochasticDPeriod,
    3,
  );
  const {
    macd,
    signal: macdSignal,
    histogram: macdHistogram,
  } = calcMACD(
    closes,
    config.macdShortPeriod,
    config.macdLongPeriod,
    config.macdSignalPeriod,
  );
  const atr = calcATR(candles, 14);
  const adx = calcADX(candles, 14);

  return { rsi, stochK, stochD, macd, macdSignal, macdHistogram, atr, adx };
}

export function generateSignal(
  asset: string,
  candles: Candle[],
  config: SignalConfig,
): GeneratedSignal | null {
  if (candles.length < config.macdLongPeriod + config.macdSignalPeriod + 5)
    return null;

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  // Current indicators
  const curRSI = calcRSI(closes, config.rsiPeriod);
  const curStoch = calcStochastic(
    highs,
    lows,
    closes,
    config.stochasticKPeriod,
    config.stochasticDPeriod,
    3,
  );
  const macdHistory = calcMACDHistory(
    closes,
    config.macdShortPeriod,
    config.macdLongPeriod,
    config.macdSignalPeriod,
  );

  if (macdHistory.length < 2) return null;

  // Previous (one candle back)
  const prevCloses = closes.slice(0, -1);
  const prevHighs = highs.slice(0, -1);
  const prevLows = lows.slice(0, -1);
  const prevRSI = calcRSI(prevCloses, config.rsiPeriod);
  const prevStoch = calcStochastic(
    prevHighs,
    prevLows,
    prevCloses,
    config.stochasticKPeriod,
    config.stochasticDPeriod,
    3,
  );

  const curMACD = macdHistory[macdHistory.length - 1];
  const prevMACD = macdHistory[macdHistory.length - 2];

  const atr = calcATR(candles, 14);
  const adx = calcADX(candles, 14);

  // Average ATR for volatility filter
  const recentCandles = candles.slice(-20);
  const avgATR =
    recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) /
    recentCandles.length;

  // --- Chart pattern scoring (1M only) ---
  const { buyBonus, sellBonus, topPattern } = getPatternScore(candles);

  // --- Scoring-based signal logic ---
  let buyScore = buyBonus;
  let sellScore = sellBonus;

  // RSI conditions
  if (curRSI < config.rsiOversold) buyScore += 30;
  else if (curRSI < 45) buyScore += 15;
  if (curRSI > config.rsiOverbought) sellScore += 30;
  else if (curRSI > 55) sellScore += 15;

  // RSI direction
  if (curRSI > prevRSI) buyScore += 10;
  else sellScore += 10;

  // Stochastic crossover or oversold/overbought zone
  const stochCrossUp = prevStoch.k < prevStoch.d && curStoch.k > curStoch.d;
  const stochCrossDown = prevStoch.k > prevStoch.d && curStoch.k < curStoch.d;
  if (stochCrossUp) buyScore += 20;
  else if (curStoch.k < config.stochasticOversold + 10) buyScore += 10;
  if (stochCrossDown) sellScore += 20;
  else if (curStoch.k > config.stochasticOverbought - 10) sellScore += 10;

  // MACD crossover or histogram direction
  const macdCrossUp =
    prevMACD.macd < prevMACD.signal && curMACD.macd > curMACD.signal;
  const macdCrossDown =
    prevMACD.macd > prevMACD.signal && curMACD.macd < curMACD.signal;
  if (macdCrossUp) buyScore += 25;
  else if (curMACD.histogram > 0 && curMACD.histogram > prevMACD.histogram)
    buyScore += 10;
  if (macdCrossDown) sellScore += 25;
  else if (curMACD.histogram < 0 && curMACD.histogram < prevMACD.histogram)
    sellScore += 10;

  // Need a clear winner with minimum threshold of 30 points
  const MIN_SCORE = 30;
  let direction: SignalDirection | null = null;

  if (buyScore > sellScore && buyScore >= MIN_SCORE) {
    direction = "buy";
  } else if (sellScore > buyScore && sellScore >= MIN_SCORE) {
    direction = "sell";
  } else {
    return null;
  }

  // Base confidence from score (50-100 range mapped from 30-85 score)
  const topScore = direction === "buy" ? buyScore : sellScore;
  let confidence = Math.round(50 + Math.min(50, (topScore / 85) * 50));

  // Pattern alignment bonus: if top pattern agrees with direction, boost confidence
  if (topPattern) {
    const patternAgreesWithBuy =
      direction === "buy" && topPattern.direction === "bullish";
    const patternAgreesWithSell =
      direction === "sell" && topPattern.direction === "bearish";
    if (patternAgreesWithBuy || patternAgreesWithSell) {
      confidence += topPattern.strength * 5; // up to +15
    } else if (topPattern.direction !== "neutral") {
      confidence -= 8; // conflicting pattern
    }
  }

  // Extra confidence bonuses
  if (direction === "buy") {
    if (curRSI < 25) confidence += 8;
    if (curStoch.k < 15) confidence += 8;
    if (macdCrossUp) confidence += 5;
  } else {
    if (curRSI > 75) confidence += 8;
    if (curStoch.k > 85) confidence += 8;
    if (macdCrossDown) confidence += 5;
  }

  // MACD histogram strength bonus
  if (Math.abs(curMACD.histogram) > Math.abs(prevMACD.histogram) * 1.2)
    confidence += 5;

  // Volatility penalty
  if (atr < avgATR * 0.3) confidence -= 10;

  // ADX trend bonus/penalty
  if (adx >= 25) confidence += 5;
  else if (adx < 15) confidence -= 8;

  confidence = Math.max(0, Math.min(100, confidence));

  if (confidence < config.minConfidence) return null;

  const expiryMinutes = 1;

  return {
    asset,
    direction,
    confidence,
    expiryMinutes,
    rsi: curRSI,
    stochasticK: curStoch.k,
    stochasticD: curStoch.d,
    macdValue: curMACD.macd,
    macdSignalLine: curMACD.signal,
    pattern: topPattern,
  };
}
