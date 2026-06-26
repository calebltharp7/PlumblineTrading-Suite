# Backtest Validator

https://img.shields.io/badge/version-5.1-blue
https://img.shields.io/badge/license-MIT-green
https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white
https://img.shields.io/badge/a11y-WCAG_2.1-purple

> **Subproject of the [StratValidator-Suite](../) repository.** This dashboard is one component of a broader strategy-validation toolkit.

## Overview

A **single-file HTML dashboard** for validating NinjaTrader 8 (NT8) strategy back-test results. It accepts **two input formats**:

- **`results.json`** — pre-computed by the Python engine (`sign_flip_engine_nt8_v3.py`)
- **`trades.csv`** — raw NinjaTrader Strategy Analyzer export (analyzed client-side by the built-in JavaScript engine)

Drop either file onto the page and instantly see:

- **Positive Expectancy** (Curtis Faith formula)
- **Statistical Significance** (sign-flip permutation + t-test)
- **Monte Carlo** stress-test (bootstrap equity-curve resampling)
- **Walk-Forward Analysis** (anchored OOS validation)
- **Building Robust Strategies** (collapsible practical guide)

The dashboard renders a dark "comfort" theme optimized for extended screen time, with full **export** (PDF / PNG / clipboard), **ARIA accessibility**, and a **configurable ruin threshold** so you can match your prop firm's max drawdown limit.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Input Sources                            │
│                                                              │
│   ┌─────────────────────┐    ┌───────────────────────────┐   │
│   │   trades.csv        │    │   results.json            │   │
│   │   (raw NT8 export)  │    │   (Python engine output)  │   │
│   └─────────┬───────────┘    └─────────────┬─────────────┘   │
│             │                              │                 │
│             ▼                              │                 │
│   ┌─────────────────────┐                  │                 │
│   │ sign_flip_engine.js │                  │                 │
│   │ (client-side stats) │──► results.json ─┤                 │
│   └─────────────────────┘                  │                 │
└──────────────────────────────────┬─────────┘─────────────────┘
                                   │  drag-and-drop / file browse
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                       index.html                             │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ 01       │ │ 02       │ │ 03       │ │ 04       │ │ 05  │ │
│  │ Positive │ │ P-Value  │ │ Monte    │ │ Walk     │ │ Ro- │ │
│  │ Expect.  │ │ Analysis │ │ Carlo    │ │ Forward  │ │ bust│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Ruin Threshold Config                               │    │
│  │  Set to match your prop firm's max drawdown limit    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Export Toolbar                                      │    │
│  │  [📄 PDF]   [📸 PNG]   [📋 Copy Summary]             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  UX Layer                                            │    │
│  │  • Inline notification banners (error/warn/info)     │    │
│  │  • Loading overlay with phase-status spinner         │    │
│  │  • Accessibility: skip link, ARIA, keyboard nav      │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                   │
                   ▼
         ┌───────────────────────┐
         │      Output           │
         │  • Browser viewport   │
         │  • PDF (print)        │
         │  • PNG (html2canvas)  │
         │  • Clipboard text     │
         └───────────────────────┘
```

---

## Features

| Category | Details |
|---|---|
| **Dual Input** | Accepts pre-computed `results.json` (from Python engine) or raw `trades.csv` (analyzed client-side) |
| **Expectancy** | Per-trade & per-dollar expectancy, win rate, W/L ratio |
| **P-Value** | Sign-flip permutation (primary) + one-sample t-test (secondary) |
| **Monte Carlo** | Drawdown profiles, probability of ruin, Sharpe ratio |
| **Walk-Forward** | Anchored windows, IS/OOS bars, efficiency badges |
| **Robustness Guide** | Collapsible 8-card practical guide covering parameter sensitivity, degrees of freedom, OOS discipline, regime diversity, equity-curve illusion, and overfitting red flags |
| **Ruin Threshold Config** | User-configurable max drawdown threshold — set to match your prop firm's limit (e.g. $2,500 / $3,000 / $5,000) or leave blank for automatic 95th-percentile calculation |
| **Export** | PDF via `window.print()`, PNG via `html2canvas`, plain-text clipboard copy |
| **Notifications** | Inline banners (error / warn / info) with dismiss button and auto-timeout — no `alert()` dialogs |
| **Loading Overlay** | Full-screen spinner with 4-phase status: Parse → Test → Render → Complete |
| **SRI Integrity** | `sha512` Subresource Integrity hashes on both CDN scripts (cdnjs primary + jsdelivr fallback) |
| **CDN Failover** | Automatic jsdelivr fallback if cdnjs fails; graceful degradation if both fail (PNG export disabled, dashboard still works) |
| **Favicon** | Inline SVG bar-chart icon — zero external image files |
| **Accessibility** | WCAG 2.1 compliant: skip link, ARIA roles/labels, keyboard nav, focus outlines |
| **Print Stylesheet** | Preserves dark theme for PDF export with `print-color-adjust` |
| **Schema Warnings** | Auto-detects missing or unrecognized `schema_version` |

---

## Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Edge 90+, Safari 15+)
- **One** of:
  - A `results.json` file generated by the Python engine (schema v3.0)
  - A `trades.csv` file exported from NinjaTrader's Strategy Analyzer
- *(Optional)* Internet connection for `html2canvas` CDN (PNG export only; PDF and clipboard work offline)
- *(Optional)* Python 3.10+ with `numpy ≥ 1.24` and `scipy ≥ 1.10` — only needed if you want to run the Python engine (`sign_flip_engine_nt8_v3.py`) to pre-compute `results.json`

---

## Setup & Installation

### 1. Clone the Parent Repo

```bash
git clone https://github.com/calebltharp7/StratValidator-Suite.git
cd StratValidator-Suite/2_StratValidator_Backtest_Validator
```

Or download the repo as a ZIP and navigate into the `2_StratValidator_Backtest_Validator/` subfolder.

### 2. (Optional) Install Python Dependencies

Only required if you want to run the Python engine to pre-compute `results.json`:

```bash
pip install -r requirements.txt
python sign_flip_engine_nt8_v3.py trades.csv
```

### 3. Open in Browser

```bash
# Simply open the file:
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

No build step, no server, no framework dependencies. The dashboard uses your operating system's default sans-serif and monospace fonts for rendering.

---

## Usage

### Loading Data

1. **(Optional)** Enter your prop firm's max drawdown limit in the **Ruin Threshold** field (e.g. `3000`). Leave blank for automatic 95th-percentile calculation.
2. **Drag & drop** your `results.json` or `trades.csv` file onto the drop zone.
3. Or click **Browse** and select the file.
4. The dashboard will parse, validate, and render all five analysis sections.
   - For CSV files, the built-in JavaScript engine runs all statistical tests client-side (typically 2–10 seconds depending on trade count and your hardware; 10,000 permutations is the default).

### Exporting

| Button | Action |
|---|---|
| 📄 **Export PDF** | Opens the browser print dialog with a clean print stylesheet that preserves the dark theme |
| 📸 **Export PNG** | Captures the dashboard at 2× resolution and downloads `strategy-report.png` |
| 📋 **Copy Summary** | Copies a plain-text summary of all test results to your clipboard |

### Keyboard Navigation

- **Tab** / **Shift+Tab** — Move between interactive elements
- **Enter** / **Space** on the drop zone — Opens the file browser
- **Skip to main content** link — Press **Tab** on page load to reveal and activate
- All metrics, test chips, and WFA cards are keyboard-focusable

---

## JSON Schema (v3.0)

Your `results.json` must conform to the following top-level structure:

```json
{
  "schema_version": "3.0",
  "expectancy": {
    "expectancy_per_trade": 0.85,
    "expectancy_per_dollar": 0.035,
    "win_rate": 0.51,
    "loss_rate": 0.48,
    "avg_win": 24.7,
    "avg_loss": 24.6,
    "win_loss_ratio": 1.00,
    "total_trades": 1951,
    "is_positive": true
  },
  "p_value": {
    "observed_net_profit": 1658.5,
    "p_value_sign_flip": 0.032,
    "p_value_ttest": 0.041,
    "t_statistic": 1.74,
    "n_permutations": 10000,
    "significant_sign_flip_005": true,
    "significant_ttest_005": true
  },
  "monte_carlo": {
    "net_profit_median": 1658.5,
    "max_drawdown_95pct": 1982.6,
    "prob_of_ruin": 0.05,
    "ruin_threshold": 1982.6,
    "ruin_source": "auto_95pct",
    "observed_net_profit": 1658.5,
    "observed_max_drawdown": 1204.0,
    "observed_sharpe": 0.035
  },
  "walk_forward": {
    "skipped": false,
    "n_windows": 5,
    "fold_size": 325,
    "windows": [ ... ],
    "median_efficiency": 0.64,
    "pct_oos_profitable": 0.80,
    "pass_wfa": true
  },
  "summary": {
    "pass_expectancy": true,
    "pass_sign_flip": true,
    "pass_ttest": true,
