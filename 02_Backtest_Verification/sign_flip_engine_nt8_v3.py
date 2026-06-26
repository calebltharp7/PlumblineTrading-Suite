#!/usr/bin/env python3
"""
NT8-Compatible Strategy Statistical Validator v3.0
Adds Walk Forward Analysis (WFA) / Out-of-Sample (OOS) validation.

Reads NinjaTrader Strategy Analyzer CSV exports or simple P&L CSV files and writes results.json.

Tests:
- Positive Expectancy
- Sign-Flip Permutation Test
- One-Sample t-Test
- Bootstrap Monte Carlo order-resampling
- Anchored Walk Forward Analysis / OOS edge persistence

Usage:
  python sign_flip_engine_nt8_v3.py trades.csv results.json
  python sign_flip_engine_nt8_v3.py trades.csv results.json 3000
  python sign_flip_engine_nt8_v3.py trades.csv
  python sign_flip_engine_nt8_v3.py
"""

import csv
import json
import sys
from typing import Optional

import numpy as np
from scipy import stats

N_PERMUTATIONS = 10_000
ALPHA = 0.05
SEED = 42

WFA_N_WINDOWS = 5
WFA_MIN_TRADES = 50
WFA_EFFICIENCY_THRESHOLD = 0.50
WFA_PROFITABLE_THRESHOLD = 0.60


def generate_demo_trades(n_trades=1951, win_rate=0.5126, avg_win=24.70, avg_loss=24.64, seed=SEED):
    rng = np.random.Generator(np.random.PCG64(seed))
    trades = []
    for _ in range(n_trades):
        if rng.random() < win_rate:
            trades.append(abs(rng.normal(avg_win, avg_win * 0.3)))
        else:
            trades.append(-abs(rng.normal(avg_loss, avg_loss * 0.3)))
    return np.array(trades, dtype=float)


def parse_money(value):
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace("$", "").replace(",", "")
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return float(s)
    except ValueError:
        return None


def load_trades_from_csv(filepath):
    trades = []
    with open(filepath, "r", newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return np.array([], dtype=float)

        pnl_col = None
        preferred = {"profit", "p&l", "pnl", "net profit", "trade p&l", "trade profit", "cum. profit"}
        for i, col in enumerate(header):
            if col.strip().lower() in preferred:
                pnl_col = i
                break
        if pnl_col is None:
            pnl_col = 0

        for row in reader:
            if pnl_col < len(row):
                v = parse_money(row[pnl_col])
                if v is not None and v != 0.0:
                    trades.append(v)
    return np.array(trades, dtype=float)


def compute_expectancy(trades):
    trades = np.asarray(trades, dtype=float)
    winners = trades[trades > 0]
    losers = trades[trades < 0]
    total = len(trades)
    if total == 0:
        return {
            "expectancy_per_trade": 0.0, "expectancy_per_dollar": 0.0,
            "win_rate": 0.0, "loss_rate": 0.0, "avg_win": 0.0, "avg_loss": 0.0,
            "win_loss_ratio": 0.0, "total_trades": 0, "is_positive": False
        }
    win_rate = len(winners) / total
    loss_rate = len(losers) / total
    avg_win = float(np.mean(winners)) if len(winners) else 0.0
    avg_loss = float(np.mean(np.abs(losers))) if len(losers) else 0.0
    expectancy = (win_rate * avg_win) - (loss_rate * avg_loss)
    return {
        "expectancy_per_trade": round(expectancy, 4),
        "expectancy_per_dollar": round(expectancy / avg_loss, 4) if avg_loss > 0 else 0.0,
        "win_rate": round(win_rate, 4),
        "loss_rate": round(loss_rate, 4),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "win_loss_ratio": round(avg_win / avg_loss, 4) if avg_loss > 0 else 0.0,
        "total_trades": total,
        "is_positive": expectancy > 0,
    }


def sign_flip_permutation_test(trades, n_perms=N_PERMUTATIONS, seed=SEED):
    rng = np.random.Generator(np.random.PCG64(seed))
    trades = np.asarray(trades, dtype=float)
    observed = float(np.sum(trades))
    abs_trades = np.abs(trades)
    count_ge = 0
    for _ in range(n_perms):
        signs = rng.choice([-1, 1], size=len(trades))
        if float(np.sum(signs * abs_trades)) >= observed:
            count_ge += 1
    p = count_ge / n_perms
    return {
        "observed_net_profit": round(observed, 2),
        "p_value_sign_flip": round(p, 6),
        "n_permutations": n_perms,
        "significant_sign_flip_005": p < ALPHA,
    }


def ttest_pvalue(trades):
    t_stat, p_two = stats.ttest_1samp(trades, 0.0)
    if np.isnan(t_stat) or np.isnan(p_two):
        return 0.0, 1.0
    p_one = p_two / 2.0 if t_stat > 0 else 1.0 - (p_two / 2.0)
    return float(t_stat), float(p_one)


def compute_max_drawdown(equity_curve):
    equity_curve = np.asarray(equity_curve, dtype=float)
    if len(equity_curve) == 0:
        return 0.0
    peak = np.maximum.accumulate(equity_curve)
    return float(np.max(peak - equity_curve))


def monte_carlo_analysis(trades, n_perms=N_PERMUTATIONS, seed=SEED, ruin_threshold: Optional[float] = None):
    """
    Bootstrap Monte Carlo equity-curve simulation.
    Resamples trades WITH REPLACEMENT to produce a true distribution
    for net profit, max drawdown, and Sharpe ratio.
    """
    rng = np.random.Generator(np.random.PCG64(seed))
    trades = np.asarray(trades, dtype=float)
    n = len(trades)

    observed_equity = np.cumsum(trades)
    observed_net = float(observed_equity[-1]) if n else 0.0
    observed_dd = compute_max_drawdown(observed_equity)
    observed_sharpe = float(np.mean(trades) / np.std(trades)) if np.std(trades) > 0 else 0.0

    net_profits = np.empty(n_perms)
    max_drawdowns = np.empty(n_perms)
    sharpes = np.empty(n_perms)

    for i in range(n_perms):
        sample = rng.choice(trades, size=n, replace=True)
        eq = np.cumsum(sample)
        net_profits[i] = float(eq[-1])
        max_drawdowns[i] = compute_max_drawdown(eq)
        std = float(np.std(sample))
        sharpes[i] = float(np.mean(sample) / std) if std > 0 else 0.0

    if ruin_threshold is None:
        ruin_threshold = float(np.percentile(max_drawdowns, 95))
        ruin_source = "auto_95pct"
    else:
        ruin_source = "user"

    return {
        "net_profit_median": round(float(np.median(net_profits)), 2),
        "net_profit_mean": round(float(np.mean(net_profits)), 2),
        "net_profit_5pct": round(float(np.percentile(net_profits, 5)), 2),
        "net_profit_95pct": round(float(np.percentile(net_profits, 95)), 2),
        "max_drawdown_95pct": round(float(np.percentile(max_drawdowns, 95)), 2),
        "prob_of_ruin": round(float(np.mean(max_drawdowns >= ruin_threshold)), 4),
        "ruin_threshold": round(float(ruin_threshold), 2),
        "ruin_source": ruin_source,
        "observed_net_profit": round(observed_net, 2),
        "observed_max_drawdown": round(observed_dd, 2),
        "observed_sharpe": round(observed_sharpe, 4),
        "sharpe_median": round(float(np.median(sharpes)), 4),
    }



def _segment_stats(segment):
    segment = np.asarray(segment, dtype=float)
    n = len(segment)
    if n == 0:
        return {"n_trades": 0, "net_profit": 0.0, "expectancy": 0.0, "win_rate": 0.0, "avg_win": 0.0, "avg_loss": 0.0}
    winners = segment[segment > 0]
    losers = segment[segment < 0]
    win_rate = len(winners) / n
    loss_rate = len(losers) / n
    avg_win = float(np.mean(winners)) if len(winners) else 0.0
    avg_loss = float(np.mean(np.abs(losers))) if len(losers) else 0.0
    expectancy = (win_rate * avg_win) - (loss_rate * avg_loss)
    return {
        "n_trades": n,
        "net_profit": round(float(np.sum(segment)), 2),
        "expectancy": round(expectancy, 4),
        "win_rate": round(win_rate, 4),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
    }


def walk_forward_analysis(trades, n_windows=WFA_N_WINDOWS):
    trades = np.asarray(trades, dtype=float)
    n = len(trades)
    if n < WFA_MIN_TRADES:
        return {
            "skipped": True,
            "reason": f"Insufficient trades ({n} < {WFA_MIN_TRADES} minimum)",
            "n_windows": 0, "windows": [], "median_efficiency": 0.0, "mean_efficiency": 0.0,
            "pct_oos_profitable": 0.0, "oos_total_net_profit": 0.0,
            "oos_expectancy_mean": 0.0, "pass_wfa": False,
        }

    fold_size = n // (n_windows + 1)
    if fold_size < 10:
        fold_size = max(10, n // 3)
        n_windows = max(1, (n // fold_size) - 1)

    windows, efficiencies, oos_profits, oos_expectancies = [], [], [], []
    for k in range(n_windows):
        is_end = (k + 1) * fold_size
        oos_start = is_end
        oos_end = min((k + 2) * fold_size, n)
        is_stats = _segment_stats(trades[:is_end])
        oos_stats = _segment_stats(trades[oos_start:oos_end])

        if is_stats["expectancy"] > 0:
            eff = oos_stats["expectancy"] / is_stats["expectancy"]
        elif is_stats["expectancy"] == 0 and oos_stats["expectancy"] > 0:
            eff = 1.0
        else:
            eff = 0.0
        eff = max(-2.0, min(3.0, eff))

        windows.append({"window": k + 1, "is": is_stats, "oos": oos_stats, "efficiency_ratio": round(eff, 4)})
        efficiencies.append(eff)
        oos_profits.append(oos_stats["net_profit"])
        oos_expectancies.append(oos_stats["expectancy"])

    median_eff = float(np.median(efficiencies))
    pct_profitable = float(np.mean(np.array(oos_profits) > 0))
    pass_wfa = median_eff >= WFA_EFFICIENCY_THRESHOLD and pct_profitable >= WFA_PROFITABLE_THRESHOLD

    return {
        "skipped": False,
        "n_windows": n_windows,
        "fold_size": fold_size,
        "total_trades": n,
        "windows": windows,
        "median_efficiency": round(median_eff, 4),
        "mean_efficiency": round(float(np.mean(efficiencies)), 4),
        "pct_oos_profitable": round(pct_profitable, 4),
        "oos_total_net_profit": round(float(np.sum(oos_profits)), 2),
        "oos_expectancy_mean": round(float(np.mean(oos_expectancies)), 4),
        "efficiency_threshold": WFA_EFFICIENCY_THRESHOLD,
        "profitable_threshold": WFA_PROFITABLE_THRESHOLD,
        "pass_wfa": pass_wfa,
    }


def build_results(trades, ruin_threshold=None):
    print("=" * 60)
    print(" NT8 STRATEGY STATISTICAL VALIDATOR")
    print(" Sign-Flip Engine + Bootstrap MC + WFA v3.0")
    print("=" * 60)
    print(f"\n Trades loaded: {len(trades)}")

    print("[1/5] Computing expectancy...")
    exp = compute_expectancy(trades)

    print("[2/5] Running sign-flip permutation + t-test...")
    pv = sign_flip_permutation_test(trades)
    t_stat, p_tt = ttest_pvalue(trades)
    pv["p_value_ttest"] = round(p_tt, 6)
    pv["t_statistic"] = round(t_stat, 4)
    pv["significant_ttest_005"] = p_tt < ALPHA

    print("[3/5] Running Monte Carlo...")
    mc = monte_carlo_analysis(trades, ruin_threshold=ruin_threshold)

    print("[4/5] Running Walk Forward / OOS...")
    wfa = walk_forward_analysis(trades)
    if wfa.get("skipped"):
        print(f"      SKIPPED: {wfa['reason']}")
    else:
        print(f"      Median efficiency: {wfa['median_efficiency']:.4f}")
        print(f"      OOS profitable: {wfa['pct_oos_profitable']*100:.1f}%")
        for w in wfa["windows"]:
            status = "✓" if w["oos"]["net_profit"] > 0 else "✗"
            print(f"      W{w['window']}: IS ${w['is']['net_profit']:,.2f} | OOS ${w['oos']['net_profit']:,.2f} | Eff {w['efficiency_ratio']:.2f} {status}")

    print("[5/5] Building summary...")
    summary = {
        "pass_expectancy": exp["is_positive"],
        "pass_sign_flip": pv["significant_sign_flip_005"],
        "pass_ttest": pv["significant_ttest_005"],
        "pass_ruin": mc["prob_of_ruin"] < 0.05,
        "pass_wfa": wfa["pass_wfa"],
    }
    summary["overall_pass"] = all(summary.values())

    print(f"\nOVERALL: {'PASS' if summary['overall_pass'] else 'FAIL'}")

    return {"schema_version": "3.0","expectancy": exp, "p_value": pv, "monte_carlo": mc, "walk_forward": wfa, "summary": summary}


def main():
    ruin_threshold = None
    if len(sys.argv) >= 2:
        trades = load_trades_from_csv(sys.argv[1])
    else:
        print("No CSV provided — using demo trades.\n")
        trades = generate_demo_trades()

    if len(sys.argv) >= 4:
        try:
            ruin_threshold = float(sys.argv[3])
        except ValueError:
            pass

    results = build_results(trades, ruin_threshold=ruin_threshold)
    out_path = sys.argv[2] if len(sys.argv) >= 3 else "results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults written to: {out_path}")


if __name__ == "__main__":
    main()
