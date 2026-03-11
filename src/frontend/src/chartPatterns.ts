import type { Candle } from "./indicators";

export type PatternDirection = "bullish" | "bearish" | "neutral";

export interface ChartPattern {
  name: string;
  direction: PatternDirection;
  strength: number; // 1-3 (1=weak, 2=moderate, 3=strong)
  description: string;
}

function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open);
}

function range(c: Candle): number {
  return c.high - c.low;
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

/**
 * Detect 1M candlestick patterns from recent candles.
 * Returns all detected patterns (may be multiple).
 */
export function detectPatterns(candles: Candle[]): ChartPattern[] {
  if (candles.length < 3) return [];

  const patterns: ChartPattern[] = [];
  const c0 = candles[candles.length - 1]; // current
  const c1 = candles[candles.length - 2]; // prev
  const c2 = candles[candles.length - 3]; // two back

  const body0 = bodySize(c0);
  const body1 = bodySize(c1);
  const range0 = range(c0);
  const upper0 = upperWick(c0);
  const lower0 = lowerWick(c0);

  // --- Single candle patterns ---

  // Doji: tiny body relative to range
  if (range0 > 0 && body0 / range0 < 0.1) {
    patterns.push({
      name: "Doji",
      direction: "neutral",
      strength: 1,
      description: "Indecision candle — watch for breakout direction",
    });
  }

  // Hammer: small body at top, long lower wick, in downtrend context
  if (
    range0 > 0 &&
    body0 / range0 < 0.35 &&
    lower0 >= body0 * 2 &&
    upper0 <= body0 * 0.5 &&
    isBullish(c0)
  ) {
    patterns.push({
      name: "Hammer",
      direction: "bullish",
      strength: 2,
      description: "Bullish reversal — buyers rejected lower prices",
    });
  }

  // Inverted Hammer (bullish after downtrend)
  if (
    range0 > 0 &&
    body0 / range0 < 0.35 &&
    upper0 >= body0 * 2 &&
    lower0 <= body0 * 0.5 &&
    isBullish(c0)
  ) {
    patterns.push({
      name: "Inverted Hammer",
      direction: "bullish",
      strength: 1,
      description: "Potential bullish reversal — needs confirmation",
    });
  }

  // Shooting Star: small body at bottom, long upper wick (bearish)
  if (
    range0 > 0 &&
    body0 / range0 < 0.35 &&
    upper0 >= body0 * 2 &&
    lower0 <= body0 * 0.5 &&
    isBearish(c0)
  ) {
    patterns.push({
      name: "Shooting Star",
      direction: "bearish",
      strength: 2,
      description: "Bearish reversal — sellers rejected higher prices",
    });
  }

  // Hanging Man (bearish after uptrend)
  if (
    range0 > 0 &&
    body0 / range0 < 0.35 &&
    lower0 >= body0 * 2 &&
    upper0 <= body0 * 0.5 &&
    isBearish(c0)
  ) {
    patterns.push({
      name: "Hanging Man",
      direction: "bearish",
      strength: 1,
      description: "Potential bearish reversal after uptrend",
    });
  }

  // Marubozu Bullish: full body, minimal wicks
  if (range0 > 0 && body0 / range0 > 0.9 && isBullish(c0)) {
    patterns.push({
      name: "Bullish Marubozu",
      direction: "bullish",
      strength: 3,
      description: "Strong bullish momentum — buyers in full control",
    });
  }

  // Marubozu Bearish
  if (range0 > 0 && body0 / range0 > 0.9 && isBearish(c0)) {
    patterns.push({
      name: "Bearish Marubozu",
      direction: "bearish",
      strength: 3,
      description: "Strong bearish momentum — sellers in full control",
    });
  }

  // Pin Bar Bullish: long lower wick >= 2.5x body, small upper wick
  if (range0 > 0 && lower0 >= body0 * 2.5 && upper0 <= range0 * 0.2) {
    patterns.push({
      name: "Bullish Pin Bar",
      direction: "bullish",
      strength: 3,
      description: "Strong rejection of lows — high-probability BUY signal",
    });
  }

  // Pin Bar Bearish: long upper wick >= 2.5x body, small lower wick
  if (range0 > 0 && upper0 >= body0 * 2.5 && lower0 <= range0 * 0.2) {
    patterns.push({
      name: "Bearish Pin Bar",
      direction: "bearish",
      strength: 3,
      description: "Strong rejection of highs — high-probability SELL signal",
    });
  }

  // --- Two candle patterns ---

  // Bullish Engulfing
  if (
    isBearish(c1) &&
    isBullish(c0) &&
    c0.open <= c1.close &&
    c0.close >= c1.open &&
    body0 > body1
  ) {
    patterns.push({
      name: "Bullish Engulfing",
      direction: "bullish",
      strength: 3,
      description: "Bulls overpowered bears — strong BUY reversal signal",
    });
  }

  // Bearish Engulfing
  if (
    isBullish(c1) &&
    isBearish(c0) &&
    c0.open >= c1.close &&
    c0.close <= c1.open &&
    body0 > body1
  ) {
    patterns.push({
      name: "Bearish Engulfing",
      direction: "bearish",
      strength: 3,
      description: "Bears overpowered bulls — strong SELL reversal signal",
    });
  }

  // Bullish Harami: small bullish candle inside large bearish
  if (
    isBearish(c1) &&
    isBullish(c0) &&
    c0.open > c1.close &&
    c0.close < c1.open &&
    body0 < body1 * 0.5
  ) {
    patterns.push({
      name: "Bullish Harami",
      direction: "bullish",
      strength: 1,
      description: "Potential bearish trend pause — bulls gaining ground",
    });
  }

  // Bearish Harami: small bearish inside large bullish
  if (
    isBullish(c1) &&
    isBearish(c0) &&
    c0.open < c1.close &&
    c0.close > c1.open &&
    body0 < body1 * 0.5
  ) {
    patterns.push({
      name: "Bearish Harami",
      direction: "bearish",
      strength: 1,
      description: "Potential bullish trend pause — bears gaining ground",
    });
  }

  // Tweezer Bottom (bullish): two candles with similar lows
  if (
    isBearish(c1) &&
    isBullish(c0) &&
    Math.abs(c0.low - c1.low) / (range0 + 0.00001) < 0.05
  ) {
    patterns.push({
      name: "Tweezer Bottom",
      direction: "bullish",
      strength: 2,
      description: "Double bottom rejection — support holding strong",
    });
  }

  // Tweezer Top (bearish): two candles with similar highs
  if (
    isBullish(c1) &&
    isBearish(c0) &&
    Math.abs(c0.high - c1.high) / (range0 + 0.00001) < 0.05
  ) {
    patterns.push({
      name: "Tweezer Top",
      direction: "bearish",
      strength: 2,
      description: "Double top rejection — resistance holding strong",
    });
  }

  // --- Three candle patterns ---

  const body2 = bodySize(c2);

  // Morning Star (bullish reversal): big bearish, small doji/spinning, big bullish
  if (
    isBearish(c2) &&
    body1 < body2 * 0.4 &&
    isBullish(c0) &&
    c0.close > (c2.open + c2.close) / 2
  ) {
    patterns.push({
      name: "Morning Star",
      direction: "bullish",
      strength: 3,
      description: "Three-candle bullish reversal — strong BUY confirmation",
    });
  }

  // Evening Star (bearish reversal): big bullish, small doji/spinning, big bearish
  if (
    isBullish(c2) &&
    body1 < body2 * 0.4 &&
    isBearish(c0) &&
    c0.close < (c2.open + c2.close) / 2
  ) {
    patterns.push({
      name: "Evening Star",
      direction: "bearish",
      strength: 3,
      description: "Three-candle bearish reversal — strong SELL confirmation",
    });
  }

  // Three White Soldiers
  if (
    isBullish(c2) &&
    isBullish(c1) &&
    isBullish(c0) &&
    c1.close > c2.close &&
    c0.close > c1.close &&
    c1.open > c2.open &&
    c0.open > c1.open
  ) {
    patterns.push({
      name: "Three White Soldiers",
      direction: "bullish",
      strength: 3,
      description:
        "Three consecutive bullish candles — strong uptrend momentum",
    });
  }

  // Three Black Crows
  if (
    isBearish(c2) &&
    isBearish(c1) &&
    isBearish(c0) &&
    c1.close < c2.close &&
    c0.close < c1.close &&
    c1.open < c2.open &&
    c0.open < c1.open
  ) {
    patterns.push({
      name: "Three Black Crows",
      direction: "bearish",
      strength: 3,
      description:
        "Three consecutive bearish candles — strong downtrend momentum",
    });
  }

  return patterns;
}

/**
 * Compute pattern-based score adjustments for signal generation.
 * Returns { buyBonus, sellBonus, topPattern }
 */
export function getPatternScore(candles: Candle[]): {
  buyBonus: number;
  sellBonus: number;
  topPattern: ChartPattern | null;
} {
  const patterns = detectPatterns(candles);
  let buyBonus = 0;
  let sellBonus = 0;
  let topPattern: ChartPattern | null = null;
  let topStrength = 0;

  for (const p of patterns) {
    const pts = p.strength * 12; // strength 1=12, 2=24, 3=36 points
    if (p.direction === "bullish") {
      buyBonus += pts;
      if (p.strength > topStrength) {
        topPattern = p;
        topStrength = p.strength;
      }
    } else if (p.direction === "bearish") {
      sellBonus += pts;
      if (p.strength > topStrength) {
        topPattern = p;
        topStrength = p.strength;
      }
    }
  }

  return { buyBonus, sellBonus, topPattern };
}
