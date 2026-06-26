"use strict";
/* ═══════════════════════════════════════════════════════════════
   builder.js — Prompt Builder: generate, copy, download, reset
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ GENERATE PROMPT ═══════ */
document.getElementById("bGenBtn").addEventListener("click", function() {
  if (!state.scale) {
    document.getElementById("bStatus").textContent = "\u26a0 Select a Scale Profile first.";
    return;
  }
  document.getElementById("bStatus").textContent = "";
  var p = [];
  p.push("\u2554" + "\u2550".repeat(62) + "\u2557");
  p.push("\u2551 NINJASCRIPT AI DEVELOPMENT DIRECTIVE \u2014 PROMPT v2.0        \u2551");
  p.push("\u255a" + "\u2550".repeat(62) + "\u255d");
  p.push("");
  var activeRules = state.rules.map(function(v, i) { return v ? RULE_TEXTS[i] : null; }).filter(Boolean);
  if (activeRules.length) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 1 \u2014 CORE RULES (" + activeRules.length + " of 14 active)");
    p.push("\u2550".repeat(63));
    activeRules.forEach(function(r, i) { p.push((i + 1) + ". " + r); });
    p.push("");
  }
  if (state.scale) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 2 \u2014 SCALE PROFILE");
    p.push("\u2550".repeat(63));
    p.push(SCALE_TEXTS[state.scale]);
    p.push("");
  }
  if (state.domains.length) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 3 \u2014 DOMAIN MODULES (" + state.domains.length + " active)");
    p.push("\u2550".repeat(63));
    state.domains.forEach(function(d) { p.push(DOMAIN_TEXTS[d]); p.push(""); });
  }
  if (state.strategyType) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 4 \u2014 STRATEGY TYPE");
    p.push("\u2550".repeat(63));
    p.push(STRATEGY_TYPE_TEXTS[state.strategyType]);
    p.push("");
  }
  if (state.sessions.length) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 5 \u2014 SESSIONS (" + state.sessions.length + " active)");
    p.push("\u2550".repeat(63));
    state.sessions.forEach(function(s) { p.push(SESSION_TEXTS[s]); p.push(""); });
  }

  if (state.task && state.task.trim()) {
    p.push("\u2550".repeat(63));
    p.push("LAYER 6 \u2014 TASK");
    p.push("\u2550".repeat(63));
    p.push(state.task.trim());
    p.push("");
  }
  if (state.scale && state.scale !== "micro") {
    p.push("\u2550".repeat(63));
    p.push("DELIVERABLES REMINDER");
    p.push("\u2550".repeat(63));
    p.push("\u25c6 Requirements summary \u25c6 Architecture notes \u25c6 Logic map");
    p.push("\u25c6 Working NS code (.cs) \u25c6 Backtest validation \u25c6 Documentation");
    p.push("\u25c6 Risk & order review \u25c6 Deployment notes \u25c6 Assumptions log");
    p.push("");
    p.push("Post-implementation summary: State what was \u2705 Built, \u23ed Skipped, \ud83d\udd1c Next.");
    p.push("");
  }
  p.push("\u2550".repeat(63));
  p.push("END OF DIRECTIVE");
  p.push("\u2550".repeat(63));
  var text = p.join("\n");
  document.getElementById("bOutPre").textContent = text;
  document.getElementById("bTokBadge").textContent = "~" + estTokens(text) + " tokens";
  document.getElementById("bOutput").classList.add("vis");
  document.getElementById("bOutput").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ═══════ COPY / DOWNLOAD ═══════ */
document.getElementById("bCopyBtn").addEventListener("click", function() {
  var btn = this;
  navigator.clipboard.writeText(document.getElementById("bOutPre").textContent).then(function() {
    btn.textContent = "\u2705 Copied!"; btn.classList.add("ok");
    setTimeout(function() { btn.textContent = "\ud83d\udccb Copy"; btn.classList.remove("ok"); }, 2000);
  });
});

document.getElementById("bDlBtn").addEventListener("click", function() {
  var blob = new Blob([document.getElementById("bOutPre").textContent], { type: "text/plain" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "NinjaScript_Prompt_" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click(); URL.revokeObjectURL(a.href); showToast("\u2b07 Downloaded!");
});

/* ═══════ RESET ═══════ */
var bResetPending = false, bResetTimer = null;
document.getElementById("bResetBtn").addEventListener("click", function() {
  var btn = this;
  if (!bResetPending) {
    bResetPending = true; btn.textContent = "\u21ba Click again to confirm"; btn.classList.add("cfm");
    bResetTimer = setTimeout(function() { bResetPending = false; btn.textContent = "\u21ba Reset"; btn.classList.remove("cfm"); }, 3000);
    return;
  }
  bResetPending = false; clearTimeout(bResetTimer); btn.textContent = "\u21ba Reset"; btn.classList.remove("cfm");
  state.scale = null; state.domains = []; state.strategyType = null; state.sessions = []; state.rules.fill(true); state.task = ""; state.activePreset = null;
  taskInput.value = ""; document.getElementById("charCount").textContent = "0 characters";
  clearPresetHighlight(); buildRules(); renderScale(); renderDomains(); renderStrategyType(); renderSessions(); save(); updateTokens();
  document.getElementById("bOutput").classList.remove("vis");
  document.getElementById("bStatus").textContent = "";
});
