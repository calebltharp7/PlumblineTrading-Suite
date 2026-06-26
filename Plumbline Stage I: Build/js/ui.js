"use strict";
/* ═══════════════════════════════════════════════════════════════
   ui.js — Theme, tabs, toasts, shared rendering, token estimate
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ HELPERS ═══════ */
function showToast(msg) {
  var t = document.getElementById("toastEl");
  t.textContent = msg; t.style.display = "block";
  setTimeout(function() { t.style.display = "none"; }, 2200);
}

function estTokens(s) { return Math.round(s.length / 3.8); }

/* ═══════ THEME ═══════ */
var themeBtn = document.getElementById("themeBtn");
var savedTheme = slg("ns2_theme");
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
  themeBtn.textContent = savedTheme === "dark" ? "\uD83C\uDF19" : "\u2600\uFE0F";
}
themeBtn.addEventListener("click", function() {
  var n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = n; sls("ns2_theme", n);
  themeBtn.textContent = n === "dark" ? "\uD83C\uDF19" : "\u2600\uFE0F";
});

/* ═══════ TABS ═══════ */
function switchTab(id) {
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
  document.querySelectorAll(".tab-panel").forEach(function(p) { p.classList.remove("active"); });
  var btn = document.querySelector('.tab-btn[data-tab="' + id + '"]');
  if (btn) btn.classList.add("active");
  var panel = document.getElementById(id);
  if (panel) panel.classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach(function(b) {
  b.addEventListener("click", function() { switchTab(b.dataset.tab); });
});
document.getElementById("goBuilder").addEventListener("click", function() { switchTab("tab-builder"); });
document.getElementById("goTs").addEventListener("click", function() { switchTab("tab-ts"); });

/* ═══════ RENDER: RULES ═══════ */
var ruleListEl = document.getElementById("ruleList");

function buildRules() {
  ruleListEl.innerHTML = "";
  RULE_TEXTS.forEach(function(txt, i) {
    var li = document.createElement("li");
    li.dataset.rule = i;
    li.className = state.rules[i] ? "sel" : "off";
    li.innerHTML = '<span class="rchk">' + (state.rules[i] ? "\u2713" : "") + "</span>" + txt;
    li.addEventListener("click", function() {
      state.rules[i] = !state.rules[i];
      li.className = state.rules[i] ? "sel" : "off";
      li.querySelector(".rchk").textContent = state.rules[i] ? "\u2713" : "";
      updateRuleCount(); save(); updateTokens();
    });
    ruleListEl.appendChild(li);
  });
  updateRuleCount();
}

function updateRuleCount() {
  var n = state.rules.filter(Boolean).length;
  document.getElementById("ruleCount").textContent = "(" + n + "/14)";
}

function setAllRules(val) {
  state.rules.fill(val);
  ruleListEl.querySelectorAll("li").forEach(function(li, i) {
    li.className = val ? "sel" : "off";
    li.querySelector(".rchk").textContent = val ? "\u2713" : "";
  });
  updateRuleCount(); save(); updateTokens();
}

document.getElementById("selAll").addEventListener("click", function() { setAllRules(true); });
document.getElementById("deselAll").addEventListener("click", function() { setAllRules(false); });

var coreToggle = document.getElementById("coreToggle");
var coreRules = document.getElementById("coreRules");
coreToggle.addEventListener("click", function() {
  var isOpen = coreRules.classList.toggle("open");
  coreToggle.textContent = isOpen ? "\u25B2 Hide Rules" : "\u25BC Show Rules";
});

/* ═══════ RENDER: SCALE ═══════ */
function renderScale() {
  document.querySelectorAll("#scaleGrid .card").forEach(function(c) {
    c.classList.toggle("sel", c.dataset.scale === state.scale);
  });
}
document.querySelectorAll("#scaleGrid .card").forEach(function(c) {
  c.addEventListener("click", function() {
    state.scale = state.scale === c.dataset.scale ? null : c.dataset.scale;
    clearPresetHighlight(); renderScale(); save(); updateTokens();
  });
});

/* ═══════ RENDER: DOMAINS ═══════ */
function renderDomains() {
  document.querySelectorAll("#domainGrid .card").forEach(function(c) {
    c.classList.toggle("sel", state.domains.indexOf(c.dataset.domain) !== -1);
  });
}
document.querySelectorAll("#domainGrid .card").forEach(function(c) {
  c.addEventListener("click", function() {
    var d = c.dataset.domain;
    var idx = state.domains.indexOf(d);
    if (idx === -1) state.domains.push(d); else state.domains.splice(idx, 1);
    clearPresetHighlight(); renderDomains(); save(); updateTokens();
  });
});


/* ═══════ RENDER: STRATEGY TYPE ═══════ */
function renderStrategyType() {
  document.querySelectorAll("#strategyTypeGrid .card").forEach(function(c) {
    c.classList.toggle("sel", c.dataset.strategy === state.strategyType);
  });
}
/* ═══════ RENDER: SESSIONS ═══════ */
function renderSessions() {
  document.querySelectorAll("#sessionGrid .card").forEach(function(c) {
    c.classList.toggle("sel", state.sessions.indexOf(c.dataset.session) !== -1);
  });
}
document.querySelectorAll("#sessionGrid .card").forEach(function(c) {
  c.addEventListener("click", function() {
    var s = c.dataset.session;
    var idx = state.sessions.indexOf(s);
    if (idx === -1) state.sessions.push(s);
    else state.sessions.splice(idx, 1);
    clearPresetHighlight();
    renderSessions();
    save();
    updateTokens();
  });
});

document.querySelectorAll("#strategyTypeGrid .card").forEach(function(c) {
  c.addEventListener("click", function() {
    state.strategyType = state.strategyType === c.dataset.strategy ? null : c.dataset.strategy;
    clearPresetHighlight(); renderStrategyType(); save(); updateTokens();
  });
});

/* ═══════ PRESETS ═══════ */
function applyPreset(key) {
  var p = PRESETS[key]; if (!p) return;
  state.scale = p.scale; state.domains = p.domains.slice(); state.activePreset = key;
  state.rules.fill(true); buildRules(); renderScale(); renderDomains(); renderStrategyType();
  renderSessions();
  document.querySelectorAll("#presetsBar .pcard").forEach(function(c) {
    c.classList.toggle("act", c.dataset.preset === key);
  });
  // Recommended badges
  document.querySelectorAll(".card").forEach(function(c) { c.classList.remove("rec"); });
  var sc = document.querySelector('#scaleGrid .card[data-scale="' + p.scale + '"]');
  if (sc) sc.classList.add("rec");
  p.domains.forEach(function(d) {
    var dc = document.querySelector('#domainGrid .card[data-domain="' + d + '"]');
    if (dc) dc.classList.add("rec");
  });
  save(); updateTokens();
}

function clearPresetHighlight() {
  state.activePreset = null;
  document.querySelectorAll("#presetsBar .pcard").forEach(function(c) { c.classList.remove("act"); });
  document.querySelectorAll(".card").forEach(function(c) { c.classList.remove("rec"); });
}

document.querySelectorAll("#presetsBar .pcard").forEach(function(c) {
  c.addEventListener("click", function() { applyPreset(c.dataset.preset); });
});

document.getElementById("presetClear").addEventListener("click", function() {
  state.scale = null; state.domains = []; state.strategyType = null; state.sessions = []; state.rules.fill(true); state.task = ""; state.activePreset = null;
  document.getElementById("taskInput").value = "";
  document.getElementById("charCount").textContent = "0 characters";
  clearPresetHighlight(); buildRules(); renderScale(); renderDomains(); renderStrategyType(); renderSessions(); save(); updateTokens();
  document.getElementById("bOutput").classList.remove("vis");
  document.getElementById("bStatus").textContent = "";
});

/* ═══════ TASK INPUT ═══════ */
var taskInput = document.getElementById("taskInput");
taskInput.addEventListener("input", function() {
  state.task = taskInput.value;
  document.getElementById("charCount").textContent = taskInput.value.length.toLocaleString() + " characters";
  clearPresetHighlight(); save(); updateTokens();
});

/* ═══════ TOKEN ESTIMATE ═══════ */
function updateTokens() {
  var text = "";
  var activeRules = state.rules.map(function(v, i) { return v ? RULE_TEXTS[i] : null; }).filter(Boolean);
  text += activeRules.join("\n");
  if (state.scale) text += SCALE_TEXTS[state.scale];
  state.domains.forEach(function(d) { text += DOMAIN_TEXTS[d]; });
  if (state.strategyType && STRATEGY_TYPE_TEXTS[state.strategyType]) text += STRATEGY_TYPE_TEXTS[state.strategyType];
  state.sessions.forEach(function(s) { text += SESSION_TEXTS[s]; });
  if (state.task) text += state.task;
  document.getElementById("bTokBadge").textContent = "~" + estTokens(text) + " tokens";
}

/* ═══════ INIT ═══════ */
buildRules();
renderScale();
renderDomains();
renderStrategyType();
renderSessions();
if (state.task) {
  taskInput.value = state.task;
  document.getElementById("charCount").textContent = state.task.length.toLocaleString() + " characters";
}
if (state.activePreset && PRESETS[state.activePreset]) {
  applyPreset(state.activePreset);
}
updateTokens();
