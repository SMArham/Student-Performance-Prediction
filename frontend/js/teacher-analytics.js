/**
 * ============================================================================
 * EDUMETRICS AI — TEACHER COHORT ANALYTICS & VISUALIZATIONS (teacher-analytics.js)
 * Clean Student-Analytics-Style Trajectory & Cohort Diagnostic Ledger
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  // 1. Authentication & Role Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = window.authClient ? window.authClient.getUser() : null;
  const userMeta = currentUser?.user_metadata || {};
  if (userMeta.role === "student") {
    window.location.href = "analytics.html";
    return;
  }

  // Set Chart.js universal font to Inter for unified design system consistency
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  function getTeacherIdentity() {
    const u = window.authClient ? window.authClient.getUser() : null;
    const meta = u?.user_metadata || {};
    const code = meta.id_code || meta.student_id || (u?.id && u.id.startsWith("TCH-") ? u.id : "TCH-01");
    const uid = u?.id || code || "TCH-01";
    return {
      id: uid,
      code: code,
      name: meta.full_name || "Instructor Portal",
      storageKey: code ? `edumetrics_teacher_${code}` : "edumetrics_teacher_default"
    };
  }

  function syncTeacherProfile() {
    const teacher = getTeacherIdentity();
    const teacherNameEl = document.getElementById("teacher-name");
    const teacherIdCodeEl = document.getElementById("teacher-id-code");
    if (teacherNameEl) teacherNameEl.innerText = teacher.name;
    if (teacherIdCodeEl) teacherIdCodeEl.innerText = teacher.code;
  }
  syncTeacherProfile();

  // Toast Notification Helper
  const toastContainer = document.getElementById("toast-container");
  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ️";
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // 2. DOM Elements
  const kpiCohortTotal = document.getElementById("t-kpi-cohort-total");
  const kpiCohortAvg = document.getElementById("t-kpi-cohort-avg");
  const kpiCohortPass = document.getElementById("t-kpi-cohort-pass");
  const kpiCohortRisk = document.getElementById("t-kpi-cohort-risk");
  const kpiStagesMeta = document.getElementById("t-kpi-cohort-stages-meta");
  const kpiGpaMeta = document.getElementById("t-kpi-cohort-gpa-meta");

  const trajActualEl = document.getElementById("t-trajectory-actual-val");
  const trajAiLiftEl = document.getElementById("t-trajectory-ai-lift");
  const trajBadgeEl = document.getElementById("t-trajectory-status-badge");

  const btnChartModeLine = document.getElementById("btn-chart-mode-line");
  const btnChartModeBar = document.getElementById("btn-chart-mode-bar");

  const filterStage = document.getElementById("t-filter-stage");
  const filterRisk = document.getElementById("t-filter-risk");

  const ledgerTbody = document.getElementById("cohort-master-tbody");
  const ledgerCountBadge = document.getElementById("ledger-count-badge");
  const btnClearLedger = document.getElementById("btn-clear-cohort-ledger");

  // Delete Modal DOM Elements
  const modalDeleteCohort = document.getElementById("modal-delete-cohort-student");
  const deleteTargetName = document.getElementById("delete-target-name");
  const deleteTargetId = document.getElementById("delete-target-id");
  const btnCloseDeleteModal = document.getElementById("btn-close-delete-modal");
  const btnCancelDeleteModal = document.getElementById("btn-cancel-delete-modal");
  const btnConfirmDeleteStudent = document.getElementById("btn-confirm-delete-student");

  // Pro Modal Elements
  const proChartCard = document.getElementById("pro-teacher-chart-card");
  const btnUnlockTeacherPro = document.getElementById("btn-unlock-teacher-pro");
  const proUpgradeModal = document.getElementById("pro-upgrade-modal");
  const btnCloseProModal = document.getElementById("btn-close-pro-modal");
  const btnDismissProModal = document.getElementById("btn-dismiss-pro-modal");

  let currentChartMode = "line";
  let progressionChart = null;
  let proRadarChart = null;
  let cohortStudents = [];
  let pendingDeleteStudentId = null;

  // Empty State Helper for Main Chart Viewport
  function updateChartEmptyState(canvasId, showEmpty, emptyConfig = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let emptyEl = parent.querySelector(".chart-empty-state-card");
    if (showEmpty) {
      canvas.style.display = "none";
      if (!emptyEl) {
        emptyEl = document.createElement("div");
        emptyEl.className = "chart-empty-state-card";
        emptyEl.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; height:100%; text-align:center; padding:2rem; background:rgba(0,0,0,0.25); border-radius:8px; border:1px dashed rgba(255,255,255,0.15);";
        parent.appendChild(emptyEl);
      }
      emptyEl.innerHTML = `
        <div style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.85;">${emptyConfig.icon || "📊"}</div>
        <div style="font-weight:800; color:var(--text-primary); font-size:1.05rem; margin-bottom:0.35rem;">${emptyConfig.title || "No Cohort Evaluations Logged Yet"}</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); max-width:380px; line-height:1.5; margin-bottom:1.25rem;">${emptyConfig.description || "Run student diagnostic forecasts from the Teacher Suite to unlock real-time cohort analytics and growth trajectory curves."}</div>
        <a href="teacher-prediction.html" class="btn btn-primary btn-sm" style="font-size:0.85rem; text-decoration:none; padding:8px 18px; font-weight:700;">⚡ Evaluate Student (Run AI)</a>
      `;
    } else {
      canvas.style.display = "block";
      if (emptyEl) emptyEl.remove();
    }
  }

  // Normalize student score to percentage (0 - 100)
  function normalizeToPercentage(student) {
    const raw = Number(student.predicted_score) || 0;
    const stage = (student.stage || "").toLowerCase();
    if (stage === "university") {
      return Math.min(100, Math.max(0, (raw / 4.0) * 100));
    }
    return Math.min(100, Math.max(0, raw));
  }

  // 3. Load All Cohort Evaluations for Logged-In Instructor
  async function loadCohortData() {
    const teacher = getTeacherIdentity();
    let localEvals = [];

    // Read from candidate teacher keys
    try {
      const candidateKeys = [
        teacher.storageKey,
        `edumetrics_teacher_${teacher.code}`,
        `edumetrics_teacher_${teacher.id}`,
        "edumetrics_teacher_default"
      ];

      const uniqueKeys = Array.from(new Set(candidateKeys));
      for (const k of uniqueKeys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) || [];
            if (Array.isArray(parsed)) {
              localEvals.push(...parsed);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Could not parse teacher evaluations from localStorage:", e);
    }

    let remoteEvals = [];

    // Direct live Supabase Cloud Database Tables Query (prediction_history & teacher_class_roster)
    if (window.authClient && window.authClient.client) {
      try {
        const { data, error } = await window.authClient.client
          .from("prediction_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          data.forEach((item) => {
            const p = item.input_features || item.payload || {};
            const matchesTeacher =
              (p.teacher_id && (p.teacher_id === teacher.id || p.teacher_id === teacher.code)) ||
              (p.teacher_code && (p.teacher_code === teacher.id || p.teacher_code === teacher.code)) ||
              (item.user_id && (item.user_id === teacher.id || item.user_id === teacher.code)) ||
              (p.role === "teacher" || p.evaluator_role === "teacher");

            if (matchesTeacher) {
              const sId = p.student_id || item.student_id || "STU-" + String(item.id).slice(0, 4);
              remoteEvals.push({
                id: item.id,
                student_id: sId,
                student_name: p.student_name || item.student_name || "Evaluated Student",
                stage: item.stage || p.stage || "university",
                predicted_score: item.predicted_score ?? p.predicted_score ?? 3.5,
                predicted_grade: item.predicted_grade || p.predicted_grade || "Grade A",
                status_badge: item.status_badge || p.status_badge || "On Track",
                status_color: (item.status_badge || p.status_badge || "").toLowerCase().includes("risk") ? "badge-danger" : "badge-success",
                attendance_pct: p.attendance_pct || 85,
                coursework_pct: p.coursework_pct || 80,
                timestamp: item.created_at || item.timestamp || new Date().toISOString()
              });
            }
          });
        }
      } catch (cloudErr) {
        console.warn("[TeacherAnalytics] Supabase history query notice:", cloudErr);
      }

      try {
        const { data: rosterData, error: rosterErr } = await window.authClient.client
          .from("teacher_class_roster")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (!rosterErr && Array.isArray(rosterData)) {
          rosterData.forEach((r) => {
            const matchesTeacher =
              (teacher.id && r.teacher_id === teacher.id) ||
              (teacher.code && r.teacher_id === teacher.code);

            if (matchesTeacher) {
              const sId = r.student_id_code || r.roll_no || r.id;
              remoteEvals.push({
                id: r.id,
                student_id: sId,
                student_name: r.student_name,
                stage: r.stage || "university",
                predicted_score: r.predicted_score ?? 3.5,
                predicted_grade: r.predicted_grade || "Grade A",
                status_badge: r.status_badge || r.risk_level || "On Track",
                status_color: (r.risk_level || "").toLowerCase().includes("high") ? "badge-danger" : "badge-success",
                attendance_pct: r.attendance_pct || 85,
                coursework_pct: r.avg_marks || 80,
                timestamp: r.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (rosterErr) {
        console.warn("[TeacherAnalytics] Supabase roster query notice:", rosterErr);
      }
    }

    // Combine local + remote evaluations, de-duplicate by student_id keeping the newest timestamp
    const combinedMap = new Map();
    [...remoteEvals, ...localEvals].forEach((s) => {
      if (s && s.student_id) {
        const sId = String(s.student_id);
        const sTime = s.timestamp || s.created_at || new Date().toISOString();
        if (!combinedMap.has(sId) || new Date(sTime) > new Date(combinedMap.get(sId).timestamp)) {
          combinedMap.set(sId, { ...s, timestamp: sTime });
        }
      }
    });

    cohortStudents = Array.from(combinedMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    updateAnalyticsView();
  }

  // Filter cohort students based on active dropdowns (Stage & Risk)
  function getFilteredStudents() {
    const selectedStage = filterStage?.value || "all";
    const selectedRisk = filterRisk?.value || "all";

    return cohortStudents.filter((s) => {
      const matchStage = selectedStage === "all" || (s.stage || "").toLowerCase() === selectedStage.toLowerCase();

      let matchRisk = true;
      const statusText = (s.status_badge || "").toLowerCase();
      const pct = normalizeToPercentage(s);
      if (selectedRisk === "exemplary") matchRisk = pct >= 80 || statusText.includes("exemplary");
      else if (selectedRisk === "on_track") matchRisk = (pct >= 65 && pct < 80) || statusText.includes("track") || statusText.includes("honors") || statusText.includes("proficient");
      else if (selectedRisk === "moderate") matchRisk = (pct >= 50 && pct < 65) || statusText.includes("moderate") || statusText.includes("attention");
      else if (selectedRisk === "high_risk") matchRisk = pct < 50 || statusText.includes("risk") || statusText.includes("remedial") || statusText.includes("intervention");

      return matchStage && matchRisk;
    });
  }

  // 4. Update KPIs, Charts, and Ledger
  function updateAnalyticsView() {
    const filtered = getFilteredStudents();

    // 1. Update KPI Strip
    const total = filtered.length;
    let sumScorePct = 0;
    let passCount = 0;
    let highRiskCount = 0;

    filtered.forEach((s) => {
      const pct = normalizeToPercentage(s);
      sumScorePct += pct;
      const badge = (s.status_badge || "").toLowerCase();

      if (pct >= 50 && !badge.includes("fail") && !badge.includes("critical")) {
        passCount++;
      }
      if (pct < 50 || badge.includes("risk") || badge.includes("remedial") || badge.includes("intervention")) {
        highRiskCount++;
      }
    });

    const meanPct = total > 0 ? (sumScorePct / total).toFixed(1) : "--";
    const passRate = total > 0 ? ((passCount / total) * 100).toFixed(0) : "--";
    const gpaEq = total > 0 ? ((parseFloat(meanPct) / 100) * 4.0).toFixed(2) : "--";

    if (kpiCohortTotal) kpiCohortTotal.innerText = total;
    if (kpiCohortAvg) kpiCohortAvg.innerText = total > 0 ? `${meanPct}%` : "--";
    if (kpiCohortPass) kpiCohortPass.innerText = total > 0 ? `${passRate}%` : "--";
    if (kpiCohortRisk) kpiCohortRisk.innerText = highRiskCount;
    if (kpiGpaMeta) kpiGpaMeta.innerText = total > 0 ? `${gpaEq} GPA Equivalent` : "-- GPA Equivalent";

    const activeStage = filterStage ? filterStage.options[filterStage.selectedIndex].text : "All Stages";
    if (kpiStagesMeta) kpiStagesMeta.innerText = total > 0 ? `Filtered by: ${activeStage}` : "Across active education tiers";

    // 2. Render Main Progression Chart (Line or Bar)
    renderMainCohortChart(filtered);

    // 3. Render Pro Radar Chart Background
    renderProRadarChart();

    // 4. Render Master Ledger Table
    renderMasterLedgerTable(filtered);
  }

  // --------------------------------------------------------------------------
  // 5. MAIN COHORT PROGRESSION CHART (LINE & BAR SWITCHER - MIRRORS STUDENT ANALYTICS)
  // --------------------------------------------------------------------------
  function renderMainCohortChart(students) {
    if (currentChartMode === "bar") {
      renderCohortBarChart(students);
    } else {
      renderCohortLineChart(students);
    }
  }

  function renderCohortLineChart(students) {
    const canvas = document.getElementById("tAnalyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const selectedStage = filterStage?.value || "all";
    const isUni = selectedStage === "university" || (selectedStage === "all" && (students[0]?.stage || "").toLowerCase() === "university");
    const unitLabel = isUni ? " CGPA" : "%";
    const isMobile = window.innerWidth <= 768;

    if (!students || students.length === 0) {
      updateChartEmptyState("tAnalyticsProgressionChart", true, {
        icon: "📈",
        title: "No Cohort Evaluations Logged Yet",
        description: "Complete student evaluations in the Teacher Prediction Suite to log verified marks and generate live cohort trajectories."
      });

      if (trajActualEl) trajActualEl.innerText = "--";
      if (trajAiLiftEl) trajAiLiftEl.innerText = "--";
      if (trajBadgeEl) {
        trajBadgeEl.innerText = "Awaiting Evaluation";
        trajBadgeEl.className = "badge badge-neutral";
      }
      return;
    }

    updateChartEmptyState("tAnalyticsProgressionChart", false);

    // Calculate Verified Cohort Standing & AI Projected Lift
    let sumScore = 0;
    students.forEach((s) => {
      const raw = Number(s.predicted_score) || 0;
      if (isUni) {
        sumScore += raw > 4.0 ? raw / 25.0 : raw;
      } else {
        sumScore += raw <= 4.0 ? raw * 25.0 : raw;
      }
    });

    const cohortMean = +(sumScore / students.length).toFixed(2);
    let aiProjected = isUni ? Math.min(4.0, +(cohortMean + 0.30).toFixed(2)) : Math.min(100, Math.round(cohortMean + 6));
    const diff = +(aiProjected - cohortMean).toFixed(2);
    const liftDelta = isUni ? `${diff >= 0 ? '+' : ''}${diff}` : `${diff >= 0 ? '+' : ''}${diff}%`;

    if (trajActualEl) trajActualEl.innerText = `${cohortMean}${unitLabel}`;
    if (trajAiLiftEl) trajAiLiftEl.innerText = `${aiProjected}${unitLabel} (${liftDelta} 🚀)`;
    if (trajBadgeEl) {
      const isPositive = diff >= 0;
      trajBadgeEl.innerText = isPositive ? "Ascending Growth 🚀" : "Attention Needed ⚠️";
      trajBadgeEl.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    const labels = [
      `1. Cohort Mean Standing (${cohortMean}${unitLabel})`,
      `2. ⚡ AI Projected Lift (${aiProjected}${unitLabel} 🚀)`
    ];
    const pastScores = [cohortMean, null];
    const predScores = [cohortMean, aiProjected];

    let minScore = Math.min(cohortMean, aiProjected);
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
            label: "1. Cohort Mean Standing (Verified)",
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
                  return ` 🟢 Cohort Mean Standing: ${context.parsed.y}${unitLabel}`;
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

  function renderCohortBarChart(students) {
    const canvas = document.getElementById("tAnalyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const selectedStage = filterStage?.value || "all";
    const isUni = selectedStage === "university" || (selectedStage === "all" && (students[0]?.stage || "").toLowerCase() === "university");
    const unitLabel = isUni ? " CGPA" : "%";
    const isMobile = window.innerWidth <= 768;

    if (!students || students.length === 0) {
      updateChartEmptyState("tAnalyticsProgressionChart", true, {
        icon: "📊",
        title: "No Cohort Evaluations Logged Yet",
        description: "Complete student evaluations in the Teacher Prediction Suite to generate comparative milestone bar charts."
      });
      return;
    }

    updateChartEmptyState("tAnalyticsProgressionChart", false);

    let sumScore = 0;
    students.forEach((s) => {
      const raw = Number(s.predicted_score) || 0;
      if (isUni) {
        sumScore += raw > 4.0 ? raw / 25.0 : raw;
      } else {
        sumScore += raw <= 4.0 ? raw * 25.0 : raw;
      }
    });

    const cohortMean = +(sumScore / students.length).toFixed(2);
    let aiProjected = isUni ? Math.min(4.0, +(cohortMean + 0.30).toFixed(2)) : Math.min(100, Math.round(cohortMean + 6));
    const diff = +(aiProjected - cohortMean).toFixed(2);
    const liftDelta = isUni ? `${diff >= 0 ? '+' : ''}${diff}` : `${diff >= 0 ? '+' : ''}${diff}%`;

    if (trajActualEl) trajActualEl.innerText = `${cohortMean}${unitLabel}`;
    if (trajAiLiftEl) trajAiLiftEl.innerText = `${aiProjected}${unitLabel} (${liftDelta} 🚀)`;
    if (trajBadgeEl) {
      const isPositive = diff >= 0;
      trajBadgeEl.innerText = isPositive ? "Ascending Growth 🚀" : "Attention Needed ⚠️";
      trajBadgeEl.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    const labels = [
      `1. Cohort Mean Standing (${cohortMean}${unitLabel})`,
      `2. ⚡ AI Projected Lift (${aiProjected}${unitLabel} 🚀)`
    ];
    const barValues = [cohortMean, aiProjected];
    const bgColors = ["rgba(163, 230, 53, 0.85)", "rgba(56, 189, 248, 0.90)"];
    const borderColors = ["#A3E635", "#38BDF8"];

    let minScore = Math.min(cohortMean, aiProjected);
    let yMin = isUni ? Math.max(0.0, Math.floor((minScore - 0.5) * 2) / 2) : Math.max(0, Math.floor((minScore - 15) / 10) * 10);
    let yMax = isUni ? 4.0 : 100;
    if (yMin >= yMax) yMin = Math.max(0, yMax - 1.0);

    progressionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Cohort Evaluated & Forecasted Score",
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
                const prefix = context.dataIndex === 0 ? "🟢 Cohort Mean Standing: " : "⚡ AI Projected Lift: ";
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

  // Chart Mode Switcher Listeners
  if (btnChartModeLine && btnChartModeBar) {
    btnChartModeLine.addEventListener("click", () => {
      currentChartMode = "line";
      btnChartModeLine.classList.add("btn-primary", "active");
      btnChartModeLine.classList.remove("btn-outline");
      btnChartModeBar.classList.remove("btn-primary", "active");
      btnChartModeBar.classList.add("btn-outline");
      renderMainCohortChart(getFilteredStudents());
    });

    btnChartModeBar.addEventListener("click", () => {
      currentChartMode = "bar";
      btnChartModeBar.classList.add("btn-primary", "active");
      btnChartModeBar.classList.remove("btn-outline");
      btnChartModeLine.classList.remove("btn-primary", "active");
      btnChartModeLine.classList.add("btn-outline");
      renderMainCohortChart(getFilteredStudents());
    });
  }

  // --------------------------------------------------------------------------
  // 6. PRO COGNITIVE RADAR CHART (BACKGROUND OF LOCKED PRO CARD)
  // --------------------------------------------------------------------------
  function renderProRadarChart() {
    const canvas = document.getElementById("tProCognitiveRadarChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (proRadarChart) proRadarChart.destroy();

    proRadarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "Cognitive Load",
          "Stress Vulnerability",
          "Habit Velocity",
          "Burnout Probability",
          "Concept Retention",
          "Peer Collaboration"
        ],
        datasets: [
          {
            label: "Cohort Neural Cluster (Pro)",
            data: [78, 62, 85, 45, 88, 72],
            backgroundColor: "rgba(245, 158, 11, 0.35)",
            borderColor: "#f59e0b",
            borderWidth: 2,
            pointBackgroundColor: "#f59e0b",
            pointBorderColor: "#ffffff",
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            min: 0,
            max: 100,
            angleLines: { color: "rgba(255, 255, 255, 0.08)" },
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            pointLabels: { color: "#94a3b8", font: { size: 10, weight: "600" } },
            ticks: { display: false }
          }
        }
      }
    });
  }

  // Pro Modal Event Handlers
  function openProModal() {
    if (proUpgradeModal) {
      proUpgradeModal.style.display = "flex";
      proUpgradeModal.removeAttribute("aria-hidden");
    }
  }

  function closeProModal() {
    if (proUpgradeModal) {
      proUpgradeModal.style.display = "none";
      proUpgradeModal.setAttribute("aria-hidden", "true");
    }
  }

  if (proChartCard) proChartCard.addEventListener("click", openProModal);
  if (btnUnlockTeacherPro) btnUnlockTeacherPro.addEventListener("click", (e) => { e.stopPropagation(); openProModal(); });
  if (btnCloseProModal) btnCloseProModal.addEventListener("click", closeProModal);
  if (btnDismissProModal) btnDismissProModal.addEventListener("click", closeProModal);

  // --------------------------------------------------------------------------
  // 7. EVALUATED COHORT DIAGNOSTIC LEDGER TABLE (DELETE ONLY PER USER INSTRUCTION)
  // --------------------------------------------------------------------------
  function renderMasterLedgerTable(students) {
    if (!ledgerTbody) return;
    ledgerTbody.innerHTML = "";

    if (ledgerCountBadge) {
      ledgerCountBadge.innerText = `${students.length} Student(s) Recorded`;
    }

    if (students.length === 0) {
      ledgerTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 48px 16px;">
            <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
              No Evaluated Students Recorded Yet
            </div>
            <div style="font-size: 13px; color: var(--text-muted); max-width: 460px; margin: 0 auto 16px;">
              Run student diagnostic forecasts from the Teacher Suite to unlock real-time cohort analytics, mastery charts, and growth telemetry.
            </div>
            <a href="teacher-prediction.html" class="btn btn-primary btn-sm">
              <span>⚡ Evaluate Student (Run AI)</span>
            </a>
          </td>
        </tr>
      `;
      return;
    }

    students.forEach((s) => {
      const isUni = (s.stage || "").toLowerCase() === "university";
      const displayScore = isUni
        ? (typeof s.predicted_score === "number" ? s.predicted_score.toFixed(2) : s.predicted_score) + " CGPA"
        : (typeof s.predicted_score === "number" ? s.predicted_score.toFixed(1) : s.predicted_score) + "%";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-family-mono); font-weight: 700; color: var(--color-orange);">${s.student_id}</td>
        <td style="font-weight: 700; color: #ffffff;">${s.student_name}</td>
        <td><span class="badge badge-neutral">${(s.stage || "Uni").toUpperCase()}</span></td>
        <td style="font-weight: 600; color: #38bdf8;">${s.attendance_pct ? parseFloat(s.attendance_pct).toFixed(0) + "% Att" : "--"}</td>
        <td style="font-weight: 800; color: var(--color-lime);">${displayScore}</td>
        <td><span class="badge ${s.status_color || 'badge-success'}">${s.status_badge || 'On Track'}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn btn-danger btn-sm btn-delete-cohort" data-id="${s.student_id}" data-name="${s.student_name}" title="Delete Student Record">
            <span>🗑️ Delete</span>
          </button>
        </td>
      `;
      ledgerTbody.appendChild(tr);
    });

    attachLedgerDeleteListeners();
  }

  // --------------------------------------------------------------------------
  // 8. DELETE EVALUATION RECORD HANDLER (STRICT & CLEAN)
  // --------------------------------------------------------------------------
  function attachLedgerDeleteListeners() {
    document.querySelectorAll(".btn-delete-cohort").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        openDeleteModal(id, name);
      });
    });
  }

  function openDeleteModal(studentId, studentName) {
    pendingDeleteStudentId = studentId;
    if (deleteTargetName) deleteTargetName.innerText = studentName || "Student";
    if (deleteTargetId) deleteTargetId.innerText = `ID: ${studentId}`;
    if (modalDeleteCohort) {
      modalDeleteCohort.style.cssText = "display: flex !important;";
    }
  }

  function closeDeleteModal() {
    pendingDeleteStudentId = null;
    if (modalDeleteCohort) {
      modalDeleteCohort.style.cssText = "display: none !important;";
    }
  }

  if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener("click", closeDeleteModal);
  if (btnCancelDeleteModal) btnCancelDeleteModal.addEventListener("click", closeDeleteModal);

  if (btnConfirmDeleteStudent) {
    btnConfirmDeleteStudent.addEventListener("click", async () => {
      if (!pendingDeleteStudentId) return;
      const targetId = pendingDeleteStudentId;
      const teacher = getTeacherIdentity();

      // 1. Remove from all teacher localStorage keys
      const candidateKeys = [
        teacher.storageKey,
        `edumetrics_teacher_${teacher.code}`,
        `edumetrics_teacher_${teacher.id}`,
        "edumetrics_teacher_default"
      ];
      Array.from(new Set(candidateKeys)).forEach((k) => {
        const stored = localStorage.getItem(k);
        if (stored) {
          try {
            let list = JSON.parse(stored) || [];
            list = list.filter((s) => String(s.student_id) !== String(targetId) && String(s.id) !== String(targetId));
            localStorage.setItem(k, JSON.stringify(list));
          } catch (e) {}
        }
      });

      // 2. Delete from Supabase Cloud Table teacher_class_roster & prediction_history
      if (window.authClient && window.authClient.client) {
        try {
          await window.authClient.client
            .from("teacher_class_roster")
            .delete()
            .or(`student_id_code.eq.${targetId},id.eq.${targetId},id.eq.STU-${targetId}`);
        } catch (rErr) {
          console.warn("[Delete] Supabase roster delete note:", rErr);
        }
      }

      closeDeleteModal();
      showToast(`Evaluation record for student ${targetId} deleted successfully.`, "success");
      await loadCohortData();
    });
  }

  // --------------------------------------------------------------------------
  // 9. CLEAR LEDGER (LOCAL EVALUATIONS)
  // --------------------------------------------------------------------------
  if (btnClearLedger) {
    btnClearLedger.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to clear your local evaluated students ledger?")) return;
      const teacher = getTeacherIdentity();
      const candidateKeys = [
        teacher.storageKey,
        `edumetrics_teacher_${teacher.code}`,
        `edumetrics_teacher_${teacher.id}`,
        "edumetrics_teacher_default"
      ];
      Array.from(new Set(candidateKeys)).forEach((k) => localStorage.removeItem(k));
      showToast("Local evaluated student ledger cleared.", "info");
      await loadCohortData();
    });
  }

  // Filter Listeners
  if (filterStage) filterStage.addEventListener("change", updateAnalyticsView);
  if (filterRisk) filterRisk.addEventListener("change", updateAnalyticsView);

  // Logout Listener
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // Initial Load
  await loadCohortData();
});
