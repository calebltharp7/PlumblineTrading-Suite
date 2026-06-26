"use strict";
/* ═══════════════════════════════════════════════════════════════
   troubleshoot.js — Troubleshoot: templates, generate, copy,
                     download, reset, checklist
   ═══════════════════════════════════════════════════════════════ */

var tsOcrExtractedText = "";

/* ═══════ TS TEMPLATES ═══════ */
document.querySelectorAll("#tsTemplates .pcard").forEach(function(c) {
  c.addEventListener("click", function() {
    document.querySelectorAll("#tsTemplates .pcard").forEach(function(x) { x.classList.remove("act"); });
    c.classList.add("act");
    state.tsType = c.dataset.ts; save();
  });
});

/* ═══════ TS ADVANCED TOGGLE ═══════ */
var tsAdvBtn = document.getElementById("tsAdvBtn");
var tsAdv = document.getElementById("tsAdv");
tsAdvBtn.addEventListener("click", function() {
  var isOpen = tsAdv.classList.toggle("open");
  tsAdvBtn.textContent = isOpen ? "\u25b2 Hide Advanced Fields" : "\u25b6 Show Advanced Fields";
});

/* ═══════ TS ERROR SCREENSHOT + OCR ═══════ */
var tsErrorFileInput = document.getElementById("tsErrorFile");
var tsErrorPreview   = document.getElementById("tsErrorPreview");
var tsErrorImg       = document.getElementById("tsErrorImg");
var tsErrorImgClear  = document.getElementById("tsErrorImgClear");
var tsOcrStatus      = document.getElementById("tsOcrStatus");
var tsErrorTextarea  = document.getElementById("ts_error");

tsErrorFileInput.addEventListener("change", function() {
  var file = tsErrorFileInput.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast("\u26a0\ufe0f Image must be under 5 MB");
    tsErrorFileInput.value = "";
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;

    tsErrorImg.src = dataUrl;
    tsErrorPreview.style.display = "inline-block";

    tsOcrStatus.style.display = "flex";
    tsOcrStatus.className = "ts-ocr-status";
    tsOcrStatus.innerHTML = '<span class="ts-ocr-spinner"></span> Extracting text\u2026';

    Tesseract.recognize(dataUrl, "eng")
      .then(function(result) {
        var text = (result.data.text || "").trim();
        if (text) {
          var current = tsErrorTextarea.value.trim();
          var separator = current ? "\n\n--- Extracted from screenshot ---\n" : "";
          tsErrorTextarea.value = current + separator + text;
          tsOcrExtractedText = text;

          tsOcrStatus.className = "ts-ocr-status done";
          tsOcrStatus.innerHTML = "\u2705 Text extracted and added to field above.";
          showToast("\u2705 Error text extracted!");
        } else {
          tsOcrStatus.className = "ts-ocr-status fail";
          tsOcrStatus.innerHTML = "\u26a0\ufe0f No readable text found. Try a clearer screenshot.";
          showToast("\u26a0\ufe0f No text detected in image");
        }
        setTimeout(function() { tsOcrStatus.style.display = "none"; }, 5000);
      })
      .catch(function(err) {
        tsOcrStatus.className = "ts-ocr-status fail";
        tsOcrStatus.innerHTML = "\u274c OCR failed. You can paste the error manually.";
        showToast("\u274c OCR extraction failed");
        setTimeout(function() { tsOcrStatus.style.display = "none"; }, 5000);
      });
  };
  reader.readAsDataURL(file);
});

tsErrorImgClear.addEventListener("click", function() {
  tsOcrExtractedText = "";
  tsErrorImg.src = "";
  tsErrorPreview.style.display = "none";
  tsOcrStatus.style.display = "none";
  tsErrorFileInput.value = "";
});

/* ═══════ TS GENERATE ═══════ */
document.getElementById("tsGenBtn").addEventListener("click", function() {
  var symptom = (document.getElementById("ts_symptom").value || "").trim();
  if (!symptom) { document.getElementById("tsStatus").textContent = "\u26a0 Describe the symptom first."; return; }
  document.getElementById("tsStatus").textContent = "";
  var type = state.tsType || "compile";
  var p = [];
  p.push("\u2554" + "\u2550".repeat(62) + "\u2557");
  p.push("\u2551 NINJASCRIPT DIAGNOSTIC PROMPT \u2014 " + TS_LABELS[type].toUpperCase().padEnd(26) + "\u2551");
  p.push("\u255a" + "\u2550".repeat(62) + "\u255d");
  p.push("");
  p.push("ISSUE TYPE: " + TS_LABELS[type]);
  p.push("DESCRIPTION: " + TS_DESCS[type]);
  p.push("");
  var fields = [
    ["\ud83d\udd34 Symptom", "ts_symptom"],
    ["\u2705 Expected Behavior", "ts_expected"],
    ["\ud83d\udda5\ufe0f Environment", "ts_env"],
    ["\ud83d\udcdb Error Output", "ts_error"],
    ["\ud83d\udd01 Steps to Reproduce", "ts_steps"],
    ["\ud83d\udce5 Test Input", "ts_testinput"],
    ["\ud83d\udcbb Relevant Code", "ts_code"],
    ["\ud83d\udd04 Recent Changes", "ts_changes"],
    ["\ud83d\udd27 Already Tried", "ts_tried"],
    ["\ud83d\udeab Do Not Change", "ts_donotchange"],
    ["\u26a0\ufe0f Regression Areas", "ts_regression"],
    ["\ud83d\udcdd Other Notes", "ts_notes"]
  ];
  p.push("\u2550".repeat(63));
  p.push("ISSUE DETAILS");
  p.push("\u2550".repeat(63));
  fields.forEach(function(f) {
    var val = (document.getElementById(f[1]) || {}).value || "";
    if (val.trim()) { p.push(f[0] + ":"); p.push(val.trim()); p.push(""); }
  });
  p.push("\u2550".repeat(63));
  p.push("DIAGNOSTIC APPROACH \u2014 FOLLOW THESE STEPS");
  p.push("\u2550".repeat(63));
  p.push("1. REPRODUCE: Recreate the issue using the steps and environment above.");
  p.push("   \u2192 If compile error, verify exact NT8 version and NinjaScript API compatibility.");
  p.push("   \u2192 If runtime, reproduce in Strategy Analyzer or Playback mode.");
  p.push("");
  p.push("2. ISOLATE: Narrow the root cause to a specific event handler or code block.");
  p.push("   \u2192 Check OnBarUpdate, OnExecutionUpdate, OnOrderUpdate, OnStateChange separately.");
  p.push("   \u2192 Use Print() with [StrategyName][Timestamp] prefix to trace execution flow.");
  p.push("   \u2192 Verify BarsInProgress and CurrentBar guards.");
  p.push("");
  p.push("3. IDENTIFY: Determine the exact root cause.");
  p.push("   \u2192 Check for null references (Position, Account, Orders collections).");
  p.push("   \u2192 Verify State == State.Historical vs State.Realtime behavior differences.");
  p.push("   \u2192 Check for missing CurrentBar >= N guards before accessing series[N].");
  p.push("");
  p.push("4. FIX: Apply the minimal, targeted fix.");
  p.push("   \u2192 Do NOT refactor or rewrite unrelated code.");
  p.push("   \u2192 Respect the 'Do Not Change' constraints above.");
  p.push("   \u2192 Present fix in labeled code block: ```csharp // NinjaTrader 8 / path/file.cs```");
  p.push("");
  p.push("5. VERIFY: Confirm the fix resolves the issue without regressions.");
  p.push("   \u2192 Re-run in same environment and verify symptom is gone.");
  p.push("   \u2192 Check regression areas listed above.");
  p.push("   \u2192 Validate no new compiler warnings.");
  p.push("");
  p.push("6. LIMITATIONS: Flag anything that cannot be verified without live execution.");
  p.push('   \u2192 "\u26a0\ufe0f Limitation: [desc]. Recommend: [mitigation]."');
  p.push('   \u2192 If backtest-only, state: "Fix applied \u2014 verify in Market Replay or SIM for live-equivalent confirmation."');
  p.push("");
  p.push("\u2550".repeat(63));
  p.push("END OF DIAGNOSTIC PROMPT");
  p.push("\u2550".repeat(63));
  var text = p.join("\n");
  document.getElementById("tsOutPre").textContent = text;
  document.getElementById("tsTokBadge").textContent = "~" + estTokens(text) + " tokens";
  document.getElementById("tsOutput").classList.add("vis");
  document.getElementById("tsOutput").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ═══════ TS COPY / DOWNLOAD ═══════ */
document.getElementById("tsCopyBtn").addEventListener("click", function() {
  var btn = this;
  navigator.clipboard.writeText(document.getElementById("tsOutPre").textContent).then(function() {
    btn.textContent = "\u2705 Copied!"; btn.classList.add("ok");
    setTimeout(function() { btn.textContent = "\ud83d\udccb Copy"; btn.classList.remove("ok"); }, 2000);
  });
});

document.getElementById("tsDlBtn").addEventListener("click", function() {
  var blob = new Blob([document.getElementById("tsOutPre").textContent], { type: "text/plain" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "NinjaScript_Diagnostic_" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click(); URL.revokeObjectURL(a.href); showToast("\u2b07 Downloaded!");
});

/* ═══════ TS CHECKLIST ═══════ */
document.getElementById("tsClBtn").addEventListener("click", function() {
  var cl = "NinjaScript Troubleshooting Checklist\n\n" +
    "Problem Summary\n- Symptom:\n- Expected Behavior:\n- Environment:\n\n" +
    "Reproduction Data\n- Steps to Reproduce:\n  1.\n  2.\n  3.\n- Test Input / Sample Data:\n- Error Output:\n\n" +
    "Code Context\n- Relevant Code / File Section:\n- Recent Changes:\n- Things Already Tried:\n\n" +
    "Constraints\n- Do Not Change:\n- Regression Areas:\n\nOther Notes:\n";
  navigator.clipboard.writeText(cl).then(function() { showToast("\u2705 Checklist copied!"); });
});

/* ═══════ TS RESET ═══════ */
var tsResetPending = false, tsResetTimer = null;
document.getElementById("tsResetBtn").addEventListener("click", function() {
  var btn = this;
  if (!tsResetPending) {
    tsResetPending = true; btn.textContent = "\u21ba Click again to confirm"; btn.classList.add("cfm");
    tsResetTimer = setTimeout(function() { tsResetPending = false; btn.textContent = "\u21ba Reset"; btn.classList.remove("cfm"); }, 3000);
    return;
  }
  tsResetPending = false; clearTimeout(tsResetTimer); btn.textContent = "\u21ba Reset"; btn.classList.remove("cfm");
  ["ts_symptom", "ts_expected", "ts_env", "ts_error", "ts_steps", "ts_testinput", "ts_code", "ts_changes", "ts_tried", "ts_donotchange", "ts_regression", "ts_notes"].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = "";
  });
  if (document.getElementById("ts_desired")) document.getElementById("ts_desired").value = "diagnose";
  document.querySelectorAll("#tsTemplates .pcard").forEach(function(c) { c.classList.remove("act"); });
  state.tsType = null; save();
  document.getElementById("tsOutput").classList.remove("vis");
  document.getElementById("tsStatus").textContent = "";
    tsOcrExtractedText = "";
  tsErrorImg.src = "";
  tsErrorPreview.style.display = "none";
  tsOcrStatus.style.display = "none";
  tsErrorFileInput.value = "";
  if (tsAdv.classList.contains("open")) { tsAdv.classList.remove("open"); tsAdvBtn.textContent = "\u25b6 Show Advanced Fields"; }
});
