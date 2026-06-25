# StratValidator-Suite
Prompt Building Validation, Trading Backtest Validation, Portfolio Validation
> Statistical validation tools for trading strategies. [github.com/calebltharp7/StratValidator-Suite](https://github.com/calebltharp7/StratValidator-Suite)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0--beta-orange.svg)](https://github.com/calebltharp7/StratValidator-Suite/releases)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![JavaScript](https://img.shields.io/badge/javascript-ES2020%2B-yellow.svg)](https://developer.mozilla.org/)
[![Status: Beta](https://img.shields.io/badge/status-beta-yellow.svg)](#roadmap)

A free, open-source toolkit to test whether your backtest is real, your portfolio is balanced, and your strategy can survive the conditions that kill most retail traders.

Runs locally. No signup. No telemetry. No data leaves your machine.

<!-- Add screenshot or demo GIF here once available -->
<!-- ![StratValidator demo](docs/images/demo.png) -->

---

## What's in this repo

Three small, focused tools. Each addresses a specific failure mode in retail strategy development.

| Tool | Purpose |
|---|---|
| **Prompt Builder** | Structured strategy specification — turn vague trading ideas into testable, repeatable strategy definitions. |
| **Backtest Validator** | Sign-flip permutation, Monte Carlo bootstrap, and walk-forward analysis to detect overfitting in your strategy results. |
| **Portfolio Analyzer** | Correlation analysis, drawdown stacking, and risk exposure modeling across multiple strategies. |


Together they form a complete pre-deployment validation workflow.

---

## Why this exists

Most retail backtests are overfit. A strategy that looks profitable across years of historical data often performs that way for one reason: it was tuned, by hand or by optimizer, to match the noise in the sample. When deployed forward, the edge disappears.

The statistical methods used by institutional quants to detect this — permutation testing, Monte Carlo resampling, walk-forward validation — are well-documented in the academic literature but rarely applied in retail workflows. The math is straightforward. The tooling was missing.

StratValidator is an attempt to close that gap. It is not a trading platform. It is not a signal service. It is a set of small, focused tools that answer one question:

> Given the trades I observed, how confident should I be that the underlying strategy has a real edge?

---

## Quick start

### Option 1 — Run in the browser (no install)

Several tools ship as self-contained HTML files. Clone the repo and open them directly.

```bash
git clone https://github.com/calebltharp7/StratValidator-Suite.git
cd StratValidator-Suite
```

Then open any of the following in your browser:

```
tools/prompt-builder/index.html
tools/backtest-validator/index.html
tools/portfolio-analyzer/index.html
```

Drag a CSV of your trades onto the page. Results render locally.

### Option 2 — Run the Python tools

For the scripted analysis pipeline:

```bash
git clone https://github.com/calebltharp7/StratValidator-Suite.git
cd StratValidator-Suite
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run the validator against a trades CSV:

```bash
python -m stratvalidator.backtest_validator --input your_trades.csv
```

See `docs/` for the expected CSV schema and command-line options.

---

## Methodology

The Backtest Validator applies three independent statistical tests. Passing one is not enough. A strategy that fails any of them is flagged for further investigation.

### Sign-Flip Permutation

Randomly flips the sign of each trade's P&L thousands of times to estimate the distribution of outcomes under a null hypothesis of no edge. If the observed result is not significantly above the null distribution, the apparent edge may be noise.

The reported p-value is the proportion of permuted samples that match or exceed the observed result. By convention, p < 0.05 is considered statistically significant. Higher p-values indicate the edge could plausibly arise from random variation.

### Monte Carlo Bootstrap

Resamples the trade sequence with replacement to estimate the range of plausible equity curves and worst-case drawdowns. Reveals sequence risk and stress-tests the strategy against orderings that did not appear in the original backtest.

The reported probability of ruin is the fraction of resampled paths in which equity falls below a defined threshold (default: 95th percentile of observed max drawdown).

### Walk-Forward Analysis

Splits the data into rolling in-sample and out-of-sample windows. A strategy that performs well in-sample but poorly out-of-sample is almost always overfit. The efficiency ratio between the two windows is the headline metric.

An efficiency ratio above 0.5 is generally considered acceptable. Below 0.3 suggests significant overfitting.

---

## Example output

A strategy with strong-looking surface metrics that fails statistical validation. The kind of result that is easy to miss when only watching win rate and profit factor.

```
backtest-validator . example.csv

Surface metrics
---------------
Total trades                    248
Win rate                        62.1%
Profit factor                   1.84
Net profit                      $4,210

Statistical validation
----------------------
Sign-flip permutation p-value   0.23      [WARN]
Monte Carlo probability of ruin 18.4%     [FAIL]
Walk-forward efficiency ratio   0.31      [FAIL]

Verdict: FAIL
The observed result is not statistically distinguishable from chance
(p > 0.05). Monte Carlo simulation shows an 18.4% probability of
catastrophic drawdown under realistic trade reordering. Out-of-sample
performance is 31% of in-sample, a signature of overfitting.

Do not deploy.
```

The surface metrics look fine. The strategy fails anyway. That gap is the entire reason this toolkit exists.

---

## What this toolkit does NOT do

Clarity matters more than marketing. These tools are useful for one specific thing. They are not a substitute for the other parts of a trading practice.

- This is **not financial advice**. Nothing here is a recommendation to enter, exit, or hold any position.
- This is **not a trading platform**. It does not place orders, connect to brokers, or stream market data.
- This is **not a signal service**. It does not tell you what to trade or when to trade it.
- This does **not guarantee profitability**. A strategy that passes validation can still lose money in live markets.
- This does **not replace risk management**. Position sizing, stop discipline, and capital preservation are still your responsibility.
- This does **not eliminate the need for judgment**. Statistics are inputs to a decision, not the decision itself.

If a tool ever claims otherwise, do not trust it.

---

## Roadmap

Honest accounting of the current state. The shipped tools are usable today. Everything else is work in progress, no guarantees on timing.

| Status | Item | Notes |
|---|---|---|
| Shipped | **Prompt Builder** | Structured strategy specification for repeatable testing |
| Shipped | **Backtest Validator** | Sign-flip permutation, Monte Carlo bootstrap, walk-forward analysis |
| Shipped | **Portfolio Analyzer** | Correlation, drawdown stacking, allocation review |
| In Progress | **Deflated Sharpe Ratio** | Selection-bias-adjusted Sharpe per Bailey & Lopez de Prado |
| In Progress | **Combinatorially Purged Cross-Validation** | CPCV for time-series-aware validation |
| Planned | **Regime detection** | Tag drawdown periods by market regime for context-aware evaluation |
| Planned | **PropFirm Validator** | Simulation of real prop firm rule sets against strategy results. In development, not yet released. |

If you have feedback on priorities, open an issue.

---

## Contributing

Contributions, bug reports, and methodology critiques are welcome.

- **Found a bug?** [Open an issue](https://github.com/calebltharp7/StratValidator-Suite/issues) with reproduction steps.
- **Have a methodology improvement?** Open an issue with citations. Statistical correctness matters more than feature count here.
- **Want to add a tool?** Start a [discussion](https://github.com/calebltharp7/StratValidator-Suite/discussions) before submitting a PR. Scope alignment matters.

Code style follows standard conventions for each language. New statistical methods require references to peer-reviewed sources or recognized practitioner texts.

---

## License

Released under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 Caleb Tharp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
```

Free to use, fork, and modify. Attribution appreciated.

---

## Further reading

The methodology in this toolkit draws on established quantitative finance literature. If you want to go deeper:

- Lopez de Prado, M. (2018). *Advances in Financial Machine Learning*. Wiley.
- Bailey, D. H., & Lopez de Prado, M. (2014). The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting, and Non-Normality. *Journal of Portfolio Management*, 40(5), 94-107.
- Bailey, D. H., Borwein, J. M., Lopez de Prado, M., & Zhu, Q. J. (2014). Pseudo-Mathematics and Financial Charlatanism: The Effects of Backtest Overfitting on Out-of-Sample Performance. *Notices of the American Mathematical Society*, 61(5), 458-471.
- Aronson, D. R. (2007). *Evidence-Based Technical Analysis*. Wiley.
- Pardo, R. (2008). *The Evaluation and Optimization of Trading Strategies* (2nd ed.). Wiley.

---

## Maintainer

Maintained by **Caleb Tharp** ([GitHub](https://github.com/calebltharp7)).

For questions, methodology discussions, or collaboration inquiries: [open an issue](https://github.com/calebltharp7/StratValidator-Suite/issues) on this repo. That keeps the conversation public and useful for others reading along.

---

<sub>Built on the principle that honest tools serve traders better than confident ones. If the math says fail, the tool should say fail. No exceptions.</sub>

