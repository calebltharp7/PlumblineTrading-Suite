/**
 * NT8 Strategy Statistical Validator — JavaScript Engine v3.0
 * Bit-identical port of sign_flip_engine_nt8_v3.py
 * Uses PCG64 PRNG with pre-extracted numpy state for seed=42
 *
 * Tests: Positive Expectancy, Sign-Flip Permutation, One-Sample t-Test,
 *        Bootstrap Monte Carlo, Anchored Walk Forward Analysis
 */
(function(global) {
'use strict';

// ═══════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const N_PERMUTATIONS = 10000;
const ALPHA = 0.05;
const SEED  = 42;

const WFA_N_WINDOWS            = 5;
const WFA_MIN_TRADES           = 50;
const WFA_EFFICIENCY_THRESHOLD = 0.50;
const WFA_PROFITABLE_THRESHOLD = 0.60;
const WFA_EFF_CLIP_LO          = -2.0;
const WFA_EFF_CLIP_HI          =  3.0;

// ═══════════════════════════════════════════════════════════════════════
//  PCG64 PRNG  (PCG-XSL-RR 128/64, BigInt implementation)
//  State extracted from numpy.random.default_rng(42)
// ═══════════════════════════════════════════════════════════════════════
const MASK64  = (1n << 64n) - 1n;
const MASK128 = (1n << 128n) - 1n;
const PCG_MULT = 47026247687942121848144207491837523525n;

// Pre-extracted initial state from numpy PCG64 with seed=42:
//   state = 274674114334540486603088602300644985544
//   inc   = 332724090758049132448979897138935081983
const INIT_STATE = (0xcea44f6798798f2an << 64n) | 0xacbc7c9d68860ac8n;
const INIT_INC   = (0xfa505436c9a8416en << 64n) | 0x66caf2e28d25abffn;

class PCG64 {
  /**
   * @param {BigInt} [state=INIT_STATE] - 128-bit PCG state
   * @param {BigInt} [inc=INIT_INC]     - 128-bit PCG increment (odd)
   */
  constructor(state, inc) {
    this.state = (state !== undefined) ? BigInt(state) : INIT_STATE;
    this.inc   = (inc   !== undefined) ? BigInt(inc)   : INIT_INC;
  }

  /** Right-rotate a 64-bit BigInt value by rot positions */
  _rotr64(val, rot) {
    val = val & MASK64;
    const r = BigInt(rot & 63);
    return ((val >> r) | (val << (64n - r))) & MASK64;
  }

  /** Generate next 64-bit unsigned integer (PCG-XSL-RR 128/64) */
  nextUint64() {
    const old = this.state;
    // Advance internal state
    this.state = (old * PCG_MULT + this.inc) & MASK128;
    // Output: XSL-RR
    const hi = (old >> 64n) & MASK64;
    const lo = old & MASK64;
    const xsl = (hi ^ lo) & MASK64;
    const rot = Number(old >> 122n);  // top 6 bits
    return this._rotr64(xsl, rot);
  }

  /** Generate uniform random double in [0, 1) — matches numpy convention */
  random() {
    return Number(this.nextUint64() >> 11n) / 9007199254740992; // 2^53
  }

  /**
   * Generate random integer in [low, high) using Lemire bounded method.
   * Matches numpy Generator.integers(low, high) exactly.
   * @param {number} low  - inclusive lower bound
   * @param {number} high - exclusive upper bound
   * @returns {number}
   */
  integers(low, high) {
    const range = high - low;
    if (range <= 1) return low;
    const rng = BigInt(range);

    // Power-of-2 fast path
    if ((range & (range - 1)) === 0) {
      const bits = 31 - Math.clz32(range);  // log2 for power-of-2
      return low + Number(this.nextUint64() >> BigInt(64 - bits));
    }

    // General Lemire bounded rejection method
    let x = this.nextUint64();
    let m = x * rng;
    let l = m & MASK64;
    const t = ((1n << 64n) - rng) % rng;
    while (l < t) {
      x = this.nextUint64();
      m = x * rng;
      l = m & MASK64;
    }
    return low + Number((m >> 64n) & MASK64);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════
function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }
function round6(n) { return Math.round(n * 1000000) / 1000000; }

function cumsum(arr) {
  const out = new Array(arr.length);
  let s = 0;
  for (let i = 0; i < arr.length; i++) { s += arr[i]; out[i] = s; }
  return out;
}

function arrSum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

function mean(arr) {
  return arr.length === 0 ? 0 : arrSum(arr) / arr.length;
}

/** Population standard deviation (ddof=0) — matches numpy.std() default */
function popStd(arr) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) { const d = arr[i] - m; s += d * d; }
  return Math.sqrt(s / arr.length);
}

/** Median — matches numpy.median() */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Linear-interpolation percentile — matches numpy.percentile() default */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ═══════════════════════════════════════════════════════════════════════
//  STATISTICAL MATH  (logGamma, betacf, betainc, tCDF)
// ═══════════════════════════════════════════════════════════════════════

/** Lanczos approximation for log-Gamma, g=7 */
function logGamma(x) {
  const cof = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = cof[0];
  const t = x + 7.5;  // x + g + 0.5
  for (let i = 1; i < 9; i++) a += cof[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/** Continued fraction for regularized incomplete beta — Lentz method */
function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-15, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    h *= d * c;
    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b) */
function betainc(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b));
  if (x < (a + 1) / (a + b + 2)) {
    return front * betacf(a, b, x) / a;
  }
  return 1 - front * betacf(b, a, 1 - x) / b;
}

/** Student-t cumulative distribution function */
function tCDF(t, df) {
  const x = df / (df + t * t);
  const p = 0.5 * betainc(df / 2, 0.5, x);
  return t >= 0 ? 1 - p : p;
}

// ═══════════════════════════════════════════════════════════════════════
//  CSV PARSER
// ═══════════════════════════════════════════════════════════════════════

function parseMoney(value) {
  if (typeof value === 'number') return value;
  let s = String(value).trim().replace(/\$/g, '').replace(/,/g, '');
  if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
    else { cur += ch; }
  }
  fields.push(cur);
  return fields;
}

/**
 * Parse NinjaTrader Strategy Analyzer CSV export.
 * @param {string} csvText - Raw CSV text content
 * @returns {number[]} Array of per-trade P&L values (zeros excluded)
 */
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCSVLine(lines[0]);
  const preferred = new Set([
    'profit', 'p&l', 'pnl', 'net profit',
    'trade p&l', 'trade profit', 'cum. profit'
  ]);
  let pnlCol = -1;
  for (let i = 0; i < header.length; i++) {
    if (preferred.has(header[i].trim().toLowerCase())) { pnlCol = i; break; }
  }
  if (pnlCol < 0) pnlCol = 0;

  const trades = [];
  for (let r = 1; r < lines.length; r++) {
    const fields = splitCSVLine(lines[r]);
    if (pnlCol < fields.length) {
      const v = parseMoney(fields[pnlCol]);
      if (v !== null && v !== 0) trades.push(v);
    }
  }
  return trades;
}

// ═══════════════════════════════════════════════════════════════════════
//  ENGINE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute Curtis Faith positive expectancy metrics.
 * @param {number[]} trades - Array of per-trade P&L
 * @returns {object} Expectancy metrics
 */
function computeExpectancy(trades) {
  const n = trades.length;
  if (n === 0) {
    return { expectancy_per_trade: 0, expectancy_per_dollar: 0, win_rate: 0,
      loss_rate: 0, avg_win: 0, avg_loss: 0, win_loss_ratio: 0,
      total_trades: 0, is_positive: false };
  }
  const winners = trades.filter(t => t > 0);
  const losers  = trades.filter(t => t < 0);
  const winRate  = winners.length / n;
  const lossRate = losers.length / n;
  const avgWin   = winners.length > 0 ? mean(winners) : 0;
  const avgLoss  = losers.length > 0 ? mean(losers.map(Math.abs)) : 0;
  const exp = winRate * avgWin - lossRate * avgLoss;
  return {
    expectancy_per_trade:  round4(exp),
    expectancy_per_dollar: avgLoss > 0 ? round4(exp / avgLoss) : 0,
    win_rate:  round4(winRate),
    loss_rate: round4(lossRate),
    avg_win:   round2(avgWin),
    avg_loss:  round2(avgLoss),
    win_loss_ratio: avgLoss > 0 ? round4(avgWin / avgLoss) : 0,
    total_trades: n,
    is_positive: exp > 0
  };
}

/**
 * Sign-flip permutation test — bit-identical to Python version.
 * @param {number[]} trades
 * @param {number} [nPerms=10000]
 * @returns {object} Sign-flip test results
 */
function signFlipPermutationTest(trades, nPerms) {
  nPerms = nPerms || N_PERMUTATIONS;
  const rng = new PCG64();
  const n = trades.length;
  const absTrades = trades.map(Math.abs);
  const observed = arrSum(trades);
  let countGe = 0;
  for (let p = 0; p < nPerms; p++) {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const sign = rng.integers(0, 2) === 0 ? -1 : 1;
      s += sign * absTrades[i];
    }
    if (s >= observed) countGe++;
  }
  const pVal = countGe / nPerms;
  return {
    observed_net_profit: round2(observed),
    p_value_sign_flip: round6(pVal),
    n_permutations: nPerms,
    significant_sign_flip_005: pVal < ALPHA
  };
}

/**
 * One-sample t-test (one-tailed, H_a: mean > 0).
 * @param {number[]} trades
 * @returns {object} t-test results
 */
function ttestOneSample(trades) {
  const n = trades.length;
  if (n < 2) {
    return { t_statistic: 0, p_value_ttest: 1, significant_ttest_005: false };
  }
  const m = mean(trades);
  let ss = 0;
  for (let i = 0; i < n; i++) { const d = trades[i] - m; ss += d * d; }
  const sampleVar = ss / (n - 1);        // ddof=1
  const se = Math.sqrt(sampleVar / n);
  if (se === 0) {
    return { t_statistic: 0, p_value_ttest: 1, significant_ttest_005: false };
  }
  const tStat = m / se;
  const df = n - 1;
  const pTwo = 2 * (1 - tCDF(Math.abs(tStat), df));
  const pOne = tStat > 0 ? pTwo / 2 : 1 - pTwo / 2;
  return {
    t_statistic: round4(tStat),
    p_value_ttest: round6(pOne),
    significant_ttest_005: pOne < ALPHA
  };
}

/**
 * Compute maximum drawdown from an equity curve.
 * @param {number[]} equityCurve - Cumulative P&L array
 * @returns {number}
 */
function computeMaxDrawdown(equityCurve) {
  if (equityCurve.length === 0) return 0;
  let peak = -Infinity, maxDD = 0;
  for (let i = 0; i < equityCurve.length; i++) {
    if (equityCurve[i] > peak) peak = equityCurve[i];
    const dd = peak - equityCurve[i];
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

/**
 * Segment statistics helper for Walk Forward Analysis.
 * @param {number[]} segment - Slice of trades array
 * @returns {object}
 */
function segmentStats(segment) {
  const n = segment.length;
  if (n === 0) {
    return { n_trades: 0, net_profit: 0, expectancy: 0,
             win_rate: 0, avg_win: 0, avg_loss: 0 };
  }
  const winners = segment.filter(t => t > 0);
  const losers  = segment.filter(t => t < 0);
  const winRate  = winners.length / n;
  const lossRate = losers.length / n;
  const avgWin   = winners.length > 0 ? mean(winners) : 0;
  const avgLoss  = losers.length > 0 ? mean(losers.map(Math.abs)) : 0;
  const exp = winRate * avgWin - lossRate * avgLoss;
  return {
    n_trades:   n,
    net_profit: round2(arrSum(segment)),
    expectancy: round4(exp),
    win_rate:   round4(winRate),
    avg_win:    round2(avgWin),
    avg_loss:   round2(avgLoss)
  };
}

/**
 * Bootstrap Monte Carlo equity-curve simulation.
 * Resamples trades WITH REPLACEMENT to stress-test sequence risk.
 * @param {number[]} trades
 * @param {number} [nPerms=10000]
 * @param {number|null} [ruinThreshold=null] - null for auto 95th pct
 * @returns {object} Monte Carlo results
 */
function monteCarloAnalysis(trades, nPerms, ruinThreshold) {
  nPerms = nPerms || N_PERMUTATIONS;
  const rng = new PCG64();
  const n = trades.length;

  // Observed metrics
  const equity = cumsum(trades);
  const observedNet    = equity[n - 1];
  const observedDD     = computeMaxDrawdown(equity);
  const s0 = popStd(trades);
  const observedSharpe = s0 > 0 ? mean(trades) / s0 : 0;

  let ruinSource = 'user';
  if (ruinThreshold === null || ruinThreshold === undefined) {
    ruinSource = 'auto_95pct';
    ruinThreshold = null; // compute after simulation
  }

  const netProfits   = new Array(nPerms);
  const maxDrawdowns = new Array(nPerms);
  const sharpes      = new Array(nPerms);

  for (let p = 0; p < nPerms; p++) {
    // Resample with replacement
    const sample = new Array(n);
    for (let i = 0; i < n; i++) sample[i] = trades[rng.integers(0, n)];
    const eq = cumsum(sample);
    netProfits[p]   = eq[n - 1];
    maxDrawdowns[p] = computeMaxDrawdown(eq);
    const s = popStd(sample);
    sharpes[p] = s > 0 ? mean(sample) / s : 0;
  }

  if (ruinSource === 'auto_95pct') {
    ruinThreshold = percentile(maxDrawdowns, 95);
  }
  let ruinCount = 0;
  for (let i = 0; i < nPerms; i++) {
    if (maxDrawdowns[i] >= ruinThreshold) ruinCount++;
  }

  return {
    net_profit_median:     round2(median(netProfits)),
    net_profit_mean:       round2(mean(netProfits)),
    net_profit_5pct:       round2(percentile(netProfits, 5)),
    net_profit_95pct:      round2(percentile(netProfits, 95)),
    max_drawdown_95pct:    round2(percentile(maxDrawdowns, 95)),
    prob_of_ruin:          round4(ruinCount / nPerms),
    ruin_threshold:        round2(ruinThreshold),
    ruin_source:           ruinSource,
    observed_net_profit:   round2(observedNet),
    observed_max_drawdown: round2(observedDD),
    observed_sharpe:       round4(observedSharpe),
    sharpe_median:         round4(median(sharpes))
  };
}

/**
 * Anchored Walk Forward Analysis with expanding in-sample.
 * @param {number[]} trades
 * @param {number} [nWindows=5]
 * @returns {object} WFA results
 */
function walkForwardAnalysis(trades, nWindows) {
  nWindows = nWindows || WFA_N_WINDOWS;
  const n = trades.length;

  if (n < WFA_MIN_TRADES) {
    return {
      skipped: true,
      reason: 'Insufficient trades (' + n + ' < ' + WFA_MIN_TRADES + ' minimum)',
      n_windows: 0, windows: [], median_efficiency: 0, mean_efficiency: 0,
      pct_oos_profitable: 0, oos_total_net_profit: 0, oos_expectancy_mean: 0,
      efficiency_threshold: WFA_EFFICIENCY_THRESHOLD,
      profitable_threshold: WFA_PROFITABLE_THRESHOLD,
      pass_wfa: false
    };
  }

  let foldSize = Math.floor(n / (nWindows + 1));
  if (foldSize < 10) {
    foldSize = Math.max(10, Math.floor(n / 3));
    nWindows = Math.max(1, Math.floor(n / foldSize) - 1);
  }

  const windows = [];
  const efficiencies = [];
  const oosProfits = [];
  const oosExpectancies = [];

  for (let k = 0; k < nWindows; k++) {
    const isEnd    = (k + 1) * foldSize;
    const oosStart = isEnd;
    const oosEnd   = Math.min((k + 2) * foldSize, n);

    const isStats  = segmentStats(trades.slice(0, isEnd));
    const oosStats = segmentStats(trades.slice(oosStart, oosEnd));

    let eff;
    if (isStats.expectancy > 0) {
      eff = oosStats.expectancy / isStats.expectancy;
    } else if (isStats.expectancy === 0 && oosStats.expectancy > 0) {
      eff = 1.0;
    } else {
      eff = 0.0;
    }
    // Clip to [-2.0, 3.0]
    eff = Math.max(WFA_EFF_CLIP_LO, Math.min(WFA_EFF_CLIP_HI, eff));

    windows.push({
      window: k + 1, is: isStats, oos: oosStats,
      efficiency_ratio: round4(eff)
    });
    efficiencies.push(eff);
    oosProfits.push(oosStats.net_profit);
    oosExpectancies.push(oosStats.expectancy);
  }

  const medEff = median(efficiencies);
  const pctProf = oosProfits.filter(p => p > 0).length / oosProfits.length;
  const passWfa = medEff >= WFA_EFFICIENCY_THRESHOLD
               && pctProf >= WFA_PROFITABLE_THRESHOLD;

  return {
    skipped: false,
    n_windows: nWindows,
    fold_size: foldSize,
    total_trades: n,
    windows: windows,
    median_efficiency:    round4(medEff),
    mean_efficiency:      round4(mean(efficiencies)),
    pct_oos_profitable:   round4(pctProf),
    oos_total_net_profit: round2(arrSum(oosProfits)),
    oos_expectancy_mean:  round4(mean(oosExpectancies)),
    efficiency_threshold: WFA_EFFICIENCY_THRESHOLD,
    profitable_threshold: WFA_PROFITABLE_THRESHOLD,
    pass_wfa: passWfa
  };
}

/**
 * Run all statistical tests and build the complete results object.
 * @param {number[]} trades        - Array of per-trade P&L
 * @param {number|null} ruinThreshold - User ruin threshold (null = auto)
 * @returns {object} Full results matching schema v3.0
 */
function buildResults(trades, ruinThreshold) {
  ruinThreshold = (ruinThreshold !== undefined) ? ruinThreshold : null;

  const exp = computeExpectancy(trades);
  const pv  = signFlipPermutationTest(trades);
  const tt  = ttestOneSample(trades);

  // Merge t-test results into p_value block (matching Python schema)
  pv.p_value_ttest         = tt.p_value_ttest;
  pv.t_statistic           = tt.t_statistic;
  pv.significant_ttest_005 = tt.significant_ttest_005;

  const mc  = monteCarloAnalysis(trades, N_PERMUTATIONS, ruinThreshold);
  const wfa = walkForwardAnalysis(trades);

  const summary = {
    pass_expectancy: exp.is_positive,
    pass_sign_flip:  pv.significant_sign_flip_005,
    pass_ttest:      pv.significant_ttest_005,
    pass_ruin:       mc.prob_of_ruin < 0.05,
    pass_wfa:        wfa.pass_wfa
  };
  summary.overall_pass = summary.pass_expectancy && summary.pass_sign_flip
    && summary.pass_ttest && summary.pass_ruin && summary.pass_wfa;

  return {
    schema_version: '3.0',
    expectancy:     exp,
    p_value:        pv,
    monte_carlo:    mc,
    walk_forward:   wfa,
    summary:        summary
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  VERIFICATION  — Reference values from numpy.random.default_rng(42)
// ═══════════════════════════════════════════════════════════════════════
const REFERENCE_RANDOM = [
  0.7739560485559633, 0.4388784397520523, 0.8585979199113825,
  0.6973680290593639, 0.09417734788764953, 0.9756223516367559,
  0.761139701990353,  0.7860643052769538, 0.12811363267554587,
  0.45038593789556713, 0.37079802423258124, 0.9267649888486018,
  0.6438651200806645, 0.82276161327083,   0.44341419882733113,
  0.2272387217847769, 0.5545847870158348, 0.06381725610417532,
  0.8276311719925821, 0.6316643991220648
];
const REFERENCE_CHOICE = [-1,1,1,-1,-1,1,-1,1,-1,-1,1,1,1,1,1,1,1,-1,1,-1];
const REFERENCE_INTS_243 = [
  21,188,159,106,105,208,20,169,48,22,
  127,237,178,184,174,191,124,31,204,109
];

/**
 * Verify PCG64 produces bit-identical output to numpy seed=42.
 * Run in browser console: SignFlipEngine.verify()
 * @returns {object} { allPass, randomPass, choicePass, integersPass, details[] }
 */
function verify() {
  const res = {
    allPass: true, randomPass: true,
    choicePass: true, integersPass: true, details: []
  };

  // Test random()
  let rng = new PCG64();
  for (let i = 0; i < 20; i++) {
    const got = rng.random();
    const exp = REFERENCE_RANDOM[i];
    if (Math.abs(got - exp) > 1e-15) {
      res.randomPass = false;
      res.details.push('random[' + i + ']: expected ' + exp + ' got ' + got);
    }
  }

  // Test choice via integers(0, 2)
  rng = new PCG64();
  for (let i = 0; i < 20; i++) {
    const got = rng.integers(0, 2) === 0 ? -1 : 1;
    if (got !== REFERENCE_CHOICE[i]) {
      res.choicePass = false;
      res.details.push('choice[' + i + ']: expected ' + REFERENCE_CHOICE[i] + ' got ' + got);
    }
  }

  // Test integers(0, 243)
  rng = new PCG64();
  for (let i = 0; i < 20; i++) {
    const got = rng.integers(0, 243);
    if (got !== REFERENCE_INTS_243[i]) {
      res.integersPass = false;
      res.details.push('ints243[' + i + ']: expected ' + REFERENCE_INTS_243[i] + ' got ' + got);
    }
  }

  res.allPass = res.randomPass && res.choicePass && res.integersPass;
  return res;
}

// ═══════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════
global.SignFlipEngine = {
  buildResults,
  parseCSV,
  verify,
  computeExpectancy,
  signFlipPermutationTest,
  ttestOneSample,
  computeMaxDrawdown,
  monteCarloAnalysis,
  walkForwardAnalysis,
  segmentStats,
  PCG64
};

})(typeof window !== 'undefined' ? window : globalThis);
