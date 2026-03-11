// Pure TypeScript indicator calculations

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Exponential Moving Average
 */
function calcEMA(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result.push(sum / period);

  for (let i = period; i < values.length; i++) {
    result.push(values[i] * k + result[result.length - 1] * (1 - k));
  }
  return result;
}

/**
 * Relative Strength Index
 */
export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change =
      closes[closes.length - period - 1 + i] -
      closes[closes.length - period - 2 + i];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Stochastic Oscillator %K and %D
 */
export function calcStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
  smoothing = 3,
): { k: number; d: number } {
  if (closes.length < kPeriod + dPeriod) return { k: 50, d: 50 };

  const rawKValues: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    const range = highestHigh - lowestLow;
    rawKValues.push(range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100);
  }

  // Smooth %K (this becomes the displayed %K)
  const smoothedK: number[] = [];
  for (let i = smoothing - 1; i < rawKValues.length; i++) {
    const slice = rawKValues.slice(i - smoothing + 1, i + 1);
    smoothedK.push(slice.reduce((a, b) => a + b, 0) / smoothing);
  }

  if (smoothedK.length === 0) return { k: 50, d: 50 };

  // %D is SMA of smoothed %K
  const dValues: number[] = [];
  for (let i = dPeriod - 1; i < smoothedK.length; i++) {
    const slice = smoothedK.slice(i - dPeriod + 1, i + 1);
    dValues.push(slice.reduce((a, b) => a + b, 0) / dPeriod);
  }

  const k = smoothedK[smoothedK.length - 1];
  const d = dValues.length > 0 ? dValues[dValues.length - 1] : k;

  return { k, d };
}

/**
 * MACD - Moving Average Convergence Divergence
 */
export function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: number; signal: number; histogram: number } {
  if (closes.length < slow + signal)
    return { macd: 0, signal: 0, histogram: 0 };

  const fastEMA = calcEMA(closes, fast);
  const slowEMA = calcEMA(closes, slow);

  // Align by offset
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  if (macdLine.length < signal) return { macd: 0, signal: 0, histogram: 0 };

  const signalLine = calcEMA(macdLine, signal);
  if (signalLine.length === 0) return { macd: 0, signal: 0, histogram: 0 };

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastMacd - lastSignal,
  };
}

/**
 * Previous MACD (second to last) for crossover detection
 */
export function calcMACDHistory(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: number; signal: number; histogram: number }[] {
  if (closes.length < slow + signal + 1) return [];

  const fastEMA = calcEMA(closes, fast);
  const slowEMA = calcEMA(closes, slow);

  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  if (macdLine.length < signal) return [];

  const signalLine = calcEMA(macdLine, signal);
  const offsetS = macdLine.length - signalLine.length;

  return signalLine.map((sig, i) => ({
    macd: macdLine[i + offsetS],
    signal: sig,
    histogram: macdLine[i + offsetS] - sig,
  }));
}

/**
 * Average True Range
 */
export function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;

  const trValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
    trValues.push(tr);
  }

  const recentTR = trValues.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / period;
}

/**
 * Average Directional Index (simplified)
 */
export function calcADX(candles: Candle[], period = 14): number {
  if (candles.length < period * 2) return 25;

  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const trValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close),
    );
    trValues.push(tr);
  }

  const recentStart = Math.max(0, trValues.length - period * 2);
  const subTR = trValues.slice(recentStart);
  const subDMP = dmPlus.slice(recentStart);
  const subDMM = dmMinus.slice(recentStart);

  if (subTR.length < period) return 25;

  const smoothATR: number[] = [];
  const smoothDMP: number[] = [];
  const smoothDMM: number[] = [];

  let initATR = 0;
  let initDMP = 0;
  let initDMM = 0;
  for (let i = 0; i < period; i++) {
    initATR += subTR[i];
    initDMP += subDMP[i];
    initDMM += subDMM[i];
  }
  smoothATR.push(initATR);
  smoothDMP.push(initDMP);
  smoothDMM.push(initDMM);

  for (let i = period; i < subTR.length; i++) {
    smoothATR.push(
      smoothATR[smoothATR.length - 1] -
        smoothATR[smoothATR.length - 1] / period +
        subTR[i],
    );
    smoothDMP.push(
      smoothDMP[smoothDMP.length - 1] -
        smoothDMP[smoothDMP.length - 1] / period +
        subDMP[i],
    );
    smoothDMM.push(
      smoothDMM[smoothDMM.length - 1] -
        smoothDMM[smoothDMM.length - 1] / period +
        subDMM[i],
    );
  }

  const diPlus: number[] = smoothDMP.map((v, i) =>
    smoothATR[i] === 0 ? 0 : (v / smoothATR[i]) * 100,
  );
  const diMinus: number[] = smoothDMM.map((v, i) =>
    smoothATR[i] === 0 ? 0 : (v / smoothATR[i]) * 100,
  );

  const dxValues: number[] = diPlus.map((p, i) => {
    const sum = p + diMinus[i];
    return sum === 0 ? 0 : (Math.abs(p - diMinus[i]) / sum) * 100;
  });

  const recentDX = dxValues.slice(-period);
  return recentDX.reduce((a, b) => a + b, 0) / period;
}

/**
 * Get RSI history for the last N points
 */
export function getRSIHistory(
  closes: number[],
  period = 14,
  count = 20,
): number[] {
  const result: number[] = [];
  for (let i = closes.length - count; i <= closes.length; i++) {
    if (i > period) {
      result.push(calcRSI(closes.slice(0, i), period));
    }
  }
  return result;
}
