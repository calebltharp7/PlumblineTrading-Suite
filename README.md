## Plumbline Trading Suite

Statistical validation tools for trading strategies. [github.com/calebltharp7/PlumblineTrading-Suite](https://github.com/calebltharp7/PlumblineTrading-Suite)

[License: MIT](https://opensource.org/licenses/MIT) · [Version](https://github.com/calebltharp7/PlumblineTrading-Suite/releases) · [JavaScript](https://developer.mozilla.org/) · [Status: Beta](#roadmap)

A free, open-source toolkit to test whether your backtest is real, your portfolio is balanced, and your strategy can survive the conditions that kill most retail traders.

Runs locally. No signup. No telemetry. No data leaves your machine.

---

### What's in this repo

Two live tools today, more planned. Each addresses a specific failure mode in retail strategy development.

| Tool | Folder | Status | Purpose |
|---|---|---|---|
| **Plumbline Stage I: Build** | `01_Build/` | Live | Structured strategy specification — turn vague trading ideas into testable, repeatable strategy definitions. |
| **Plumbline Stage II: Backtest Verification** | `02_Backtest_Verification/` | Live | Sign-flip permutation, Monte Carlo bootstrap, and walk-forward analysis to detect overfitting in your strategy results. |
| **Plumbline Stage III: Portfolio Analysis** | _(coming soon)_ | Planned | Correlation analysis, drawdown stacking, and risk exposure modeling across multiple strategies. |
| **Plumbline Stage IV: PropFirm Validator** | _(coming soon)_ | Planned | Simulation of real prop firm rule sets against strategy results. |

Together they form a complete pre-deployment validation workflow.

---

### Why this exists

Most retail backtests are overfit. A strategy that looks profitable across years of historical data often performs that way for one reason: it was tuned, by hand or by optimizer, to match the noise in the sample. When deployed forward, the edge disappears.

The statistical methods used by institutional quants to detect this — permutation testing, Monte Carlo resampling, walk-forward validation — are well-documented in the academic literature but rarely applied in retail workflows. The math is straightforward. The tooling was missing.

Plumbline Trading Suite is an attempt to close that gap. It is not a trading platform. It is not a signal service. It is a set of small, focused tools that answer one question:

> Given the trades I observed, how confident should I be that the underlying strategy has a real edge?

---

### Quick start

Both shipped tools run entirely in the browser. No install required, no Python, no dependencies.

#### Option 1 — Use the live site (easiest)

Visit the hosted version:

- **Stage I: Build** → [calebltharp7.github.io/PlumblineTrading-Suite/01_Build/](https://calebltharp7.github.io/PlumblineTrading-Suite/01_Build/)
- **Stage II: Backtest Verification** → [calebltharp7.github.io/PlumblineTrading-Suite/02_Backtest_Verification/](https://calebltharp7.github.io/PlumblineTrading-Suite/02_Backtest_Verification/)

Drag a CSV of your trades onto the page. Results render locally in your browser — nothing is uploaded.

#### Option 2 — Run locally (clone the repo)

```bash
git clone https://github.com/calebltharp7/PlumblineTrading-Suite.git
cd PlumblineTrading-Suite