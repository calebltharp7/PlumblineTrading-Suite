"use strict";
/* ═══════════════════════════════════════════════════════════════
   state.js — State management + localStorage helpers
   ═══════════════════════════════════════════════════════════════ */

function sls(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
function slg(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }
function slr(k) { try { localStorage.removeItem(k); } catch(e) {} }

/* Central state object */
var state = {
  rules: Array(14).fill(true),
  scale: null,
  domains: [],
  task: "",
  tsType: null,
  strategyType: null,
  sessions: [],
  activePreset: null
};

/* Load persisted state */
try {
  var ss = JSON.parse(slg("ns2_state"));
  if (ss) { for (var k in ss) state[k] = ss[k]; }
} catch(e) {}

/* Migrate legacy "backtest" domain key → "evaluation" */
var _bIdx = state.domains.indexOf("backtest");
if (_bIdx !== -1) { state.domains.splice(_bIdx, 1, "evaluation"); save(); }
if (!Array.isArray(state.sessions)) { state.sessions = []; }

function save() { sls("ns2_state", JSON.stringify(state)); }
