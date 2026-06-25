# NinjaScript Dev Directive — Prompt Builder v2.0

> A zero-dependency, client-side web tool that assembles **production-grade, layered prompts** for AI-assisted **NinjaTrader 8 / NinjaScript** development.

🔗 **Live Demo:** https://calebltharp7.github.io/StratValidator-Suite/

Select your core rules, scale profile, domain modules, strategy type, and sessions — describe your task — and the builder produces a structured, copy-paste-ready prompt for any LLM (Claude, ChatGPT, Copilot, etc.). A second mode generates **disciplined diagnostic prompts** for troubleshooting compile errors, backtest discrepancies, fill issues, and more.

---

## ✨ Features

### 🛠️ Prompt Builder
- **3 workflow presets** — Strategy Builder, Indicator Builder, Prop Firm Strategy.
- **14 Core Rules** (toggleable, on by default) governing assumptions, scope lock, API hallucination guards, priority hierarchy, NS conventions, and more.
- **4 Scale Profiles** — Micro, Small, Medium, Large — each with appropriate documentation and validation expectations.
- **7 Domain Modules** — Execution & Orders, Risk Management, Indicators & Signals, Evaluation Standards, Performance, Session & Timing, Multi-Timeframe.
- **4 Strategy Types** — Mean Reversion, Trend Following, Breakout, Scalping.
- **3 Session Filters** — Asia, London, New York.
- **Live token estimate** so you can right-size your prompt.
- **One-click copy or download** as `.txt`.

### 🔍 Review & Troubleshoot
- **6 issue templates** — Compile Error, Backtest Discrepancy, Live vs Sim Divergence, Order / Fill Issue, Indicator Bug, Performance / Lag.
- **Structured diagnostic prompt** enforcing the discipline: **Reproduce → Isolate → Identify → Fix → Verify → Limitations**.
- **Screenshot upload with OCR** (via Tesseract.js) — drop an error screenshot, auto-extract text into the error field.
- **Optional advanced fields** — code snippets, recent changes, things already tried, do-not-change constraints, regression areas.
- **Copy-paste checklist** for organizing issue reports.

### 🎨 UX
- Dark / light theme toggle (persisted).
- All state persisted in `localStorage` — refresh-safe.
- Fully responsive (desktop, tablet, mobile).
- No build step, no framework, no tracking.

---

## 🚀 Quick Start

### Option 1 — Try it online
Open the live demo: **https://calebltharp7.github.io/StratValidator-Suite/**

### Option 2 — Run locally
```bash
git clone https://github.com/calebltharp7/StratValidator-Suite.git
cd StratValidator-Suite
# Open directly:
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

### Option 3 — Serve locally (recommended; needed for OCR on some browsers)
```bash
# Python
python -m http.server 8080
# Node
npx serve .
```
Then visit `http://localhost:8080`.

### Option 4 — Deploy your own copy
Drop the repo onto any static host — **GitHub Pages**, **Cloudflare Pages**, **Netlify**, **Vercel** — no configuration needed.

---

## 📂 Project Structure

```
.
├── index.html              # Single-page app shell + UI markup
├── css/
│   └── app.css             # Theming, layout, components
└── js/
    ├── data.js             # Pure data: rules, scale, domains, strategy types, sessions, presets
    ├── state.js            # Central state + localStorage persistence
    ├── ui.js               # Theme, tabs, rendering, token estimate, preset wiring
    ├── builder.js          # Prompt Builder: generate, copy, download, reset
    └── troubleshoot.js     # Troubleshoot mode: templates, OCR, generate, checklist
```

External dependency (loaded via CDN, only on the Troubleshoot tab):
- [Tesseract.js](https://github.com/naptha/tesseract.js) — for client-side OCR of error screenshots.

---

## 🧠 How It Works

The builder assembles your selections into a **layered prompt**:

```
LAYER 1 — Core Rules (N of 14 active)
LAYER 2 — Scale Profile
LAYER 3 — Domain Modules (N active)
LAYER 4 — Strategy Type
LAYER 5 — Sessions (N active)
LAYER 6 — Task / Request
DELIVERABLES REMINDER   (auto-included for Small / Medium / Large scale)
```

Paste the output into the LLM of your choice and let it write NinjaScript with the right constraints, conventions, and validation discipline baked in.

---

## 🧩 Workflow Presets

| Preset             | Scale  | Domains                                              |
|--------------------|--------|------------------------------------------------------|
| Strategy Builder   | Small  | Execution, Risk, Evaluation                          |
| Indicator Builder  | Micro  | Indicators, Performance                              |
| Prop Firm Strategy | Medium | Execution, Risk, Session, Evaluation                 |

Each preset auto-configures scale + domains, marks recommended cards, and re-enables all 14 Core Rules.

---

## ⚠️ Disclaimer

This tool generates **prompts only**. It does **not** guarantee that any AI-generated NinjaScript code is correct, complete, safe, or production-ready.

**Always**:
- Review generated code line-by-line.
- Test in **Strategy Analyzer** and **Market Replay / SIM** before live deployment.
- Validate against the official [NinjaTrader 8 Help Guide](https://ninjatrader.com/support/helpGuides/nt8/).
- Never trade live capital — or prop firm evaluations — with unverified code.

Trading futures, forex, and other leveraged instruments involves substantial risk of loss.

---

## 🛣️ Roadmap Ideas

- Additional domain modules (Market Internals, Volume Profile, Options).
- Custom preset save/export.
- Prompt history & favorites.
- Optional preset JSON import/export for team sharing.

PRs welcome.

---

## 🤝 Contributing

1. Fork the repo: https://github.com/calebltharp7/StratValidator-Suite
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Keep changes scoped — no framework introductions, no build step.
4. Test in both dark and light themes, desktop + mobile widths.
5. Open a PR with a clear description and screenshots if UI-affecting.

---

## 📄 License

This subproject is part of the **StratValidator Suite** and is licensed under the same terms as the parent repository. See the root [`LICENSE`](../LICENSE) file for details.

---

## 👤 Author

Framework and tool by **Caleb Tharp**.

Based on the **NinjaScript AI Development Directive v2.0** — a prompt framework designed for AI-assisted NinjaTrader 8 development.
