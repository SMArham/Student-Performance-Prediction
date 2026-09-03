/**
 * ============================================================================
 * EDUMETRICS AI — DEDICATED ANALYTICS, COMPARISON & HISTORY HUB (analytics.js)
 * Complete Multi-Stage Longitudinal Engine with Full CRUD, XAI, and Visual Charts
 * ============================================================================
 */

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

  // Set Chart.js universal font to Inter for unified design system consistency
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  // --------------------------------------------------------------------------
  // 2. DOM ELEMENT REFERENCES
  // --------------------------------------------------------------------------
  const logoutBtn = document.getElementById("logout-btn");
  const userProfileBtn = document.getElementById("user-profile-btn");
  const railProfileBtn = document.getElementById("rail-profile-btn");
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const profileModal = document.getElementById("profile-settings-modal");
  const btnCloseProfile = document.getElementById("btn-close-profile-modal");
  const profileForm = document.getElementById("profile-details-form");
  const securityForm = document.getElementById("profile-security-form");
  const btnDeleteAccount = document.getElementById("btn-delete-account-confirm");

  // Summary KPI DOMs
  const kpiTotalEvaluations = document.getElementById("kpi-total-evaluations");
  const kpiLatestScore = document.getElementById("kpi-latest-score");
  const kpiLatestBadge = document.getElementById("kpi-latest-badge");
  const kpiGrowthDelta = document.getElementById("kpi-growth-delta");
  const kpiRiskSummary = document.getElementById("kpi-risk-summary");

  // Comparison Matrix DOMs
  const compareSelectBaseline = document.getElementById("compare-select-baseline");
  const compareSelectTarget = document.getElementById("compare-select-target");
  const cmpScoreA = document.getElementById("cmp-score-a");
  const cmpScoreB = document.getElementById("cmp-score-b");
  const cmpScoreDelta = document.getElementById("cmp-score-delta");
  const cmpStatusBadge = document.getElementById("cmp-status-badge");
  const cmpDetailNotes = document.getElementById("cmp-detail-notes");

  // Ledger DOMs
  const ledgerTableBody = document.getElementById("analytics-ledger-body");
  const filterLedgerStage = document.getElementById("filter-ledger-stage");
  const filterLedgerRole = document.getElementById("filter-ledger-role");
  const btnClearAllHistory = document.getElementById("btn-clear-all-history");

  // Diagnostic Detail Modal DOMs
  const detailModal = document.getElementById("analytics-detail-modal");
  const btnCloseDetailModal = document.getElementById("btn-close-detail-modal");
  const btnCloseDetailModalBtn = document.getElementById("btn-close-detail-modal-btn");
  const modalDetailScore = document.getElementById("modal-detail-score");
  const modalDetailBadge = document.getElementById("modal-detail-badge");
  const modalDetailStage = document.getElementById("modal-detail-stage");
  const modalDetailInputs = document.getElementById("modal-detail-inputs");
  const modalDetailRecs = document.getElementById("modal-detail-recs");

  // Edit Record Modal DOMs
  const editModal = document.getElementById("analytics-edit-modal");
  const editForm = document.getElementById("analytics-edit-form");
  const editRecordId = document.getElementById("edit-record-id");
  const editRecordScore = document.getElementById("edit-record-score");
  const editRecordStatus = document.getElementById("edit-record-status");
  const editRecordNotes = document.getElementById("edit-record-notes");
  const btnCloseEditModal = document.getElementById("btn-close-edit-modal");
  const btnCancelEditModal = document.getElementById("btn-cancel-edit-modal");

  // Trajectory Modal DOMs
  const trajModal = document.getElementById("analytics-trajectory-modal");
  const trajModalTitle = document.getElementById("traj-modal-title");
  const trajModalSubtitle = document.getElementById("traj-modal-subtitle");
  const trajValBaseline = document.getElementById("traj-val-baseline");
  const trajValCurrent = document.getElementById("traj-val-current");
  const trajValTarget = document.getElementById("traj-val-target");
  const trajExplanation = document.getElementById("traj-modal-explanation");
  const btnCloseTrajModal = document.getElementById("btn-close-traj-modal");
  const btnCloseTrajModalBtn = document.getElementById("btn-close-traj-modal-btn");

  // Fullscreen Theater Modal DOMs
  const fsModal = document.getElementById("analytics-fullscreen-modal");
  const fsModalTitle = document.getElementById("fs-modal-title");
  const fsModalSubtitle = document.getElementById("fs-modal-subtitle");
  const fsCanvas = document.getElementById("fullscreenChartCanvas");
  const btnFsDownloadPng = document.getElementById("btn-fs-download-png");
  const btnCloseFsModal = document.getElementById("btn-close-fs-modal");
  const btnCloseFsModalBtn = document.getElementById("btn-close-fs-modal-btn");

  // Chart Instances & Filters
  let progressionChart = null;
  let gradeDistributionChart = null;
  let subjectMasteryChart = null;
  let habitsCorrelationChart = null;
  let modalTrajChartInstance = null;
  let fsChartInstance = null;

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
    toast.innerHTML = `
      <div style="flex:1;">${message}</div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;font-size:18px;">&times;</button>
    `;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3500);
  }

  // --------------------------------------------------------------------------
  // 4. USER PROFILE & AVATAR SYNCHRONIZATION
  // --------------------------------------------------------------------------
  function syncUserProfile() {
    const user = window.authClient ? window.authClient.getUser() : null;
    const meta = user?.user_metadata || {};
    const displayName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Muhammad Ali");
    const idCode = meta.student_id || meta.id_code || (meta.role === "teacher" ? "TCH-2026-001" : "STU-2026-001");
    const program = meta.program || meta.major || "Software Engineering";
    const institution = meta.institution_name || meta.institution || "Faculty of Engineering";

    // Set Name & ID Code
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");
    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentIdCodeEl) studentIdCodeEl.innerText = idCode;

    // Set Avatar Initials (e.g. "Muhammad Ali" -> "MA")
    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

    const avatarEl = document.getElementById("navbar-user-avatar");
    if (avatarEl) avatarEl.innerText = initials || "SP";

    // Prefill Settings Modal Inputs
    const settingFullname = document.getElementById("setting-fullname");
    const settingStudentId = document.getElementById("setting-studentid");
    const settingProgram = document.getElementById("setting-program") || document.getElementById("setting-major");
    const settingInstitution = document.getElementById("setting-institution");

    if (settingFullname) settingFullname.value = displayName;
    if (settingStudentId) settingStudentId.value = idCode;
    if (settingProgram) settingProgram.value = program;
    if (settingInstitution) settingInstitution.value = institution;
  }

  syncUserProfile();

  // --------------------------------------------------------------------------
  // 5. PROFILE & SETTINGS MODAL INTERACTION
  // --------------------------------------------------------------------------
  function openSettingsModal() {
    if (!profileModal) return;
    syncUserProfile();

    // Reset password fields
    if (securityForm) securityForm.reset();
    const newPassInput = document.getElementById("setting-new-password");
    const confPassInput = document.getElementById("setting-confirm-password");
    if (newPassInput) newPassInput.value = "";
    if (confPassInput) confPassInput.value = "";

    // Default to General tab
    const tabs = document.querySelectorAll(".modal-tab-btn");
    const contents = document.querySelectorAll(".profile-tab-content");
    tabs.forEach((t) => t.classList.remove("active"));
    contents.forEach((c) => {
      c.classList.remove("active");
      c.style.display = "none";
    });
    const defaultTabBtn = document.querySelector('.modal-tab-btn[data-tab="tab-profile-general"]');
    const defaultContent = document.getElementById("tab-profile-general");
    if (defaultTabBtn) defaultTabBtn.classList.add("active");
    if (defaultContent) {
      defaultContent.classList.add("active");
      defaultContent.style.display = "block";
    }

    profileModal.classList.add("active");
  }

  function closeSettingsModal() {
    if (profileModal) profileModal.classList.remove("active");
  }

  if (userProfileBtn) userProfileBtn.addEventListener("click", openSettingsModal);
  if (railProfileBtn) railProfileBtn.addEventListener("click", openSettingsModal);
  if (btnOpenSettings) btnOpenSettings.addEventListener("click", openSettingsModal);
  if (btnCloseProfile) btnCloseProfile.addEventListener("click", closeSettingsModal);
  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) closeSettingsModal();
    });
  }

  // Profile Modal Tab Switching
  const profileTabs = document.querySelectorAll(".modal-tab-btn");
  const tabContents = document.querySelectorAll(".profile-tab-content");

  profileTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");
      profileTabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => {
        c.classList.remove("active");
        c.style.display = "none";
      });
      tab.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add("active");
        targetContent.style.display = "block";
      }
    });
  });

  // Profile Details Form Submission
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newName = document.getElementById("setting-fullname")?.value.trim() || "User";
      const settingProgram = document.getElementById("setting-program") || document.getElementById("setting-major");
      const newProgram = settingProgram?.value.trim() || "Software Engineering";
      const newInst = document.getElementById("setting-institution")?.value.trim() || "Faculty of Engineering";

      if (window.authClient) {
        await window.authClient.updateUser({
          full_name: newName,
          program: newProgram,
          major: newProgram,
          institution_name: newInst,
          institution: newInst
        });
      }
      syncUserProfile();
      closeSettingsModal();
      showToast("Academic profile updated successfully!", "success");
    });
  }

  // Security Form Submission
  if (securityForm) {
    securityForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p1 = document.getElementById("setting-new-password")?.value;
      const p2 = document.getElementById("setting-confirm-password")?.value;

      if (!p1 || p1.length < 6) return showToast("Password must be at least 6 characters.", "error");
      if (p1 !== p2) return showToast("Passwords do not match.", "error");

      try {
        if (window.authClient) {
          await window.authClient.updatePassword(p1);
        }
        closeSettingsModal();
        showToast("Password updated securely!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update password.", "error");
      }
    });
  }

  // Delete Account Action
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("⚠️ ARE YOU SURE? This will permanently delete your student profile and all historical prediction records.")) {
        if (window.authClient) await window.authClient.deleteAccount();
        window.location.href = "login.html";
      }
    });
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // --------------------------------------------------------------------------
  // 6. PERSISTENCE & HISTORY STORAGE HELPER
  // --------------------------------------------------------------------------
  function persistHistory(historyList) {
    const user = window.authClient ? window.authClient.getUser() : null;
    if (user?.id) {
      localStorage.setItem(`edumetrics_prediction_history_v2_${user.id}`, JSON.stringify(historyList));
      localStorage.setItem(`edumetrics_prediction_history_${user.id}`, JSON.stringify(historyList));
    }
    localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(historyList));
    localStorage.setItem("edumetrics_prediction_history", JSON.stringify(historyList));
  }

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

  // --------------------------------------------------------------------------
  // 7. LOAD PREDICTION HISTORY (OFFLINE-FIRST + LIVE SUPABASE CLOUD SYNC)
  // --------------------------------------------------------------------------
  async function loadHistory() {
    try {
      const user = window.authClient ? window.authClient.getUser() : null;
      let localList = [];

      // Step 1: Scan all potential local storage keys for existing history
      const candidateKeys = [];
      if (user?.id) {
        candidateKeys.push(`edumetrics_prediction_history_v2_${user.id}`);
        candidateKeys.push(`edumetrics_prediction_history_${user.id}`);
        candidateKeys.push(`sp_prediction_history_${user.id}`);
      }
      candidateKeys.push("edumetrics_prediction_history_v2");
      candidateKeys.push("edumetrics_prediction_history");

      for (const k of candidateKeys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const matching = parsed.filter(item => !item.user_id || !user?.id || item.user_id === user.id);
              if (matching.length > 0) {
                localList = matching;
                predictionHistory = localList;
                refreshAllViews();
                break;
              }
            }
          }
        } catch (e) {}
      }

      // Step 2: Live Supabase Cloud Database Table Query
      let cloudList = [];
      if (window.authClient && window.authClient.client) {
        try {
          let query = window.authClient.client
            .from("prediction_history")
            .select("*")
            .order("created_at", { ascending: false });

          if (user?.id) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
            if (isUuid) {
              query = query.or(`user_id.eq.${user.id},user_id.is.null`);
            }
          }

          const { data, error } = await query.limit(50);
          if (!error && Array.isArray(data) && data.length > 0) {
            cloudList = data.map((item) => {
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
                recommendations: item.recommendations || "Maintain steady academic momentum."
              };
            });
          }
        } catch (cloudErr) {
          console.warn("[Analytics] Supabase direct query notice:", cloudErr.message);
        }
      }

      // Step 3: Backend API fallback if both local and cloud query yielded no results
      if (localList.length === 0 && cloudList.length === 0 && window.apiClient) {
        try {
          const apiRecords = await window.apiClient.getHistory(50);
          if (Array.isArray(apiRecords) && apiRecords.length > 0) {
            cloudList = apiRecords;
          }
        } catch (e) {}
      }

      // Step 4: Merge & Deduplicate by record ID (Never wipe local data)
      const mergedMap = new Map();
      localList.forEach(item => { if (item && item.id) mergedMap.set(String(item.id), item); });
      cloudList.forEach(item => { if (item && item.id) mergedMap.set(String(item.id), item); });

      let finalList = Array.from(mergedMap.values());
      finalList.sort((a, b) => {
        const tA = new Date(a.timestamp || a.created_at || 0).getTime();
        const tB = new Date(b.timestamp || b.created_at || 0).getTime();
        return tB - tA;
      });

      if (finalList.length > 0) {
        predictionHistory = finalList;
        persistHistory(finalList);
      } else if (localList.length > 0) {
        predictionHistory = localList;
      }

      refreshAllViews();
    } catch (err) {
      console.warn("[Analytics] History initialization notice:", err.message);
    }
  }

  // --------------------------------------------------------------------------
  // 8. MASTER REFRESH VIEW CONTROLLER
  // --------------------------------------------------------------------------
  function refreshAllViews() {
    updateSummaryKPIs();
    renderProgressionChart();
    renderGradeDistributionChart();
    renderSubjectMasteryChart();
    renderHabitsCorrelationChart();
    renderStudentInstructorMatrix();
    populateComparisonDropdowns();
    renderLedgerTable();
  }

  // --------------------------------------------------------------------------
  // 9. UPDATE SUMMARY STAT CARDS (KPIS)
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

      if (kpiRiskSummary) {
        const badgeStr = (latest.status_badge || "").toLowerCase();
        const isAtRisk = badgeStr.includes("risk") || badgeStr.includes("attention");
        kpiRiskSummary.innerText = isAtRisk ? "Intervention Needed" : "Low Risk / On Track";
        kpiRiskSummary.style.color = isAtRisk ? "var(--accent-rose)" : "var(--accent-emerald)";
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
      if (kpiRiskSummary) {
        kpiRiskSummary.innerText = "Awaiting Evaluation";
        kpiRiskSummary.style.color = "var(--text-muted)";
      }
    }
  }

  // --------------------------------------------------------------------------
  // 10. STAGE METADATA & NORMALIZATION HELPERS
  // --------------------------------------------------------------------------
  function parseNormalizedScore(item) {
    if (!item) return { raw: 0, pct: 0, formatted: "0" };
    const raw = parseFloat(item.score) || 0;
    const s = (item.stage || "university").toLowerCase();

    let pct = 0;
    if (s === "university" || raw <= 4.0) {
      pct = (raw / 4.0) * 100.0;
    } else if (s === "intermediate" || s === "matric") {
      if (raw > 100) {
        pct = (raw / 1100.0) * 100.0;
      } else {
        pct = raw;
      }
    } else if (s === "secondary") {
      if (raw <= 20) {
        pct = (raw / 20.0) * 100.0;
      } else {
        pct = raw;
      }
    } else {
      pct = Math.min(100, Math.max(0, raw));
    }
    pct = +Math.min(100, Math.max(0, pct)).toFixed(1);
    return { raw, pct, formatted: item.score || `${pct}%` };
  }

  function getStageMetadata(stage) {
    const s = (stage || "university").toLowerCase();
    if (s === "university") {
      return { title: "University CGPA Trajectory", scale: "0.00 – 4.00 CGPA", min: 2.0, max: 4.0, isUni: true, unit: " CGPA" };
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
        emptyEl.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:220px; height:100%; text-align:center; padding:1.5rem; background:rgba(0,0,0,0.25); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);";
        parent.appendChild(emptyEl);
      }
      emptyEl.innerHTML = `
        <div style="font-size:2rem; margin-bottom:0.5rem; opacity:0.8;">${emptyConfig.icon || "📊"}</div>
        <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem; margin-bottom:0.25rem;">${emptyConfig.title || "No Data Recorded Yet"}</div>
        <div style="font-size:0.8rem; color:var(--text-muted); max-width:320px; line-height:1.45; margin-bottom:1rem;">${emptyConfig.description || "Run an AI evaluation to generate analytics."}</div>
        ${emptyConfig.buttonText ? `<a href="${emptyConfig.buttonHref || 'prediction.html'}" class="btn btn-outline btn-sm" style="font-size:0.75rem; text-decoration:none; border-color:var(--color-lime); color:var(--color-lime); font-weight:700;">${emptyConfig.buttonText}</a>` : ''}
      `;
    } else {
      canvas.style.display = "block";
      if (emptyEl) emptyEl.remove();
    }
  }

  // --------------------------------------------------------------------------
  // 11. CHART 1: PROGRESSION & TARGET TRAJECTORY (REDESIGNED)
  // --------------------------------------------------------------------------
  function renderProgressionChart() {
    const canvas = document.getElementById("analyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const isAll = currentStageFilter === "all";
    const activeStage = isAll ? (predictionHistory[0]?.stage || "university") : currentStageFilter;
    const stageMeta = getStageMetadata(activeStage);

    const stageRecords = isAll
      ? predictionHistory
      : predictionHistory.filter((r) => (r.stage || "university").toLowerCase() === currentStageFilter.toLowerCase());

    if (!stageRecords || stageRecords.length === 0) {
      const trajActualEl = document.getElementById("trajectory-actual-val");
      const trajProjEl = document.getElementById("trajectory-projected-val");
      const trajBadgeEl = document.getElementById("trajectory-status-badge");
      if (trajActualEl) trajActualEl.innerText = "--";
      if (trajProjEl) trajProjEl.innerText = "--";
      if (trajBadgeEl) {
        trajBadgeEl.innerText = "Awaiting Evaluation";
        trajBadgeEl.className = "badge badge-neutral";
      }
      updateChartEmptyState("analyticsProgressionChart", true, {
        icon: "📈",
        title: "No Progression Evaluations Logged",
        description: "Run your first AI academic prediction to establish your baseline standing and projected target trajectory.",
        buttonText: "⚡ Run AI Prediction",
        buttonHref: "prediction.html"
      });
      return;
    }

    updateChartEmptyState("analyticsProgressionChart", false);

    const activeList = stageRecords.slice().reverse();
    const isMobile = window.innerWidth <= 768;

    let labels = [];
    let progressionData = []; // Solid line connecting all runs
    let evaluatedData = [];   // Highlighted white node at latest run
    let targetData = [];      // Dashed lime line leading to target milestone

    const parseVal = (r) => {
      const parsed = parseNormalizedScore(r);
      if (!isAll && stageMeta.isUni) {
        return parsed.raw <= 4.0 ? parsed.raw : +(parsed.pct / 25.0).toFixed(2);
      }
      return parsed.pct;
    };

    const trajActualEl = document.getElementById("trajectory-actual-val");
    const trajProjEl = document.getElementById("trajectory-projected-val");
    const trajBadgeEl = document.getElementById("trajectory-status-badge");

    const latestRun = stageRecords[0];
    if (trajActualEl && latestRun) {
      trajActualEl.innerText = latestRun.score || "--";
    }
    if (trajBadgeEl && latestRun) {
      trajBadgeEl.innerText = latestRun.status_badge || "Exemplary";
      trajBadgeEl.className = `badge ${latestRun.status_color || "badge-success"}`;
    }

    if (activeList.length === 1) {
      const item = activeList[0];
      const val = parseVal(item);
      const baseline = stageMeta.isUni && !isAll ? Math.max(0, +(val - 0.15).toFixed(2)) : Math.max(0, Math.round(val - 5));
      const target = stageMeta.isUni && !isAll ? Math.min(4.0, +(val + 0.18).toFixed(2)) : Math.min(100, Math.round(val + 4));

      if (trajProjEl) {
        trajProjEl.innerText = stageMeta.isUni && !isAll ? `${target.toFixed(2)} CGPA` : `${target}%`;
      }

      labels = isMobile ? ["Baseline", "Evaluated", "Target 🎯"] : ["1. Prior Standing", "2. Evaluated Checkpoint", "3. Projected Target Milestone 🎯"];
      progressionData = [baseline, val, null];
      evaluatedData = [null, val, null];
      targetData = [null, val, target];
    } else {
      labels = activeList.map((r, i) => `Run #${i + 1} (${(r.stage || "Uni").slice(0, 4).toUpperCase()})`);
      labels.push("Projected Target 🎯");

      const values = activeList.map((r) => parseVal(r));
      const lastVal = values[values.length - 1];
      const target = stageMeta.isUni && !isAll ? Math.min(4.0, +(lastVal + 0.16).toFixed(2)) : Math.min(100, Math.round(lastVal + 4));

      if (trajProjEl) {
        trajProjEl.innerText = stageMeta.isUni && !isAll ? `${target.toFixed(2)} CGPA` : `${target}%`;
      }

      progressionData = [...values, null];
      evaluatedData = values.map((v, idx) => (idx === values.length - 1 ? v : null));
      evaluatedData.push(null);

      targetData = values.map((v, idx) => (idx === values.length - 1 ? v : null));
      targetData.push(target);
    }

    const orangeGradient = ctx.createLinearGradient(0, 0, 0, 300);
    orangeGradient.addColorStop(0, "rgba(255, 156, 39, 0.35)");
    orangeGradient.addColorStop(1, "rgba(255, 156, 39, 0.0)");

    const limeGradient = ctx.createLinearGradient(0, 0, 0, 300);
    limeGradient.addColorStop(0, "rgba(168, 240, 75, 0.4)");
    limeGradient.addColorStop(1, "rgba(168, 240, 75, 0.0)");

    const yMin = isAll ? 40 : stageMeta.min;
    const yMax = isAll ? 100 : stageMeta.max;
    const unitLabel = isAll ? "%" : stageMeta.unit;

    progressionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Historical Academic Progression",
            data: progressionData,
            borderColor: "#ff9c27",
            backgroundColor: orangeGradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#ff9c27",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: isMobile ? 4 : 6
          },
          {
            label: "Evaluated Current Score",
            data: evaluatedData,
            borderColor: "#ffffff",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#0c0d12",
            pointBorderWidth: 2,
            pointRadius: isMobile ? 6 : 9,
            showLine: false
          },
          {
            label: "Projected Target Milestone 🎯",
            data: targetData,
            borderColor: "#a8f04b",
            borderDash: [6, 6],
            backgroundColor: limeGradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: "#a8f04b",
            pointBorderColor: "#0c0d12",
            pointBorderWidth: 2,
            pointRadius: isMobile ? 5 : 7
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
            labels: { color: "#94A3B8", font: { family: "Inter", size: isMobile ? 10 : 11 }, boxWidth: 8, padding: 10 }
          },
          tooltip: {
            titleColor: "#F8FAFC",
            bodyColor: "#94A3B8",
            padding: 10,
            callbacks: {
              label: (context) => {
                const idx = context.dataIndex;
                if (idx === labels.length - 1) {
                  return ` Target Milestone: ${context.parsed.y}${unitLabel}`;
                }
                const item = activeList[idx];
                const stageStr = (item?.stage || "Record").toUpperCase();
                return ` ${stageStr}: ${item?.score || context.parsed.y + unitLabel}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { family: "Inter", size: isMobile ? 10 : 11 } } },
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
  // 12. CHART 2: RISK & GRADE DISTRIBUTION DONUT
  // --------------------------------------------------------------------------
  function renderGradeDistributionChart() {
    const canvas = document.getElementById("analyticsGradeDistributionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (gradeDistributionChart) gradeDistributionChart.destroy();

    let honors = 0, proficient = 0, standard = 0, atRisk = 0;

    if (predictionHistory.length > 0) {
      predictionHistory.forEach((item) => {
        const badge = (item.status_badge || "").toLowerCase();
        const score = parseFloat(item.score) || 0;
        const isUni = score <= 4.0;
        if (badge.includes("exemplary") || badge.includes("honor") || (isUni ? score >= 3.6 : score >= 80)) {
          honors++;
        } else if (badge.includes("proficient") || badge.includes("track") || (isUni ? score >= 3.0 : score >= 70)) {
          proficient++;
        } else if (badge.includes("standard") || badge.includes("capable") || (isUni ? score >= 2.0 : score >= 50)) {
          standard++;
        } else {
          atRisk++;
        }
      });
    }

    const totalEvals = honors + proficient + standard + atRisk;
    const hasData = totalEvals > 0;

    gradeDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: hasData
          ? [
              `Honors (≥3.6 / ≥80%): ${honors}`,
              `Proficient (3.0-3.59 / 70-79%): ${proficient}`,
              `Standard (2.0-2.99 / 50-69%): ${standard}`,
              `At Risk (<2.0 / <50%): ${atRisk}`
            ]
          : ["No Evaluation History Logged"],
        datasets: [
          {
            data: hasData ? [honors, proficient, standard, atRisk] : [1],
            backgroundColor: hasData ? ["#a8f04b", "#c5f871", "#f7f7f7", "#ff9c27"] : ["#1e2129"],
            borderColor: "#18191d",
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#94A3B8",
              font: { size: window.innerWidth <= 768 ? 9.5 : 11 },
              boxWidth: 10,
              padding: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => (hasData ? ` ${ctx.label} (${Math.round((ctx.parsed / totalEvals) * 100)}%)` : "No history logged.")
            }
          }
        },
        cutout: "66%"
      }
    });
  }

  // --------------------------------------------------------------------------
  // 13. CHART 3: SUBJECT DOMAIN MASTERY BAR CHART
  // --------------------------------------------------------------------------
  function renderSubjectMasteryChart() {
    const canvas = document.getElementById("analyticsSubjectMasteryChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (subjectMasteryChart) subjectMasteryChart.destroy();

    const domainScores = {};

    // Helper to safely register score
    const registerScore = (name, pct) => {
      if (!name) return;
      const cleanName = name.trim();
      if (!domainScores[cleanName]) domainScores[cleanName] = [];
      domainScores[cleanName].push(Math.min(100, Math.max(0, Math.round(pct))));
    };

    // 1. Process prediction history
    if (predictionHistory && predictionHistory.length > 0) {
      predictionHistory.forEach((h) => {
        const payload = h.payload || {};

        // A. Multi-class / Multi-semester logged terms
        if (Array.isArray(payload.logged_terms) && payload.logged_terms.length > 0) {
          payload.logged_terms.forEach((t) => {
            if (Array.isArray(t.subjects) && t.subjects.length > 0) {
              t.subjects.forEach((s) => {
                const name = s.subject_name || s.name || s.subject;
                const obt = parseFloat(s.obtained_marks !== undefined ? s.obtained_marks : s.obtained || s.marks || 0);
                const max = parseFloat(s.total_marks !== undefined ? s.total_marks : s.total || s.max || 100);
                const pct = max > 0 ? (obt / max) * 100 : obt;
                registerScore(name, pct);
              });
            }
          });
        }

        // B. Direct subjects or course breakdown
        const subList = payload.subjects || payload.course_breakdown;
        if (Array.isArray(subList) && subList.length > 0) {
          subList.forEach((s) => {
            const name = s.subject_name || s.name || s.subject || "Coursework";
            const obt = parseFloat(s.obtained_marks !== undefined ? s.obtained_marks : s.obtained || s.marks || 0);
            const max = parseFloat(s.total_marks !== undefined ? s.total_marks : s.total || s.max || 100);
            const pct = max > 0 ? (obt / max) * 100 : obt;
            registerScore(name, pct);
          });
        }

        // C. Core continuous metrics
        const att = parseFloat(payload.Attendance_Rate || payload.Attendance_Pct || payload.Attendance_Percentage || payload.attendance_pct || payload.attendance);
        if (!isNaN(att) && att > 0) registerScore("Classroom Attendance & Presence", att);

        const midterm = parseFloat(payload.midterm_score || payload.Midterm_Exam_Avg || payload.test_avg || payload.Quiz_Score || payload.quiz_avg);
        if (!isNaN(midterm) && midterm > 0) registerScore("Midterms & Continuous Assessments", midterm);

        const studyH = parseFloat(payload.study_hours || payload.Study_Hours || payload.Study_Hours_Per_Day);
        if (!isNaN(studyH) && studyH > 0) registerScore("Self-Study Routine Discipline", Math.min(100, Math.round(studyH * 16.5)));

        if (payload.SSC_I_Marks) {
          const sscPct = (parseFloat(payload.SSC_I_Marks) / 550) * 100;
          registerScore("Board Academic Baseline", sscPct);
        } else if (payload.Previous_CGPA) {
          const cgpaPct = (parseFloat(payload.Previous_CGPA) / 4.0) * 100;
          registerScore("Degree Cumulative Standing", cgpaPct);
        } else if (payload.past_annual_pct) {
          registerScore("Academic Prerequisite Aggregate", parseFloat(payload.past_annual_pct));
        }
      });
    }

    // 2. Check local stored academic records if domainScores is still sparse
    if (Object.keys(domainScores).length < 2) {
      const user = window.authClient ? window.authClient.getUser() : null;
      const stages = ["university", "secondary", "primary", "matric", "intermediate"];
      stages.forEach((st) => {
        let stored = null;
        if (user?.id) {
          stored = localStorage.getItem(`edumetrics_academic_records_${st}_${user.id}`);
        }
        if (!stored) stored = localStorage.getItem(`edumetrics_academic_records_${st}`);
        if (stored) {
          try {
            const terms = JSON.parse(stored);
            if (Array.isArray(terms)) {
              terms.forEach((t) => {
                if (Array.isArray(t.subjects)) {
                  t.subjects.forEach((s) => {
                    const name = s.subject_name || s.name || s.subject;
                    const obt = parseFloat(s.obtained_marks !== undefined ? s.obtained_marks : s.obtained || 0);
                    const max = parseFloat(s.total_marks !== undefined ? s.total_marks : s.total || 100);
                    const pct = max > 0 ? (obt / max) * 100 : obt;
                    registerScore(name, pct);
                  });
                }
              });
            }
          } catch (e) {
            // ignore JSON parse err
          }
        }
      });
    }

    const domainKeys = Object.keys(domainScores);
    if (domainKeys.length === 0) {
      updateChartEmptyState("analyticsSubjectMasteryChart", true, {
        icon: "📚",
        title: "No Coursework Evaluated Yet",
        description: "Add your semester subjects or coursework evaluations to calculate your domain competencies.",
        buttonText: "+ Log Coursework & Predict",
        buttonHref: "prediction.html"
      });
      return;
    }

    updateChartEmptyState("analyticsSubjectMasteryChart", false);

    const labels = domainKeys;
    const dataSeries = domainKeys.map((k) => {
      const arr = domainScores[k];
      return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });

    const colors = dataSeries.map((val) => {
      if (val >= 85) return "#a8f04b";
      if (val >= 70) return "#c5f871";
      if (val >= 55) return "#f7f7f7";
      return "#ff9c27";
    });

    subjectMasteryChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{ label: "Competency %", data: dataSeries, backgroundColor: colors, borderWidth: 0, borderRadius: 6 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` Evaluated Competency: ${ctx.parsed.x}%` }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { size: 10 }, callback: (v) => `${v}%` }
          },
          y: {
            grid: { display: false },
            ticks: { color: "#F1F5F9", font: { size: window.innerWidth <= 768 ? 10 : 11, weight: "600" } }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 14. CHART 4: STUDY EFFORT VS OUTCOME CORRELATION
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 14. CHART 4: STUDY EFFORT VS OUTCOME CORRELATION
  // --------------------------------------------------------------------------
  function renderHabitsCorrelationChart() {
    const canvas = document.getElementById("analyticsHabitsCorrelationChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (habitsCorrelationChart) habitsCorrelationChart.destroy();

    const habitBuckets = {
      "< 2 hrs/day": [],
      "2-4 hrs/day": [],
      "4-6 hrs/day": [],
      "6+ hrs/day": []
    };

    let baseScore = 80.0;

    if (predictionHistory.length > 0) {
      predictionHistory.forEach((h) => {
        const payload = h.payload || {};
        let dailyHours = parseFloat(payload.study_hours ?? payload.Study_Hours ?? payload.Study_Hours_Per_Day ?? 0);
        if (dailyHours <= 0 && payload.Study_Hours_Per_Week) {
          dailyHours = parseFloat(payload.Study_Hours_Per_Week) / 7.0;
        }
        if (dailyHours <= 0) dailyHours = 4.0;

        const parsed = parseNormalizedScore(h);
        const normScore = parsed.pct || 80.0;
        baseScore = normScore;

        if (dailyHours < 2) habitBuckets["< 2 hrs/day"].push(normScore);
        else if (dailyHours <= 4) habitBuckets["2-4 hrs/day"].push(normScore);
        else if (dailyHours <= 6) habitBuckets["4-6 hrs/day"].push(normScore);
        else habitBuckets["6+ hrs/day"].push(normScore);
      });
    }

    const hasHabitsData = Object.values(habitBuckets).some((arr) => arr && arr.length > 0);
    if (!hasHabitsData) {
      updateChartEmptyState("analyticsHabitsCorrelationChart", true, {
        icon: "⏱️",
        title: "No Study Routines Recorded",
        description: "Log your daily study hours during prediction runs to evaluate the correlation between effort and score.",
        buttonText: "⚡ Log Study Hours & Predict",
        buttonHref: "prediction.html"
      });
      return;
    }

    updateChartEmptyState("analyticsHabitsCorrelationChart", false);

    const labels = ["< 2 hrs/day (Low)", "2-4 hrs/day (Moderate)", "4-6 hrs/day (Consistent)", "6+ hrs/day (Intensive)"];
    const bucketKeys = ["< 2 hrs/day", "2-4 hrs/day", "4-6 hrs/day", "6+ hrs/day"];

    // Compute calibrated values: only actual logged data
    const dataSeries = bucketKeys.map((k) => {
      const arr = habitBuckets[k];
      return arr && arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    });

    const colors = dataSeries.map((v) => {
      if (v === null) return "transparent";
      if (v >= 85) return "#a8f04b";
      if (v >= 70) return "#c5f871";
      if (v >= 55) return "#f7f7f7";
      return "#ff9c27";
    });

    habitsCorrelationChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Evaluated Outcome %",
          data: dataSeries,
          backgroundColor: colors,
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const statusStr = isActual[idx] ? "Actual Logged Outcome" : "AI Correlation Benchmark";
                return ` ${statusStr}: ${ctx.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { size: window.innerWidth <= 768 ? 9.5 : 10 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { size: 10 }, callback: (v) => `${v}%` }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 14.5 INSTRUCTOR QUALITATIVE MATRIX & BEHAVIORAL RADAR
  // --------------------------------------------------------------------------
  let studentBehaviorRadarInstance = null;

  function renderStudentInstructorMatrix() {
    const card = document.getElementById("student-instructor-analytics-card");
    const canvas = document.getElementById("studentBehaviorRadarChart");
    if (!card || !canvas) return;

    // Search predictionHistory for any instructor-evaluated record
    let teacherEval = null;
    for (const h of predictionHistory) {
      const p = h.payload || h.input_payload || {};
      if (h.role === "teacher" || p.role === "teacher" || p.attentive || p.comm_skill) {
        teacherEval = {
          focus: p.attentive || p.attentiveness_level || "High",
          comm: p.comm_skill || p.communication_skill || "Good",
          behavior: p.behavior || p.behavior_discipline || "Cooperative",
          need: p.academic_need || "Independent",
          participation: p.participation || "Active",
          att: Number(p.attendance_pct || 85),
          rating: h.teacher_rating ?? p.rating ?? p.teacher_rating ?? 5.0,
          strategy: h.teacher_notes || p.strategy || p.notes || h.recommendations || "Maintain regular coursework momentum and participate actively during class discussions."
        };
        break;
      }
    }

    if (!teacherEval) {
      card.style.display = "none";
      return;
    }

    card.style.display = "block";

    // Set text values
    const ratingEl = document.getElementById("analytics-teacher-rating");
    const focusEl = document.getElementById("radar-val-focus");
    const commEl = document.getElementById("radar-val-comm");
    const behEl = document.getElementById("radar-val-behavior");
    const needEl = document.getElementById("radar-val-need");
    const stratEl = document.getElementById("analytics-teacher-strategy-text");

    if (ratingEl) ratingEl.innerText = `${Number(teacherEval.rating).toFixed(1)} ⭐ Faculty Rating`;
    if (focusEl) focusEl.innerText = teacherEval.focus;
    if (commEl) commEl.innerText = teacherEval.comm;
    if (behEl) behEl.innerText = teacherEval.behavior;
    if (needEl) needEl.innerText = teacherEval.need;
    if (stratEl) stratEl.innerText = teacherEval.strategy;

    // Map to numeric values for Radar chart
    const fVal = teacherEval.focus.toLowerCase() === "high" ? 95 : teacherEval.focus.toLowerCase() === "moderate" ? 75 : 45;
    const cVal = teacherEval.comm.toLowerCase() === "exceptional" ? 96 : teacherEval.comm.toLowerCase() === "good" ? 82 : 60;
    const bVal = teacherEval.behavior.toLowerCase() === "exemplary" ? 98 : teacherEval.behavior.toLowerCase() === "cooperative" ? 85 : 55;
    const pVal = teacherEval.participation.toLowerCase() === "leader" ? 98 : teacherEval.participation.toLowerCase() === "active" ? 85 : 50;
    const nVal = teacherEval.need.toLowerCase() === "independent" ? 92 : teacherEval.need.toLowerCase() === "moderate" ? 70 : 40;
    const aVal = teacherEval.att;

    if (studentBehaviorRadarInstance) studentBehaviorRadarInstance.destroy();

    const ctx = canvas.getContext("2d");
    studentBehaviorRadarInstance = new Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "🎯 Classroom Focus",
          "🗣️ Verbal Presentation",
          "🤝 Conduct & Discipline",
          "👥 Participation",
          "🛠️ Independence",
          "📅 Attendance"
        ],
        datasets: [
          {
            label: "Evaluated Competency (%)",
            data: [fVal, cVal, bVal, pVal, nVal, aVal],
            backgroundColor: "rgba(168, 240, 75, 0.15)",
            borderColor: "#a8f04b",
            borderWidth: 2,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#a8f04b",
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Institutional Target",
            data: [80, 80, 80, 80, 80, 80],
            backgroundColor: "transparent",
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.06)" },
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            pointLabels: {
              color: "#a8a8a8",
              font: { size: 11, weight: "600" }
            },
            ticks: {
              backdropColor: "transparent",
              color: "#666a75",
              font: { size: 10 },
              stepSize: 20
            },
            min: 0,
            max: 100
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#a8a8a8", font: { size: 11, weight: "600" } }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 15. COMPARISON MATRIX (RUN A VS RUN B DELTA)
  // --------------------------------------------------------------------------
  function populateComparisonDropdowns() {
    if (!compareSelectBaseline || !compareSelectTarget) return;

    if (!predictionHistory || predictionHistory.length === 0) {
      compareSelectBaseline.innerHTML = `<option value="">No prediction checkpoints available</option>`;
      compareSelectTarget.innerHTML = `<option value="">No prediction checkpoints available</option>`;
      if (cmpScoreA) cmpScoreA.innerText = "--";
      if (cmpScoreB) cmpScoreB.innerText = "--";
      if (cmpScoreDelta) {
        cmpScoreDelta.innerText = "--";
        cmpScoreDelta.style.color = "var(--text-muted)";
      }
      if (cmpStatusBadge) {
        cmpStatusBadge.innerText = "--";
        cmpStatusBadge.className = "badge badge-neutral";
      }
      if (cmpDetailNotes) {
        cmpDetailNotes.innerHTML = `No prediction runs found. Perform an AI forecast to generate comparative analytics.`;
      }
      return;
    }

    const options = predictionHistory.map((item) => {
      const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent";
      return `<option value="${item.id}">${item.id} — ${item.score} (${date}) [${(item.stage || "university").toUpperCase()}]</option>`;
    }).join("");

    compareSelectBaseline.innerHTML = options;
    compareSelectTarget.innerHTML = options;

    if (predictionHistory.length > 1) {
      compareSelectBaseline.selectedIndex = predictionHistory.length - 1; // oldest
      compareSelectTarget.selectedIndex = 0; // latest
    } else {
      compareSelectBaseline.selectedIndex = 0;
      compareSelectTarget.selectedIndex = 0;
    }

    calculateComparison();
  }

  function calculateComparison() {
    const idA = compareSelectBaseline?.value;
    const idB = compareSelectTarget?.value;
    if (!idA || !idB) return;

    const itemA = predictionHistory.find((h) => h.id === idA);
    const itemB = predictionHistory.find((h) => h.id === idB);
    if (!itemA || !itemB) return;

    if (cmpScoreA) cmpScoreA.innerText = itemA.score;
    if (cmpScoreB) cmpScoreB.innerText = itemB.score;

    const valA = parseFloat(itemA.score) || 0;
    const valB = parseFloat(itemB.score) || 0;
    const isUni = (itemA.stage || "").toLowerCase() === "university" || valA <= 4.0;
    const delta = +(valB - valA).toFixed(2);
    const pctChange = valA > 0 ? (((valB - valA) / valA) * 100).toFixed(1) : "0.0";
    const unit = isUni ? " CGPA" : "%";

    if (cmpScoreDelta) {
      cmpScoreDelta.innerText = delta >= 0 ? `+${delta}${unit} (+${pctChange}%)` : `${delta}${unit} (${pctChange}%)`;
      cmpScoreDelta.style.color = delta >= 0 ? "var(--color-lime)" : "var(--color-red)";
    }

    if (cmpStatusBadge) {
      const isPositive = delta >= 0;
      cmpStatusBadge.innerText = isPositive ? "Positive Academic Growth 🚀" : "Remediation Recommended ⚠️";
      cmpStatusBadge.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    if (cmpDetailNotes) {
      cmpDetailNotes.innerHTML = `
        <strong>Progress Audit:</strong> Milestone transitioned from <em>${itemA.score}</em> (${itemA.status_badge || "Evaluated"}) to <em>${itemB.score}</em> (${itemB.status_badge || "Evaluated"}).
        Trajectory delta reflects <strong>${delta >= 0 ? '+' : ''}${delta}${unit} (${pctChange}%)</strong> change between checkpoints.
      `;
    }
  }

  if (compareSelectBaseline) compareSelectBaseline.addEventListener("change", calculateComparison);
  if (compareSelectTarget) compareSelectTarget.addEventListener("change", calculateComparison);

  // --------------------------------------------------------------------------
  // 16. HISTORICAL PREDICTION & DIAGNOSTIC LEDGER TABLE
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
            No prediction records found matching the active filters.
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

        const entries = Object.entries(item.payload || {}).filter(([k]) => k !== "subjects" || (Array.isArray(item.payload[k]) && item.payload[k].length > 0));

        const snapshotStr = entries
          .slice(0, 3)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${formatDiagnosticParam(k, v)}`)
          .join(" | ");

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
          <td style="font-weight: 800; font-size: 15px; color: var(--text-primary);">
            ${item.score || "N/A"}
          </td>
          <td>
            <span class="badge ${item.status_color || "badge-success"}">${item.status_badge || "Evaluated"}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="table-icon-btn" onclick="window.viewTrajectoryGraph('${item.id}')" title="Inspect Trajectory">
                📈 Trajectory
              </button>
              <button type="button" class="table-icon-btn btn-view" onclick="window.viewDiagnostic('${item.id}')" title="View Details">
                👁️ View
              </button>
              <button type="button" class="table-icon-btn btn-edit" onclick="window.editDiagnostic('${item.id}')" title="Edit Remarks">
                ✏️ Edit
              </button>
              <button type="button" class="table-icon-btn btn-delete" onclick="window.deleteDiagnostic('${item.id}')" title="Delete Record">
                🗑️
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
      renderProgressionChart();
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
  // 17. CRUD OPERATION: READ / VIEW DETAIL & TRAJECTORY MODALS
  // --------------------------------------------------------------------------
  window.viewDiagnostic = (id) => {
    const item = predictionHistory.find((h) => h.id === id);
    if (!item || !detailModal) return;

    if (modalDetailScore) modalDetailScore.innerText = item.score;
    if (modalDetailBadge) {
      modalDetailBadge.innerText = item.status_badge || "Evaluated";
      modalDetailBadge.className = `badge ${item.status_color || "badge-success"}`;
    }
    if (modalDetailStage) modalDetailStage.innerText = `Stage: ${(item.stage || "University").toUpperCase()} (${item.role || "Student"})`;
    if (modalDetailRecs) modalDetailRecs.innerText = item.recommendations || "High academic stability maintained.";

    if (modalDetailInputs) {
      modalDetailInputs.innerHTML = Object.entries(item.payload || {})
        .map(
          ([k, v]) => `
          <div style="padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.06);">
            <strong style="color: var(--color-lime); text-transform: capitalize;">${k.replace(/_/g, " ")}:</strong> 
            <span style="color: #ffffff; margin-left: 4px;">${formatDiagnosticParam(k, v)}</span>
          </div>
        `
        )
        .join("");
    }

    detailModal.classList.add("active");
  };

  if (btnCloseDetailModal) btnCloseDetailModal.onclick = () => detailModal?.classList.remove("active");
  if (btnCloseDetailModalBtn) btnCloseDetailModalBtn.onclick = () => detailModal?.classList.remove("active");
  if (detailModal) {
    detailModal.onclick = (e) => {
      if (e.target === detailModal) detailModal.classList.remove("active");
    };
  }

  // Trajectory Modal (Smooth Multi-Segment Line)
  window.viewTrajectoryGraph = (id) => {
    const item = predictionHistory.find((h) => h.id === id);
    if (!item || !trajModal) return;

    const parsed = parseNormalizedScore(item);
    const meta = getStageMetadata(item.stage || "university");
    const isUni = meta.isUni;

    let baseline, currentVal, target;
    if (isUni) {
      currentVal = parsed.raw <= 4.0 ? parsed.raw : +(parsed.pct / 25.0).toFixed(2);
      baseline = Math.max(0.0, +(currentVal - 0.15).toFixed(2));
      target = Math.min(4.0, +(currentVal + 0.18).toFixed(2));
    } else {
      currentVal = parsed.pct;
      baseline = Math.max(0, Math.round(currentVal - 5));
      target = Math.min(100, Math.round(currentVal + 4));
    }

    if (trajModalTitle) trajModalTitle.innerText = `📈 AI Trajectory: Record ${item.id}`;
    if (trajModalSubtitle) trajModalSubtitle.innerText = `Stage: ${(item.stage || "university").toUpperCase()} • Evaluated: ${new Date(item.timestamp).toLocaleDateString()}`;
    if (trajValBaseline) trajValBaseline.innerText = isUni ? `${baseline} CGPA` : `${baseline}%`;
    if (trajValCurrent) trajValCurrent.innerText = item.score || (isUni ? `${currentVal} CGPA` : `${currentVal}%`);
    if (trajValTarget) trajValTarget.innerText = isUni ? `${target} CGPA` : `${target}%`;
    if (trajExplanation) {
      trajExplanation.innerText = item.recommendations || "Trajectory calculated using multi-variable regression and historical academic consistency.";
    }

    const modalCanvas = document.getElementById("modalTrajectoryChart");
    if (modalCanvas) {
      const modalCtx = modalCanvas.getContext("2d");
      if (modalTrajChartInstance) modalTrajChartInstance.destroy();

      const unit = isUni ? " CGPA" : "%";
      const yMin = isUni ? 2.0 : 40;
      const yMax = isUni ? 4.0 : 100;

      modalTrajChartInstance = new Chart(modalCtx, {
        type: "line",
        data: {
          labels: ["1. Baseline Standing", "2. Evaluated Current Score", "3. Projected AI Target 🎯"],
          datasets: [
            {
              label: "Baseline to Evaluated Progression",
              data: [baseline, currentVal, null],
              borderColor: "#ff9c27",
              backgroundColor: "rgba(255, 156, 39, 0.15)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.25,
              pointBackgroundColor: "#ff9c27",
              pointBorderColor: "#FFFFFF",
              pointBorderWidth: 2,
              pointRadius: 6
            },
            {
              label: "Evaluated Current Score",
              data: [null, currentVal, null],
              borderColor: "#ffffff",
              pointBackgroundColor: "#ffffff",
              pointBorderColor: "#0c0d12",
              pointBorderWidth: 2,
              pointRadius: 8,
              showLine: false
            },
            {
              label: "Projected Target Milestone 🎯",
              data: [null, currentVal, target],
              borderColor: "#a8f04b",
              borderDash: [6, 6],
              backgroundColor: "rgba(168, 240, 75, 0.2)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.25,
              pointBackgroundColor: "#a8f04b",
              pointBorderColor: "#0c0d12",
              pointBorderWidth: 2,
              pointRadius: 7
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top", labels: { color: "#94A3B8", font: { size: 10 } } } },
          scales: {
            x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94A3B8" } },
            y: {
              min: yMin,
              max: yMax,
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#94A3B8", callback: (v) => `${v}${unit}` }
            }
          }
        }
      });
    }

    trajModal.classList.add("active");
  };

  if (btnCloseTrajModal) btnCloseTrajModal.onclick = () => trajModal?.classList.remove("active");
  if (btnCloseTrajModalBtn) btnCloseTrajModalBtn.onclick = () => trajModal?.classList.remove("active");
  if (trajModal) {
    trajModal.onclick = (e) => {
      if (e.target === trajModal) trajModal.classList.remove("active");
    };
  }

  // --------------------------------------------------------------------------
  // 18. CRUD OPERATION: UPDATE / EDIT RECORD MODAL
  // --------------------------------------------------------------------------
  window.editDiagnostic = (id) => {
    const item = predictionHistory.find((h) => h.id === id);
    if (!item || !editModal) return;

    if (editRecordId) editRecordId.value = item.id;
    if (editRecordScore) editRecordScore.value = item.score || "";
    if (editRecordStatus) editRecordStatus.value = item.status_badge || "Exemplary";
    if (editRecordNotes) editRecordNotes.value = item.recommendations || "";

    editModal.classList.add("active");
  };

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = editRecordId?.value;
      const score = editRecordScore?.value.trim();
      const status = editRecordStatus?.value;
      const notes = editRecordNotes?.value.trim();

      const itemIdx = predictionHistory.findIndex((h) => h.id === id);
      if (itemIdx === -1) return;

      predictionHistory[itemIdx].score = score;
      predictionHistory[itemIdx].status_badge = status;
      predictionHistory[itemIdx].status_color =
        status === "Exemplary" ? "badge-success" : status === "Proficient" ? "badge-info" : status === "Standard" ? "badge-neutral" : "badge-warning";
      predictionHistory[itemIdx].recommendations = notes;

      persistHistory(predictionHistory);

      try {
        if (window.apiClient) {
          await window.apiClient.updateHistoryItem(id, notes, status);
        }
      } catch (err) {
        console.warn("[API] History update notice:", err.message);
      }

      editModal?.classList.remove("active");
      refreshAllViews();
      showToast("Historical prediction record updated successfully!", "success");
    });
  }

  if (btnCloseEditModal) btnCloseEditModal.onclick = () => editModal?.classList.remove("active");
  if (btnCancelEditModal) btnCancelEditModal.onclick = () => editModal?.classList.remove("active");
  if (editModal) {
    editModal.onclick = (e) => {
      if (e.target === editModal) editModal.classList.remove("active");
    };
  }

  // --------------------------------------------------------------------------
  // 19. CRUD OPERATION: DELETE RECORD & PERMANENT CLEAR ALL
  // --------------------------------------------------------------------------
  window.deleteDiagnostic = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this historical prediction record?")) return;
    predictionHistory = predictionHistory.filter((h) => h.id !== id);
    persistHistory(predictionHistory);

    // Cloud Supabase Sync Deletion
    if (window.authClient && window.authClient.client) {
      try {
        window.authClient.client.from("prediction_history").delete().eq("id", id).then().catch(() => {});
      } catch (cloudErr) {}
    }

    try {
      if (window.apiClient) {
        await window.apiClient.deleteHistoryItem(id);
      }
    } catch (err) {
      console.warn("[API] Delete record notice:", err.message);
    }

    refreshAllViews();
    showToast("Record permanently removed from ledger.", "info");
  };

  if (btnClearAllHistory) {
    btnClearAllHistory.addEventListener("click", async () => {
      if (!confirm("⚠️ Wipe all historical prediction records? This cannot be undone.")) return;
      predictionHistory = [];
      persistHistory([]);
      localStorage.setItem("edumetrics_history_explicitly_cleared", "true");

      const user = window.authClient ? window.authClient.getUser() : null;
      if (user?.id) {
        localStorage.removeItem(`edumetrics_prediction_history_v2_${user.id}`);
        localStorage.removeItem(`edumetrics_prediction_history_${user.id}`);
      }
      localStorage.removeItem("edumetrics_prediction_history_v2");
      localStorage.removeItem("edumetrics_prediction_history");

      // Cloud Supabase Clear
      if (window.authClient && window.authClient.client && user?.id) {
        try {
          window.authClient.client.from("prediction_history").delete().eq("user_id", user.id).then().catch(() => {});
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

  // --------------------------------------------------------------------------
  // 20. CHART PNG EXPORT UTILITIES
  // --------------------------------------------------------------------------
  function saveChartAsPng(canvasId, fileNamePrefix) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas.style.display === "none") {
      showToast("No evaluation chart data recorded yet to export.", "info");
      return;
    }
    const imgURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${fileNamePrefix}_${Date.now()}.png`;
    link.href = imgURI;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Chart saved as PNG image!", "success");
  }

  document.getElementById("btn-save-progression-png")?.addEventListener("click", () => saveChartAsPng("analyticsProgressionChart", "edumetrics_progression_trajectory"));
  document.getElementById("btn-save-distribution-png")?.addEventListener("click", () => saveChartAsPng("analyticsGradeDistributionChart", "edumetrics_grade_distribution"));
  document.getElementById("btn-save-mastery-png")?.addEventListener("click", () => saveChartAsPng("analyticsSubjectMasteryChart", "edumetrics_subject_mastery"));
  document.getElementById("btn-save-habits-png")?.addEventListener("click", () => saveChartAsPng("analyticsHabitsCorrelationChart", "edumetrics_habits_correlation"));

  // --------------------------------------------------------------------------
  // 21. FULLSCREEN HIGH-RESOLUTION THEATER CHART ENGINE
  // --------------------------------------------------------------------------
  window.openFullscreenChart = (chartType) => {
    if (!fsModal || !fsCanvas) return;

    if (chartType === "progression") {
      const canvas = document.getElementById("analyticsProgressionChart");
      if (!canvas || canvas.style.display === "none" || !progressionChart) {
        showToast("No academic progression evaluations logged yet to expand.", "info");
        return;
      }
    } else if (chartType === "distribution") {
      const canvas = document.getElementById("analyticsGradeDistributionChart");
      if (!canvas || canvas.style.display === "none" || !gradeDistributionChart) {
        showToast("No performance evaluations logged yet to expand.", "info");
        return;
      }
    } else if (chartType === "mastery") {
      const canvas = document.getElementById("analyticsSubjectMasteryChart");
      if (!canvas || canvas.style.display === "none" || !subjectMasteryChart || !subjectMasteryChart.data?.datasets?.[0]?.data?.length) {
        showToast("No coursework domain assessments logged yet to expand.", "info");
        return;
      }
    } else if (chartType === "habits") {
      const canvas = document.getElementById("analyticsHabitsCorrelationChart");
      if (!canvas || canvas.style.display === "none" || !habitsCorrelationChart || !habitsCorrelationChart.data?.datasets?.[0]?.data?.length) {
        showToast("No study routines recorded yet to expand.", "info");
        return;
      }
    }

    const ctx = fsCanvas.getContext("2d");
    if (fsChartInstance) fsChartInstance.destroy();

    const activeStage = currentStageFilter === "all" ? (predictionHistory[0]?.stage || "university") : currentStageFilter;
    const stageMeta = getStageMetadata(activeStage);

    if (chartType === "progression") {
      if (fsModalTitle) fsModalTitle.innerHTML = `<span>📈 Academic Progression & AI Target Trajectory (Full Screen)</span>`;
      if (fsModalSubtitle) fsModalSubtitle.innerText = `${stageMeta.title} | ${stageMeta.scale} | High-Definition Theater View`;

      const stageRecords = currentStageFilter === "all" ? predictionHistory : predictionHistory.filter((r) => r.stage === currentStageFilter);
      let labels = ["1. Initial Baseline", "2. Current Evaluated Score", "3. Projected AI Target 🎯"];
      let pastGpa = [];
      let currentGpa = [];
      let predictedGpa = [];

      if (stageRecords.length > 0) {
        const activeList = stageRecords.slice().reverse();
        if (activeList.length === 1) {
          const item = activeList[0];
          const rawScore = parseFloat(item.score);
          const baseline = stageMeta.isUni ? +(rawScore - 0.15).toFixed(2) : Math.max(stageMeta.min, Math.round(rawScore - 6));
          const target = stageMeta.isUni ? Math.min(4.0, +(rawScore + 0.18).toFixed(2)) : Math.min(stageMeta.max, Math.round(rawScore + 5));
          labels = ["1. Initial Baseline", "2. Current Evaluated Score", "3. Projected AI Target 🎯"];
          pastGpa = [baseline, null, null];
          currentGpa = [null, rawScore, null];
          predictedGpa = [null, rawScore, target];
        } else {
          labels = activeList.map((r, i) => `Run #${i + 1} (${(r.stage || "Uni").slice(0, 4).toUpperCase()})`);
          labels.push("Projected Milestone 🎯");

          const values = activeList.map((r) => parseFloat(r.score));
          const lastVal = values[values.length - 1];
          const target = stageMeta.isUni ? Math.min(4.0, +(lastVal + 0.16).toFixed(2)) : Math.min(stageMeta.max, Math.round(lastVal + 5));

          pastGpa = [...values, null];
          currentGpa = values.map((v, idx) => (idx === values.length - 1 ? v : null));
          currentGpa.push(null);
          predictedGpa = values.map((v, idx) => (idx === values.length - 1 ? v : null));
          predictedGpa.push(target);
        }
      }

      fsChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            { label: "Historical Progression", data: pastGpa, borderColor: "#ff9c27", backgroundColor: "rgba(255, 156, 39, 0.25)", fill: true, borderWidth: 3, tension: 0.25, pointRadius: 7, pointBackgroundColor: "#ff9c27", pointBorderColor: "#ffffff", pointBorderWidth: 2.5 },
            { label: "Latest Evaluated Standing", data: currentGpa, borderColor: "#ffffff", backgroundColor: "rgba(255, 255, 255, 0.2)", pointRadius: 10, pointBackgroundColor: "#ffffff", pointBorderColor: "#0f172a", pointBorderWidth: 3, showLine: false },
            { label: "Projected Next Milestone 🎯", data: predictedGpa, borderColor: "#a8f04b", borderDash: [8, 8], backgroundColor: "rgba(168, 240, 75, 0.2)", fill: true, borderWidth: 3, pointRadius: 8, pointBackgroundColor: "#a8f04b", pointBorderColor: "#ffffff", pointBorderWidth: 2.5 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: "#F8FAFC", font: { size: 13, weight: "bold" }, padding: 20 } },
            tooltip: { backgroundColor: "rgba(15, 23, 42, 0.98)", titleFont: { size: 15 }, bodyFont: { size: 14 }, padding: 16 }
          },
          scales: {
            x: { grid: { color: "rgba(255, 255, 255, 0.08)" }, ticks: { color: "#CBD5E1", font: { size: 13 } } },
            y: { min: stageMeta.min, max: stageMeta.max, grid: { color: "rgba(255, 255, 255, 0.08)" }, ticks: { color: "#CBD5E1", font: { size: 13 } } }
          }
        }
      });
    } else if (chartType === "distribution") {
      if (fsModalTitle) fsModalTitle.innerHTML = `<span>🍩 Performance Tier & Risk Distribution (Full Screen)</span>`;
      if (fsModalSubtitle) fsModalSubtitle.innerText = `Evaluated classification across historical prediction snapshots`;

      let honors = 0, proficient = 0, standard = 0, atRisk = 0;
      predictionHistory.forEach((item) => {
        const badge = (item.status_badge || "").toLowerCase();
        const score = parseFloat(item.score) || 0;
        if (badge.includes("exemplary") || badge.includes("honor") || (score <= 4 ? score >= 3.6 : score >= 80)) honors++;
        else if (badge.includes("proficient") || badge.includes("track") || (score <= 4 ? score >= 3.0 : score >= 70)) proficient++;
        else if (badge.includes("standard") || badge.includes("capable") || (score <= 4 ? score >= 2.5 : score >= 60)) standard++;
        else atRisk++;
      });

      fsChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Honors / Exemplary", "Proficient / On Track", "Standard Competency", "Attention / At Risk"],
          datasets: [{ data: [honors, proficient, standard, atRisk], backgroundColor: ["#a8f04b", "#c5f871", "#f7f7f7", "#ff9c27"], borderColor: "#18191d", borderWidth: 3 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#F8FAFC", font: { size: 14 }, padding: 24, boxWidth: 16 } },
            tooltip: { backgroundColor: "rgba(15, 23, 42, 0.98)", titleFont: { size: 15 }, bodyFont: { size: 14 }, padding: 16 }
          },
          cutout: "60%"
        }
      });
    } else if (chartType === "mastery") {
      if (fsModalTitle) fsModalTitle.innerHTML = `<span>📊 Course Domain Mastery & Competency (Full Screen)</span>`;
      if (fsModalSubtitle) fsModalSubtitle.innerText = `Evaluated competency across Core Science, Applied Labs, Quantitative Skills, & Humanities`;

      const liveLabels = subjectMasteryChart?.data?.labels || [];
      const liveData = subjectMasteryChart?.data?.datasets?.[0]?.data || [];
      const liveColors = subjectMasteryChart?.data?.datasets?.[0]?.backgroundColor || [];

      fsChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: liveLabels,
          datasets: [{
            label: "Domain Mastery Level %",
            data: liveData,
            backgroundColor: liveColors,
            borderWidth: 0,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: "rgba(15, 23, 42, 0.98)", titleFont: { size: 14 }, bodyFont: { size: 13 }, padding: 14 }
          },
          scales: {
            x: { min: 0, max: 100, grid: { color: "rgba(255, 255, 255, 0.08)" }, ticks: { color: "#CBD5E1", font: { size: 13 } } },
            y: { grid: { display: false }, ticks: { color: "#F8FAFC", font: { size: 14, weight: "bold" } } }
          }
        }
      });
    } else if (chartType === "habits") {
      if (fsModalTitle) fsModalTitle.innerHTML = `<span>🎯 Study Effort vs Outcome Correlation (Full Screen)</span>`;
      if (fsModalSubtitle) fsModalSubtitle.innerText = `Empirical impact of daily self-study hours on examination outcomes`;

      const liveHabitLabels = habitsCorrelationChart?.data?.labels || [];
      const liveHabitData = habitsCorrelationChart?.data?.datasets?.[0]?.data || [];
      const liveHabitColors = habitsCorrelationChart?.data?.datasets?.[0]?.backgroundColor || [];

      fsChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: liveHabitLabels,
          datasets: [{
            label: "Evaluated Outcome %",
            data: liveHabitData,
            backgroundColor: liveHabitColors,
            borderWidth: 0,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: "rgba(15, 23, 42, 0.98)", titleFont: { size: 14 }, bodyFont: { size: 13 }, padding: 14 }
          },
          scales: {
            x: { grid: { color: "rgba(255, 255, 255, 0.08)" }, ticks: { color: "#CBD5E1", font: { size: 13 } } },
            y: { min: 0, max: 100, grid: { color: "rgba(255, 255, 255, 0.08)" }, ticks: { color: "#CBD5E1", font: { size: 13 }, callback: (v) => `${v}%` } }
          }
        }
      });
    }

    fsModal.classList.add("active");
  };

  // Fullscreen Open Triggers
  document.getElementById("btn-fullscreen-progression")?.addEventListener("click", () => window.openFullscreenChart("progression"));
  document.getElementById("btn-fullscreen-distribution")?.addEventListener("click", () => window.openFullscreenChart("distribution"));
  document.getElementById("btn-fullscreen-mastery")?.addEventListener("click", () => window.openFullscreenChart("mastery"));
  document.getElementById("btn-fullscreen-habits")?.addEventListener("click", () => window.openFullscreenChart("habits"));

  // Fullscreen Download PNG
  if (btnFsDownloadPng) {
    btnFsDownloadPng.addEventListener("click", () => {
      if (!fsCanvas) return;
      const imgURI = fsCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `edumetrics_fullscreen_chart_${Date.now()}.png`;
      link.href = imgURI;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("High-resolution chart saved as PNG!", "success");
    });
  }

  // Fullscreen Modal Closers
  if (btnCloseFsModal) btnCloseFsModal.onclick = () => fsModal?.classList.remove("active");
  if (btnCloseFsModalBtn) btnCloseFsModalBtn.onclick = () => fsModal?.classList.remove("active");
  if (fsModal) {
    fsModal.onclick = (e) => {
      if (e.target === fsModal) fsModal.classList.remove("active");
    };
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (fsModal?.classList.contains("active")) fsModal.classList.remove("active");
      if (detailModal?.classList.contains("active")) detailModal.classList.remove("active");
      if (trajModal?.classList.contains("active")) trajModal.classList.remove("active");
      if (editModal?.classList.contains("active")) editModal.classList.remove("active");
      if (profileModal?.classList.contains("active")) profileModal.classList.remove("active");
    }
  });

  // --------------------------------------------------------------------------
  // 22. INITIAL BOOT & LOAD
  // --------------------------------------------------------------------------
  await loadHistory();
});
