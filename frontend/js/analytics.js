/**
 * ============================================================================
 * EDUMETRICS AI — DEDICATED ANALYTICS & LONGITUDINAL INTELLIGENCE (analytics.js)
 * Dual Chart Engine with Strict User-Isolation & Zero-State Initial Experience
 * ============================================================================
 */

// Global state repository
window.__edumetricsPredictionHistory = window.__edumetricsPredictionHistory || [];
window.__proCognitiveChartInstance = null;

// Modal helper: open
window.showAnalyticsModal = function(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("active");
  modalEl.style.removeProperty("display");
  modalEl.style.setProperty("display", "flex", "important");
  modalEl.style.setProperty("opacity", "1", "important");
  modalEl.style.setProperty("visibility", "visible", "important");
  modalEl.style.setProperty("pointer-events", "auto", "important");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

// Modal helper: close
window.hideAnalyticsModal = function(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("active");
  modalEl.style.removeProperty("display");
  modalEl.style.setProperty("display", "none", "important");
  modalEl.style.setProperty("opacity", "0", "important");
  modalEl.style.setProperty("visibility", "hidden", "important");
  modalEl.style.setProperty("pointer-events", "none", "important");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

// Close all open modals
window.closeAllAnalyticsModals = function() {
  document.querySelectorAll(".modal-backdrop").forEach(m => window.hideAnalyticsModal(m));
};

// Universal helper to find a history record by ID strictly for current user
window.findAnalyticsHistoryItem = function(id) {
  if (!id) return null;
  const targetId = String(id).trim().toLowerCase();
  
  // 1. Check in-memory list
  const inMemory = (window.__edumetricsPredictionHistory || []).find(
    (h) => String(h.id || "").trim().toLowerCase() === targetId
  );
  if (inMemory) return inMemory;

  // 2. Check user-isolated localStorage
  const user = window.authClient ? window.authClient.getUser() : null;
  if (user?.id) {
    try {
      const raw = localStorage.getItem(`edumetrics_prediction_history_v2_${user.id}`) || localStorage.getItem(`edumetrics_prediction_history_${user.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const match = parsed.find(
            (h) => String(h.id || "").trim().toLowerCase() === targetId
          );
          if (match) return match;
        }
      }
    } catch(e) {}
  }
  return null;
};

// Formatter for diagnostic payload parameters
function formatDiagnosticParam(k, v) {
  if (v === null || v === undefined) return "N/A";
  if (k === "subjects" || Array.isArray(v)) {
    if (Array.isArray(v)) {
      if (v.length === 0) return "No coursework listed";
      return v
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const name = item.name || item.subject || "Subject";
            const obtained = item.obtained !== undefined ? item.obtained : item.marks !== undefined ? item.marks : "";
            const total = item.total !== undefined ? item.total : 100;
            return obtained !== "" ? `${name} (${obtained}/${total})` : name;
          }
          return String(item);
        })
        .join(", ");
    }
  }
  if (typeof v === "object" && v !== null) {
    return Object.entries(v)
      .map(([subK, subV]) => `${subK.replace(/_/g, " ")}: ${subV}`)
      .join(", ");
  }
  return String(v);
}
window.formatDiagnosticParam = formatDiagnosticParam;

document.addEventListener("DOMContentLoaded", async () => {
  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION & ROLE SAFEGUARD
  // --------------------------------------------------------------------------
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = window.authClient ? window.authClient.getUser() : null;
  const userMeta = currentUser?.user_metadata || {};
  if (userMeta.role === "teacher") {
    window.location.href = "teacher-analytics.html";
    return;
  }

  // Set Chart.js universal font to Inter
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  // --------------------------------------------------------------------------
  // 2. DOM ELEMENT REFERENCES
  // --------------------------------------------------------------------------
  const logoutBtn = document.getElementById("logout-btn");

  // Summary KPI DOMs
  const kpiTotalEvaluations = document.getElementById("kpi-total-evaluations");
  const kpiLatestScore = document.getElementById("kpi-latest-score");
  const kpiLatestBadge = document.getElementById("kpi-latest-badge");
  const kpiGrowthDelta = document.getElementById("kpi-growth-delta");



  // Ledger DOMs
  const ledgerTableBody = document.getElementById("analytics-ledger-body");
  const filterLedgerStage = document.getElementById("filter-ledger-stage");
  const filterLedgerRole = document.getElementById("filter-ledger-role");
  const btnClearAllHistory = document.getElementById("btn-clear-all-history");

  // Chart 1 Controls
  let progressionChart = null;
  let currentChartMode = "line"; // "line" | "bar"
  const btnChartModeLine = document.getElementById("btn-chart-mode-line");
  const btnChartModeBar = document.getElementById("btn-chart-mode-bar");

  // Chart 2 PRO DOMs
  const proCard = document.getElementById("pro-analytics-chart-card");
  const btnUnlockProOverlay = document.getElementById("btn-unlock-pro-overlay");
  const proUpgradeModal = document.getElementById("pro-upgrade-modal");
  const btnCloseProModal = document.getElementById("btn-close-pro-modal");
  const btnCancelProModal = document.getElementById("btn-cancel-pro-modal");
  const btnConfirmProUpgrade = document.getElementById("btn-confirm-pro-upgrade");

  let predictionHistory = [];
  let currentStageFilter = "all";
  let currentRoleFilter = "all";

  // --------------------------------------------------------------------------
  // 3. TOAST NOTIFICATION UTILITY
  // --------------------------------------------------------------------------
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "warning" || type === "lock" ? "🔒" : type === "success" ? "✓" : "ℹ️";
    const title = type === "warning" || type === "lock" ? "Pro Upgrade Required" : type === "success" ? "Success" : "Notification";
    toast.innerHTML = `
      <div class="toast-icon-wrap" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;margin-right:10px;font-size:14px;background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);">${icon}</div>
      <div class="toast-msg-content" style="flex:1;">
        <div class="toast-msg-title" style="font-size:11.5px;font-weight:800;color:#f59e0b;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:2px;">${title}</div>
        <div class="toast-msg-body" style="font-size:12.5px;color:#f1f5f9;line-height:1.4;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:18px;margin-left:8px;">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
  }
  window.showToast = showToast;

  // --------------------------------------------------------------------------
  // 4. USER PROFILE & AVATAR SYNCHRONIZATION
  // --------------------------------------------------------------------------
  function syncUserProfile() {
    const user = window.authClient ? window.authClient.getUser() : null;
    const meta = user?.user_metadata || {};
    const displayName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Muhammad Ali");
    const idCode = (user?.id && (user.id.startsWith("STU-") || user.id.startsWith("TCH-")))
      ? user.id
      : (meta.student_id || meta.id_code || (meta.role === "teacher" ? "TCH-01" : "STU-01"));

    // Set Name & ID Code
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");
    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentIdCodeEl) studentIdCodeEl.innerText = idCode;

    // Set Avatar Initials
    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

    const avatarEl = document.getElementById("navbar-user-avatar");
    if (avatarEl) avatarEl.innerText = initials || "SP";
  }

  syncUserProfile();
  if (window.authClient && window.authClient.syncProfileWithDatabase) {
    window.authClient.syncProfileWithDatabase().then(() => syncUserProfile());
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // --------------------------------------------------------------------------
  // 5. PERSISTENCE & HISTORY STORAGE HELPER (STRICTLY USER ISOLATED)
  // --------------------------------------------------------------------------
  function persistHistory(historyList) {
    predictionHistory = historyList;
    window.__edumetricsPredictionHistory = historyList;
    const user = window.authClient ? window.authClient.getUser() : null;
    if (user?.id) {
      localStorage.setItem(`edumetrics_prediction_history_v2_${user.id}`, JSON.stringify(historyList));
      localStorage.setItem(`edumetrics_prediction_history_${user.id}`, JSON.stringify(historyList));
    }
  }
  window.persistHistory = persistHistory;

  // --------------------------------------------------------------------------
  // 6. LOAD PREDICTION HISTORY (STRICTLY USER ISOLATED)
  // --------------------------------------------------------------------------
  async function loadHistory() {
    try {
      const user = window.authClient ? window.authClient.getUser() : null;
      let localList = [];

      // Step 0: Gather tombstoned (permanently deleted) IDs
      let deletedIds = new Set();
      try {
        const tombstoneKeys = [
          user?.id ? `sp_deleted_prediction_ids_${user.id}` : null,
          "sp_deleted_prediction_ids"
        ].filter(Boolean);
        for (const tk of tombstoneKeys) {
          const raw = localStorage.getItem(tk);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              arr.forEach((id) => {
                if (id) deletedIds.add(String(id).trim().toLowerCase());
              });
            }
          }
        }
      } catch (e) {}

      // Step 1: User-isolated local storage lookup
      if (user?.id) {
        const userKey = `edumetrics_prediction_history_v2_${user.id}`;
        const altUserKey = `edumetrics_prediction_history_${user.id}`;
        const raw = localStorage.getItem(userKey) || localStorage.getItem(altUserKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localList = parsed.filter(item => item && item.id && !deletedIds.has(String(item.id).trim().toLowerCase()) && (item.user_id === user.id || (!item.user_id && user.email && item.payload?.user_email === user.email)));
            }
          } catch(e) {}
        }
      }

      // Step 2: Live Supabase Cloud Database Query strictly for current user
      let cloudList = [];
      if (window.authClient && window.authClient.client && user?.id) {
        try {
          const { data, error } = await window.authClient.client
            .from("prediction_history")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && Array.isArray(data) && data.length > 0) {
            // STRICT USER ISOLATION: Must match current user ID or current user email
            const userRows = data.filter((item) => {
              if (!item) return false;
              const itemId = String(item.id || "").trim().toLowerCase();
              if (itemId && deletedIds.has(itemId)) return false;
              const p = item.input_features || item.payload || {};
              const pId = String(p.id || "").trim().toLowerCase();
              if (pId && deletedIds.has(pId)) return false;
              const rowUserId = item.user_id || p.user_id;
              const rowEmail = item.user_email || p.user_email || item.email;
              return (rowUserId && rowUserId === user.id) || (user.email && rowEmail && rowEmail.toLowerCase() === user.email.toLowerCase());
            });

            cloudList = userRows.map((item) => {
              const stage = item.stage || "university";
              const rawScore = typeof item.predicted_score === "number" ? item.predicted_score : parseFloat(item.predicted_score || item.score || 85.0);
              const isLowRisk = (item.status_badge || "").toLowerCase().includes("exemp") || (item.status_badge || "").toLowerCase().includes("on track");
              return {
                id: String(item.id || `pred-${Date.now()}`),
                timestamp: item.created_at || new Date().toISOString(),
                created_at: item.created_at,
                role: item.role || "student",
                stage: stage,
                score: item.formatted_score || `${rawScore}`,
                grade: item.predicted_grade || item.grade || "Grade A",
                status_badge: item.status_badge || (isLowRisk ? "Exemplary" : "Proficient"),
                status_color: item.status_color || (isLowRisk ? "badge-success" : "badge-info"),
                payload: item.input_features || item.payload || {},
                recommendations: item.recommendations || "Maintain steady academic momentum.",
                user_id: user.id
              };
            });
          }
        } catch (cloudErr) {
          console.warn("[Analytics] Supabase direct query notice:", cloudErr.message);
        }
      }

      // Step 3: Merge & Deduplicate strictly for current user
      const mergedMap = new Map();
      localList.forEach(item => {
        if (item && item.id && !deletedIds.has(String(item.id).trim().toLowerCase())) {
          mergedMap.set(String(item.id), item);
        }
      });
      cloudList.forEach(item => {
        if (item && item.id && !deletedIds.has(String(item.id).trim().toLowerCase())) {
          mergedMap.set(String(item.id), item);
        }
      });

      let finalList = Array.from(mergedMap.values()).filter(
        item => item && item.id && !deletedIds.has(String(item.id).trim().toLowerCase())
      );
      finalList.sort((a, b) => {
        const tA = new Date(a.timestamp || a.created_at || 0).getTime();
        const tB = new Date(b.timestamp || b.created_at || 0).getTime();
        return tB - tA;
      });

      predictionHistory = finalList;
      if (user?.id) {
        persistHistory(finalList);
      }

      refreshAllViews();
    } catch (err) {
      console.warn("[Analytics] History initialization notice:", err.message);
    }
  }

  // --------------------------------------------------------------------------
  // 7. MASTER REFRESH VIEW CONTROLLER
  // --------------------------------------------------------------------------
  function refreshAllViews() {
    updateSummaryKPIs();
    renderMainAnalyticsChart();
    renderProCognitiveRadarChart();
    renderLedgerTable();
  }

  // --------------------------------------------------------------------------
  // 8. UPDATE SUMMARY STAT CARDS (KPIS)
  // --------------------------------------------------------------------------
  function updateSummaryKPIs() {
    if (kpiTotalEvaluations) kpiTotalEvaluations.innerText = `${predictionHistory.length}`;

    if (predictionHistory.length > 0) {
      const latest = predictionHistory[0];
      if (kpiLatestScore) kpiLatestScore.innerText = latest.score || "--";
      if (kpiLatestBadge) {
        kpiLatestBadge.innerText = latest.status_badge || "Evaluated";
        kpiLatestBadge.className = `badge ${latest.status_color || "badge-success"}`;
      }

      // Longitudinal improvement delta
      const oldest = predictionHistory[predictionHistory.length - 1];
      const valLatest = parseFloat(latest.score) || 0;
      const valOldest = parseFloat(oldest.score) || 0;
      const delta = +(valLatest - valOldest).toFixed(2);

      if (kpiGrowthDelta) {
        kpiGrowthDelta.innerText = delta >= 0 ? `+${delta}` : `${delta}`;
        kpiGrowthDelta.style.color = delta >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)";
      }
    } else {
      if (kpiLatestScore) kpiLatestScore.innerText = "--";
      if (kpiLatestBadge) {
        kpiLatestBadge.innerText = "--";
        kpiLatestBadge.className = "badge badge-neutral";
      }
      if (kpiGrowthDelta) {
        kpiGrowthDelta.innerText = "--";
        kpiGrowthDelta.style.color = "var(--text-muted)";
      }
    }
  }

  // --------------------------------------------------------------------------
  // 9. STAGE METADATA & NORMALIZATION HELPERS
  // --------------------------------------------------------------------------
  // 9. STAGE METADATA & NORMALIZATION HELPERS
  // --------------------------------------------------------------------------
  function parseNormalizedScore(item) {
    if (!item) return { raw: 0, pct: 0, formatted: "0" };
    const s = (item.stage || "university").toLowerCase();
    let p = item.payload || item.input_features || {};
    if (typeof p === "string") {
      try { p = JSON.parse(p); } catch(e) { p = {}; }
    }

    let raw = 0;
    if (s === "university") {
      if (item.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(item.forecasted_semester_gpa))) {
        raw = parseFloat(item.forecasted_semester_gpa);
      } else if (p.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(p.forecasted_semester_gpa))) {
        raw = parseFloat(p.forecasted_semester_gpa);
      } else if (p.Previous_CGPA !== undefined && !isNaN(parseFloat(p.Previous_CGPA))) {
        raw = parseFloat(p.Previous_CGPA);
      } else if (p.latest_semester_gpa !== undefined && !isNaN(parseFloat(p.latest_semester_gpa))) {
        raw = parseFloat(p.latest_semester_gpa);
      } else if (!isNaN(parseFloat(item.score))) {
        raw = parseFloat(item.score);
      }
      if (raw > 4.0) raw = +(raw / 25.0).toFixed(2);
      if (raw === 0) raw = 2.70;
      let pct = +((raw / 4.0) * 100.0).toFixed(1);
      return { raw: +raw.toFixed(2), pct, formatted: `${raw.toFixed(2)} CGPA` };
    } else if (s === "intermediate" || s === "matric") {
      raw = parseFloat(item.score) || 0;
      let pct = raw > 100 ? (raw / 1100.0) * 100.0 : raw;
      pct = +Math.min(100, Math.max(0, pct)).toFixed(1);
      return { raw, pct, formatted: raw > 100 ? `${raw} Marks` : `${pct}%` };
    } else {
      raw = parseFloat(item.score) || 0;
      let pct = Math.min(100, Math.max(0, raw));
      return { raw, pct, formatted: `${pct.toFixed(1)}%` };
    }
  }

  function getStageMetadata(stage) {
    const s = (stage || "university").toLowerCase();
    if (s === "university") {
      return { title: "University CGPA Trajectory", scale: "0.00 – 4.00 CGPA", min: 1.0, max: 4.0, isUni: true, unit: " CGPA" };
    } else if (s === "intermediate") {
      return { title: "Intermediate (HSSC) Board Trajectory", scale: "0 – 100% (1100 Marks)", min: 40, max: 100, isUni: false, unit: "%" };
    } else if (s === "matric") {
      return { title: "Matriculation (SSC) Board Trajectory", scale: "0 – 100% (1100 Marks)", min: 40, max: 100, isUni: false, unit: "%" };
    } else if (s === "secondary") {
      return { title: "Secondary (Class 5-8) Academic Trajectory", scale: "0 – 100% Percentage Scale", min: 40, max: 100, isUni: false, unit: "%" };
    } else {
      return { title: "Primary School Foundation Trajectory", scale: "0 – 100% Mastery Scale", min: 40, max: 100, isUni: false, unit: "% Mastery" };
    }
  }

  // --------------------------------------------------------------------------
  // Helper to display clean zero-state placeholders for brand new accounts
  // --------------------------------------------------------------------------
  function updateChartEmptyState(canvasId, isEmpty, emptyConfig = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let emptyEl = parent.querySelector(".chart-empty-state-overlay");
    if (isEmpty) {
      canvas.style.display = "none";
      if (!emptyEl) {
        emptyEl = document.createElement("div");
        emptyEl.className = "chart-empty-state-overlay";
        emptyEl.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:280px; height:100%; text-align:center; padding:2rem; background:rgba(0,0,0,0.25); border-radius:8px; border:1px dashed rgba(255,255,255,0.15);";
        parent.appendChild(emptyEl);
      }
      emptyEl.innerHTML = `
        <div style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.85;">${emptyConfig.icon || "📊"}</div>
        <div style="font-weight:800; color:var(--text-primary); font-size:1.05rem; margin-bottom:0.35rem;">${emptyConfig.title || "No Academic Evaluations Logged Yet"}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); max-width:380px; line-height:1.5; margin-bottom:1.25rem;">${emptyConfig.description || "Run your first AI prediction to generate live trajectory curves and growth analytics."}</div>
        ${emptyConfig.buttonText ? `<a href="${emptyConfig.buttonHref || 'prediction.html'}" class="btn btn-primary btn-sm" style="font-size:0.85rem; text-decoration:none; padding:8px 18px; font-weight:700;">${emptyConfig.buttonText}</a>` : ''}
      `;
    } else {
      canvas.style.display = "block";
      if (emptyEl) emptyEl.remove();
    }
  }

  // --------------------------------------------------------------------------
  // 10. CHART 1: PERFORMANCE TRAJECTORY (UNLOCKED & LIVE EVALUATION DATA)
  // --------------------------------------------------------------------------
  function renderProgressionChart() {
    const canvas = document.getElementById("analyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const isAll = currentStageFilter === "all";
    const activeStage = isAll ? (predictionHistory[0]?.stage || "university") : currentStageFilter;
    const stageMeta = getStageMetadata(activeStage);
    const isUni = stageMeta.isUni;
    const unitLabel = isUni ? " CGPA" : "%";
    const isMobile = window.innerWidth <= 768;

    const stageRecords = isAll
      ? predictionHistory
      : predictionHistory.filter((r) => (r.stage || "university").toLowerCase() === currentStageFilter.toLowerCase());

    const trajActualEl = document.getElementById("trajectory-actual-val");
    const trajAiLiftEl = document.getElementById("trajectory-ai-lift");
    const trajProjEl = document.getElementById("trajectory-projected-val");
    const trajBadgeEl = document.getElementById("trajectory-status-badge");
    const insightEl = document.getElementById("score-insight-text");

    if (!stageRecords || stageRecords.length === 0) {
      // Clean Zero-State for Brand New Account
      updateChartEmptyState("analyticsProgressionChart", true, {
        icon: "📈",
        title: "No Academic Evaluations Logged Yet",
        description: "Complete your first AI forecast on the Forecast page to log your verified scores and generate your live performance trajectory.",
        buttonText: "⚡ Run AI Forecast",
        buttonHref: "prediction.html"
      });

      if (trajActualEl) trajActualEl.innerText = "--";
      if (trajAiLiftEl) trajAiLiftEl.innerText = "--";
      if (trajProjEl) trajProjEl.innerText = "--";
      if (trajBadgeEl) {
        trajBadgeEl.innerText = "Awaiting Evaluation";
        trajBadgeEl.className = "badge badge-neutral";
      }
      if (insightEl) {
        insightEl.innerHTML = `💡 <strong>No academic evaluations logged yet.</strong> Go to the <a href="prediction.html" style="color:var(--color-lime);text-decoration:underline;">Forecast page</a> and click <strong>⚡ Run AI</strong> to log your verified marks and generate your personalized live growth curve!`;
      }
      return;
    }

    // Records Exist: Render Real User Trajectory
    updateChartEmptyState("analyticsProgressionChart", false);

    const parseVal = (r) => {
      const parsed = parseNormalizedScore(r);
      return parsed.raw;
    };

    let labels = [];
    let pastScores = [];
    let predScores = [];

    const activeList = stageRecords.slice().reverse();
    const latestRun = stageRecords[0];
    let latestP = latestRun.payload || latestRun.input_features || {};
    if (typeof latestP === "string") {
      try { latestP = JSON.parse(latestP); } catch (e) { latestP = {}; }
    }

    // Determine student's actual current standing (CGPA)
    let currentStandingVal = 2.70;
    if (isUni) {
      if (latestP.Previous_CGPA !== undefined && !isNaN(parseFloat(latestP.Previous_CGPA))) {
        currentStandingVal = parseFloat(latestP.Previous_CGPA);
      } else if (latestP.latest_semester_gpa !== undefined && !isNaN(parseFloat(latestP.latest_semester_gpa))) {
        currentStandingVal = parseFloat(latestP.latest_semester_gpa);
      } else if (latestRun.projected_cumulative_cgpa !== undefined && !isNaN(parseFloat(latestRun.projected_cumulative_cgpa))) {
        currentStandingVal = parseFloat(latestRun.projected_cumulative_cgpa);
      } else {
        currentStandingVal = parseVal(latestRun);
      }
      if (currentStandingVal > 4.0) currentStandingVal = +(currentStandingVal / 25.0).toFixed(2);
      currentStandingVal = +Number(currentStandingVal).toFixed(2);
    } else {
      currentStandingVal = parseVal(latestRun);
    }

    // Determine AI Forecasted target
    let aiForecastVal = 3.65;
    if (isUni) {
      if (latestRun.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(latestRun.forecasted_semester_gpa))) {
        aiForecastVal = parseFloat(latestRun.forecasted_semester_gpa);
      } else if (latestP.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(latestP.forecasted_semester_gpa))) {
        aiForecastVal = parseFloat(latestP.forecasted_semester_gpa);
      } else if (parseFloat(latestRun.score) <= 4.0 && parseFloat(latestRun.score) > 0) {
        aiForecastVal = parseFloat(latestRun.score);
      } else {
        aiForecastVal = Math.min(4.0, +(currentStandingVal + 0.35).toFixed(2));
      }
      if (aiForecastVal > 4.0) aiForecastVal = +(aiForecastVal / 25.0).toFixed(2);
      aiForecastVal = +Number(aiForecastVal).toFixed(2);
      if (aiForecastVal <= currentStandingVal && currentStandingVal < 3.85) {
        aiForecastVal = Math.min(4.0, +(currentStandingVal + 0.30).toFixed(2));
      }
    } else {
      aiForecastVal = Math.min(100, Math.round(currentStandingVal + 7));
    }

    const diff = +(aiForecastVal - currentStandingVal).toFixed(2);
    let liftDelta = isUni ? `${diff >= 0 ? '+' : ''}${diff}` : `${diff >= 0 ? '+' : ''}${diff}%`;

    // Strictly 2 points: 1. Current Standing & 2. ⚡ AI Projected Lift
    labels = [
      `1. Current Standing (${currentStandingVal}${unitLabel})`,
      `2. ⚡ AI Projected Lift (${aiForecastVal}${unitLabel} 🚀)`
    ];
    pastScores = [currentStandingVal, null];
    predScores = [currentStandingVal, aiForecastVal];

    if (trajActualEl) trajActualEl.innerText = `${currentStandingVal.toFixed ? currentStandingVal.toFixed(2) : currentStandingVal}${unitLabel}`;
    if (trajAiLiftEl) trajAiLiftEl.innerText = `${aiForecastVal.toFixed ? aiForecastVal.toFixed(2) : aiForecastVal}${unitLabel} (${liftDelta} 🚀)`;
    if (trajProjEl) trajProjEl.innerText = "";
    if (trajBadgeEl) {
      const isPositive = diff >= 0;
      trajBadgeEl.innerText = isPositive ? "Ascending Growth 🚀" : "Attention Needed ⚠️";
      trajBadgeEl.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    if (insightEl) {
      insightEl.innerHTML = "";
    }

    // Dynamic clean Y-Axis bounds
    let minScore = Math.min(currentStandingVal, aiForecastVal);
    let yMin = isUni ? Math.max(0.0, Math.floor((minScore - 0.5) * 2) / 2) : Math.max(0, Math.floor((minScore - 15) / 10) * 10);
    let yMax = isUni ? 4.0 : 100;
    if (yMin >= yMax) yMin = Math.max(0, yMax - 1.0);

    const greenGradient = ctx.createLinearGradient(0, 0, 0, 340);
    greenGradient.addColorStop(0, "rgba(163, 230, 53, 0.32)");
    greenGradient.addColorStop(1, "rgba(163, 230, 53, 0.0)");

    const blueGradient = ctx.createLinearGradient(0, 0, 0, 340);
    blueGradient.addColorStop(0, "rgba(56, 189, 248, 0.32)");
    blueGradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    progressionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "1. Current Standing (Verified)",
            data: pastScores,
            borderColor: "#A3E635",
            borderWidth: 3.5,
            fill: false,
            backgroundColor: greenGradient,
            tension: 0,
            pointBackgroundColor: "#A3E635",
            pointBorderColor: "#101217",
            pointBorderWidth: 2.5,
            pointRadius: isMobile ? 7 : 8.5,
            pointHoverRadius: 10
          },
          {
            label: "2. ⚡ AI Projected Lift (Forecast)",
            data: predScores,
            borderColor: "#38BDF8",
            borderDash: [6, 4],
            borderWidth: 3.5,
            fill: true,
            backgroundColor: blueGradient,
            tension: 0,
            pointBackgroundColor: ["transparent", "#38BDF8"],
            pointBorderColor: ["transparent", "#101217"],
            pointBorderWidth: [0, 2.5],
            pointRadius: [0, isMobile ? 7.5 : 9],
            pointHoverRadius: [0, 11]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              color: "#CBD5E1",
              font: { family: "Inter", size: isMobile ? 11 : 12, weight: "600" },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: "#181B22",
            borderColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            titleColor: "#F8FAFC",
            bodyColor: "#F8FAFC",
            padding: 12,
            filter: (item) => !(item.datasetIndex === 1 && item.dataIndex === 0),
            callbacks: {
              label: (context) => {
                if (context.parsed.y === null || context.parsed.y === undefined) return "";
                if (context.dataIndex === 0) {
                  return ` 🟢 Current Standing: ${context.parsed.y}${unitLabel}`;
                } else {
                  return ` ⚡ AI Projected Lift: ${context.parsed.y}${unitLabel} (Forecast)`;
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { family: "Inter", size: isMobile ? 10 : 11, weight: "600" } }
          },
          y: {
            min: yMin,
            max: yMax,
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: "#94A3B8",
              font: { family: "Inter", size: isMobile ? 10 : 11 },
              callback: (val) => `${val}${unitLabel}`
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 11. MERGED BAR CHART (PROGRESSION IN BAR MODE)
  // --------------------------------------------------------------------------
  function renderMergedBarChart() {
    const canvas = document.getElementById("analyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const isAll = currentStageFilter === "all";
    const activeStage = isAll ? (predictionHistory[0]?.stage || "university") : currentStageFilter;
    const stageMeta = getStageMetadata(activeStage);
    const isUni = stageMeta.isUni;
    const unitLabel = isUni ? " CGPA" : "%";
    const isMobile = window.innerWidth <= 768;

    const parseVal = (r) => {
      const parsed = parseNormalizedScore(r);
      return parsed.raw;
    };

    const stageRecords = isAll
      ? predictionHistory
      : predictionHistory.filter((r) => (r.stage || "university").toLowerCase() === currentStageFilter.toLowerCase());

    if (!stageRecords || stageRecords.length === 0) {
      updateChartEmptyState("analyticsProgressionChart", true, {
        icon: "📊",
        title: "No Academic Evaluations Logged Yet",
        description: "Complete your first AI forecast on the Forecast page to generate comparative milestone bar charts.",
        buttonText: "⚡ Run AI Forecast",
        buttonHref: "prediction.html"
      });
      return;
    }

    updateChartEmptyState("analyticsProgressionChart", false);

    let labels = [];
    let barValues = [];
    let bgColors = [];
    let borderColors = [];

    const insightEl = document.getElementById("score-insight-text");
    const activeList = stageRecords.slice().reverse();
    const latestRun = stageRecords[0];
    let latestP = latestRun.payload || latestRun.input_features || {};
    if (typeof latestP === "string") {
      try { latestP = JSON.parse(latestP); } catch (e) { latestP = {}; }
    }

    let currentStandingVal = 2.70;
    if (isUni) {
      if (latestP.Previous_CGPA !== undefined && !isNaN(parseFloat(latestP.Previous_CGPA))) {
        currentStandingVal = parseFloat(latestP.Previous_CGPA);
      } else if (latestP.latest_semester_gpa !== undefined && !isNaN(parseFloat(latestP.latest_semester_gpa))) {
        currentStandingVal = parseFloat(latestP.latest_semester_gpa);
      } else if (latestRun.projected_cumulative_cgpa !== undefined && !isNaN(parseFloat(latestRun.projected_cumulative_cgpa))) {
        currentStandingVal = parseFloat(latestRun.projected_cumulative_cgpa);
      } else {
        currentStandingVal = parseVal(latestRun);
      }
      if (currentStandingVal > 4.0) currentStandingVal = +(currentStandingVal / 25.0).toFixed(2);
      currentStandingVal = +Number(currentStandingVal).toFixed(2);
    } else {
      currentStandingVal = parseVal(latestRun);
    }

    let aiForecastVal = 3.65;
    if (isUni) {
      if (latestRun.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(latestRun.forecasted_semester_gpa))) {
        aiForecastVal = parseFloat(latestRun.forecasted_semester_gpa);
      } else if (latestP.forecasted_semester_gpa !== undefined && !isNaN(parseFloat(latestP.forecasted_semester_gpa))) {
        aiForecastVal = parseFloat(latestP.forecasted_semester_gpa);
      } else if (parseFloat(latestRun.score) <= 4.0 && parseFloat(latestRun.score) > 0) {
        aiForecastVal = parseFloat(latestRun.score);
      } else {
        aiForecastVal = Math.min(4.0, +(currentStandingVal + 0.35).toFixed(2));
      }
      if (aiForecastVal > 4.0) aiForecastVal = +(aiForecastVal / 25.0).toFixed(2);
      aiForecastVal = +Number(aiForecastVal).toFixed(2);
      if (aiForecastVal <= currentStandingVal && currentStandingVal < 3.85) {
        aiForecastVal = Math.min(4.0, +(currentStandingVal + 0.30).toFixed(2));
      }
    } else {
      aiForecastVal = Math.min(100, Math.round(currentStandingVal + 7));
    }

    // Strictly 2 bars: 1. Current Standing & 2. ⚡ AI Projected Lift
    labels = [
      `1. Current Standing (${currentStandingVal}${unitLabel})`,
      `2. ⚡ AI Projected Lift (${aiForecastVal}${unitLabel} 🚀)`
    ];
    barValues = [currentStandingVal, aiForecastVal];
    bgColors = [
      "rgba(163, 230, 53, 0.85)",
      "rgba(56, 189, 248, 0.90)"
    ];
    const diff = +(aiForecastVal - currentStandingVal).toFixed(2);
    let liftDelta = isUni ? `${diff >= 0 ? '+' : ''}${diff}` : `${diff >= 0 ? '+' : ''}${diff}%`;

    const trajActualEl = document.getElementById("trajectory-actual-val");
    const trajAiLiftEl = document.getElementById("trajectory-ai-lift");
    const trajBadgeEl = document.getElementById("trajectory-status-badge");
    if (trajActualEl) trajActualEl.innerText = `${currentStandingVal.toFixed ? currentStandingVal.toFixed(2) : currentStandingVal}${unitLabel}`;
    if (trajAiLiftEl) trajAiLiftEl.innerText = `${aiForecastVal.toFixed ? aiForecastVal.toFixed(2) : aiForecastVal}${unitLabel} (${liftDelta} 🚀)`;
    if (trajBadgeEl) {
      const isPositive = diff >= 0;
      trajBadgeEl.innerText = isPositive ? "Ascending Growth 🚀" : "Attention Needed ⚠️";
      trajBadgeEl.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    if (insightEl) {
      insightEl.innerHTML = "";
    }

    let minScore = Math.min(currentStandingVal, aiForecastVal);
    let yMin = isUni ? Math.max(0.0, Math.floor((minScore - 0.5) * 2) / 2) : Math.max(0, Math.floor((minScore - 15) / 10) * 10);
    let yMax = isUni ? 4.0 : 100;
    if (yMin >= yMax) yMin = Math.max(0, yMax - 1.0);

    progressionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Evaluated & Forecasted Score",
            data: barValues,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 8,
            maxBarThickness: isMobile ? 48 : 64
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#181B22",
            borderColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            titleColor: "#F8FAFC",
            bodyColor: "#F8FAFC",
            padding: 10,
            callbacks: {
              label: (context) => {
                const prefix = context.dataIndex === 0 ? "🟢 Current Standing: " : "⚡ AI Projected Lift: ";
                return ` ${prefix}${context.parsed.y}${unitLabel}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { family: "Inter", size: isMobile ? 10 : 11, weight: "600" } }
          },
          y: {
            min: yMin,
            max: yMax,
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: {
              color: "#94A3B8",
              font: { family: "Inter", size: isMobile ? 10 : 11 },
              callback: (val) => `${val}${unitLabel}`
            }
          }
        }
      }
    });
  }

  function renderMainAnalyticsChart() {
    if (currentChartMode === "bar") {
      renderMergedBarChart();
    } else {
      renderProgressionChart();
    }
  }

  function setChartMode(mode) {
    currentChartMode = mode;
    if (btnChartModeLine && btnChartModeBar) {
      if (mode === "line") {
        btnChartModeLine.classList.add("btn-primary", "active");
        btnChartModeLine.classList.remove("btn-outline");
        btnChartModeBar.classList.remove("btn-primary", "active");
        btnChartModeBar.classList.add("btn-outline");
      } else {
        btnChartModeBar.classList.add("btn-primary", "active");
        btnChartModeBar.classList.remove("btn-outline");
        btnChartModeLine.classList.remove("btn-primary", "active");
        btnChartModeLine.classList.add("btn-outline");
      }
    }
    renderMainAnalyticsChart();
  }

  if (btnChartModeLine) {
    btnChartModeLine.addEventListener("click", () => setChartMode("line"));
  }
  if (btnChartModeBar) {
    btnChartModeBar.addEventListener("click", () => setChartMode("bar"));
  }

  // --------------------------------------------------------------------------
  // 12. CHART 2: COGNITIVE DIAGNOSTIC & RISK MATRIX (PRO LOCKED & BLURRED)
  // --------------------------------------------------------------------------
  function renderProCognitiveRadarChart() {
    const canvas = document.getElementById("proCognitiveRadarChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (window.__proCognitiveChartInstance) {
      window.__proCognitiveChartInstance.destroy();
    }

    window.__proCognitiveChartInstance = new Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "🧠 Cognitive Load Index",
          "⚡ Study Habit Velocity",
          "🎯 Concept Retention Depth",
          "🛡️ Exam Stress Resilience",
          "⏱️ Time Allocation Efficiency",
          "📈 Longitudinal Growth Momentum"
        ],
        datasets: [
          {
            label: "Your Evaluated AI Neural Profile",
            data: [88, 92, 85, 78, 86, 94],
            backgroundColor: "rgba(245, 158, 11, 0.28)",
            borderColor: "#f59e0b",
            borderWidth: 2.5,
            pointBackgroundColor: "#fbbf24",
            pointBorderColor: "#18191d",
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Top 5% Cohort Benchmark",
            data: [95, 96, 92, 90, 94, 98],
            backgroundColor: "rgba(56, 189, 248, 0.15)",
            borderColor: "#38bdf8",
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: "#38bdf8",
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200 },
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.08)" },
            grid: { color: "rgba(255, 255, 255, 0.08)" },
            pointLabels: {
              color: "#CBD5E1",
              font: { family: "Inter", size: 11, weight: "600" }
            },
            ticks: {
              backdropColor: "transparent",
              color: "#64748B",
              font: { size: 9 },
              stepSize: 20
            },
            min: 0,
            max: 100
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#CBD5E1",
              font: { family: "Inter", size: 11, weight: "600" },
              padding: 12
            }
          },
          tooltip: { enabled: false }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 13. PRO UPGRADE NOTIFICATION & MODAL EVENT LISTENERS
  // --------------------------------------------------------------------------
  function triggerProUpgradeNotice() {
    showToast("🔒 Upgrade to Pro Required: 6-Axis Cognitive Diagnostic & Longitudinal Risk Matrix is an exclusive EduMetrics PRO feature. Please upgrade to unlock.", "warning");
    if (proUpgradeModal) {
      window.showAnalyticsModal(proUpgradeModal);
    }
  }

  if (proCard) {
    proCard.addEventListener("click", (e) => {
      e.preventDefault();
      triggerProUpgradeNotice();
    });
  }

  if (btnUnlockProOverlay) {
    btnUnlockProOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerProUpgradeNotice();
    });
  }

  if (btnCloseProModal) {
    btnCloseProModal.addEventListener("click", (e) => {
      e.stopPropagation();
      window.hideAnalyticsModal(proUpgradeModal);
    });
  }

  if (btnCancelProModal) {
    btnCancelProModal.addEventListener("click", (e) => {
      e.stopPropagation();
      window.hideAnalyticsModal(proUpgradeModal);
    });
  }

  if (btnConfirmProUpgrade) {
    btnConfirmProUpgrade.addEventListener("click", (e) => {
      e.stopPropagation();
      window.hideAnalyticsModal(proUpgradeModal);
      showToast("🎉 Thank you! Your request to upgrade to EduMetrics PRO has been received. Our team will activate your Pro license shortly.", "success");
    });
  }

  if (proUpgradeModal) {
    proUpgradeModal.addEventListener("click", (e) => {
      if (e.target === proUpgradeModal) {
        window.hideAnalyticsModal(proUpgradeModal);
      }
    });
  }



  // --------------------------------------------------------------------------
  // 15. HISTORICAL PREDICTION & DIAGNOSTICS LEDGER TABLE
  // --------------------------------------------------------------------------
  function renderLedgerTable() {
    if (!ledgerTableBody) return;

    const stageFilter = filterLedgerStage ? filterLedgerStage.value : currentStageFilter;
    const roleFilter = filterLedgerRole ? filterLedgerRole.value : currentRoleFilter;

    let filtered = [...predictionHistory];

    if (stageFilter && stageFilter !== "all") {
      filtered = filtered.filter((h) => (h.stage || "university").toLowerCase() === stageFilter.toLowerCase());
    }
    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter((h) => (h.role || "student").toLowerCase() === roleFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      ledgerTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
            No prediction records found for this account. Complete an AI evaluation on the Forecast page to start your historical ledger.
          </td>
        </tr>
      `;
      return;
    }

    ledgerTableBody.innerHTML = filtered
      .map((item) => {
        const dateRaw = item.created_at || item.timestamp;
        let dateStr = "Recent";
        if (dateRaw) {
          const d = new Date(dateRaw);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
          }
        }

        let p = item.payload || item.input_features || {};
        if (typeof p === "string") {
          try { p = JSON.parse(p); } catch(e) { p = {}; }
        }

        const entries = Object.entries(p).filter(([k]) => k !== "subjects" || (Array.isArray(p[k]) && p[k].length > 0));

        const snapshotStr = entries
          .slice(0, 3)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${formatDiagnosticParam(k, v)}`)
          .join(" | ");

        let scoreText = item.score || "N/A";
        const isItemUni = (item.stage || "university").toLowerCase() === "university";
        if (isItemUni && typeof scoreText === "string" && !scoreText.includes("CGPA") && !scoreText.includes("GPA") && !isNaN(parseFloat(scoreText))) {
          const num = parseFloat(scoreText);
          scoreText = num <= 4.0 ? `${num.toFixed(2)} CGPA` : `${(num / 25.0).toFixed(2)} CGPA`;
        }

        const cleanId = String(item.id || "").replace(/'/g, "\\'");

        return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${item.id}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${dateStr}</div>
          </td>
          <td>
            <span class="badge ${item.role === "teacher" ? "badge-info" : "badge-primary"}" style="font-size: 11px; text-transform: uppercase;">
              ${item.role === "teacher" ? "👨‍🏫 Teacher" : "🎓 Student"}
            </span>
            <div style="font-size: 11px; font-weight: 600; color: var(--color-lime); margin-top: 3px;">
              ${(item.stage || "university").charAt(0).toUpperCase() + (item.stage || "university").slice(1)}
            </div>
          </td>
          <td style="font-size: 12px; color: var(--text-secondary); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${snapshotStr}">
            ${snapshotStr || "Standard Input Profile"}
          </td>
          <td style="font-weight: 800; font-size: 15px; color: var(--color-lime);">
            ${scoreText}
          </td>
          <td>
            <span class="badge ${item.status_color || "badge-success"}">${item.status_badge || "Evaluated"}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group" style="justify-content: flex-end;">
              <button type="button" class="table-icon-btn btn-delete" data-action="delete" data-id="${cleanId}" onclick="window.deleteDiagnostic('${cleanId}')" title="Delete Record" style="color: #f87171; border-color: rgba(248, 113, 113, 0.35); background: rgba(239, 68, 68, 0.08); padding: 5px 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; border-radius: 6px;">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  if (filterLedgerStage) {
    filterLedgerStage.addEventListener("change", (e) => {
      currentStageFilter = e.target.value;
      renderMainAnalyticsChart();
      renderLedgerTable();
    });
  }

  if (filterLedgerRole) {
    filterLedgerRole.addEventListener("change", (e) => {
      currentRoleFilter = e.target.value;
      renderLedgerTable();
    });
  }

  // --------------------------------------------------------------------------
  // 16. CRUD OPERATION: DELETE RECORD & PERMANENT CLEAR ALL
  // --------------------------------------------------------------------------
  window.deleteDiagnostic = async (id) => {
    if (!id || id === "undefined") return;
    if (!confirm("Are you sure you want to permanently delete this historical prediction record?")) return;
    const targetId = String(id).trim().toLowerCase();

    // 1. Remove from in-memory history state
    predictionHistory = predictionHistory.filter((h) => String(h.id || "").trim().toLowerCase() !== targetId);
    persistHistory(predictionHistory);

    const user = window.authClient ? window.authClient.getUser() : null;

    // 2. Mark this ID in persistent tombstones so it never resurrects on refresh
    try {
      const tombstoneKeys = [
        user?.id ? `sp_deleted_prediction_ids_${user.id}` : null,
        "sp_deleted_prediction_ids"
      ].filter(Boolean);
      for (const tk of tombstoneKeys) {
        const existing = JSON.parse(localStorage.getItem(tk) || "[]");
        if (!existing.includes(targetId)) {
          existing.push(targetId);
          localStorage.setItem(tk, JSON.stringify(existing));
        }
      }
    } catch (e) {}

    // 3. Purge from ALL user and shared localStorage keys
    const storageKeys = [
      user?.id ? `edumetrics_prediction_history_v2_${user.id}` : null,
      user?.id ? `edumetrics_prediction_history_${user.id}` : null,
      user?.id ? `sp_prediction_history_${user.id}` : null,
      user?.id ? `edumetrics_cached_history_${user.id}` : null,
      "edumetrics_prediction_history_v2",
      "edumetrics_prediction_history",
      "sp_prediction_history",
      "edumetrics_cached_history"
    ].filter(Boolean);

    for (const k of storageKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const filtered = arr.filter((h) => String(h.id || "").trim().toLowerCase() !== targetId);
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        }
      } catch (e) {}
    }

    // 4. Cloud Supabase Sync Deletion
    if (window.authClient && window.authClient.client) {
      try {
        await window.authClient.client.from("prediction_history").delete().eq("id", id);
      } catch (cloudErr) {
        console.warn("[Analytics] Supabase cloud delete error:", cloudErr.message);
      }
      try {
        if (user?.id) {
          await window.authClient.client.from("prediction_history").delete().eq("user_id", user.id).eq("id", id);
        }
      } catch (cloudErr) {}
    }

    // 5. Backend API Client Sync Deletion
    try {
      if (window.apiClient) {
        await window.apiClient.deleteHistoryItem(id);
      }
    } catch (err) {
      console.warn("[API] Delete record notice:", err.message);
    }

    // 6. Refresh ALL analytics UI views immediately
    refreshAllViews();
    showToast("Record permanently removed from ledger.", "info");
  };

  if (btnClearAllHistory) {
    btnClearAllHistory.addEventListener("click", async () => {
      if (!confirm("⚠️ Wipe all historical prediction records? This cannot be undone.")) return;

      const user = window.authClient ? window.authClient.getUser() : null;

      // 1. Tombstone all existing IDs
      try {
        const tombstoneKeys = [
          user?.id ? `sp_deleted_prediction_ids_${user.id}` : null,
          "sp_deleted_prediction_ids"
        ].filter(Boolean);
        for (const tk of tombstoneKeys) {
          const existing = JSON.parse(localStorage.getItem(tk) || "[]");
          predictionHistory.forEach((h) => {
            if (h.id && !existing.includes(String(h.id).trim().toLowerCase())) {
              existing.push(String(h.id).trim().toLowerCase());
            }
          });
          localStorage.setItem(tk, JSON.stringify(existing));
        }
      } catch (e) {}

      predictionHistory = [];
      persistHistory([]);

      // 2. Wipe across all localStorage keys
      const storageKeysToClear = [
        user?.id ? `edumetrics_prediction_history_v2_${user.id}` : null,
        user?.id ? `edumetrics_prediction_history_${user.id}` : null,
        user?.id ? `sp_prediction_history_${user.id}` : null,
        user?.id ? `edumetrics_cached_history_${user.id}` : null,
        "edumetrics_prediction_history_v2",
        "edumetrics_prediction_history",
        "sp_prediction_history",
        "edumetrics_cached_history"
      ].filter(Boolean);

      for (const k of storageKeysToClear) {
        localStorage.removeItem(k);
      }

      // 3. Cloud Supabase Clear strictly for this user
      if (window.authClient && window.authClient.client && user?.id) {
        try {
          await window.authClient.client.from("prediction_history").delete().eq("user_id", user.id);
        } catch (cloudErr) {}
      }

      try {
        if (window.apiClient) {
          await window.apiClient.clearAllHistory();
        }
      } catch (err) {
        console.warn("[API] Clear history notice:", err.message);
      }

      refreshAllViews();
      showToast("Historical prediction ledger permanently cleared.", "info");
    });
  }

  // Delegated Global Click Listener for Delete Action
  document.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-action='delete']");
    if (deleteBtn && deleteBtn.hasAttribute("data-id")) {
      e.preventDefault();
      window.deleteDiagnostic(deleteBtn.getAttribute("data-id"));
    }
  });

  // ESC Key Global Dismissal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.closeAllAnalyticsModals();
    }
  });

  // --------------------------------------------------------------------------
  // 18. INITIAL BOOT & LOAD
  // --------------------------------------------------------------------------
  await loadHistory();
});
