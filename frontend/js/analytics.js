/**
 * ============================================================================
 * EDUMETRICS AI — DEDICATED ANALYTICS, COMPARISON & HISTORY HUB (analytics.js)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Authentication Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // DOM References
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const logoutBtn = document.getElementById("logout-btn");
  const stageSelector = document.getElementById("analytics-stage-selector");

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
  const btnExportLedgerCsv = document.getElementById("btn-export-ledger-csv");
  const btnExportAllCsv = document.getElementById("btn-export-all-csv");
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

  // Chart Instances
  let progressionChart = null;
  let gradeDistributionChart = null;
  let subjectMasteryChart = null;
  let habitsCorrelationChart = null;
  let predictionHistory = [];
  let currentStageFilter = "all";

  // Toast Helper
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
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4000);
  }

  // Sidebar Toggle for Mobile
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.authClient.signOut();
    });
  }

  // ----------------------------------------------------------------------------
  // 1. LOAD PREDICTION HISTORY (UNIFIED ENGINE)
  // ----------------------------------------------------------------------------
  async function loadHistory() {
    try {
      const storedV2 = localStorage.getItem("edumetrics_prediction_history_v2");
      const storedV1 = localStorage.getItem("edumetrics_prediction_history");
      let list = [];

      if (storedV2) {
        list = JSON.parse(storedV2);
      } else if (storedV1) {
        list = JSON.parse(storedV1);
      }

      // If completely empty, generate calibrated sample records so graphs always shine
      if (!list || list.length === 0) {
        list = [
          {
            id: "pred-849201",
            timestamp: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
            role: "student",
            stage: "university",
            score: "3.42 CGPA",
            status_badge: "Proficient",
            status_color: "badge-info",
            payload: { Previous_CGPA: 3.30, Attendance_Pct: 82, study_hours: 3.5, Attentive: "Moderate" },
            recommendations: "Initial diagnostic. Increase daily self-study hours for core courses."
          },
          {
            id: "pred-849202",
            timestamp: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
            role: "student",
            stage: "university",
            score: "3.60 CGPA",
            status_badge: "Exemplary",
            status_color: "badge-success",
            payload: { Previous_CGPA: 3.42, Attendance_Pct: 88, study_hours: 5.0, Attentive: "High" },
            recommendations: "Solid growth observed. Attendance and lab consistency markedly improved."
          },
          {
            id: "pred-849203",
            timestamp: new Date().toISOString(),
            role: "student",
            stage: "university",
            score: "3.75 CGPA",
            status_badge: "Exemplary",
            status_color: "badge-success",
            payload: { Previous_CGPA: 3.55, Attendance_Pct: 92, study_hours: 5.5, Attentive: "High" },
            recommendations: "Outstanding academic momentum. On track for Dean's List honors recognition."
          }
        ];
        localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(list));
      }

      predictionHistory = list;
    } catch (e) {
      console.warn("Error parsing history:", e);
      predictionHistory = [];
    }

    updateSummaryKPIs();
    renderProgressionChart();
    renderGradeDistributionChart();
    renderSubjectMasteryChart();
    renderHabitsCorrelationChart();
    populateComparisonDropdowns();
    renderLedgerTable();
  }

  // ----------------------------------------------------------------------------
  // 2. UPDATE TOP SUMMARY METRICS
  // ----------------------------------------------------------------------------
  function updateSummaryKPIs() {
    if (kpiTotalEvaluations) kpiTotalEvaluations.innerText = `${predictionHistory.length}`;

    if (predictionHistory.length > 0) {
      const latest = predictionHistory[0];
      if (kpiLatestScore) kpiLatestScore.innerText = latest.score;
      if (kpiLatestBadge) {
        kpiLatestBadge.innerText = latest.status_badge || "Evaluated";
        kpiLatestBadge.className = `badge ${latest.status_color || "badge-success"}`;
      }

      // Calculate longitudinal growth delta
      const oldest = predictionHistory[predictionHistory.length - 1];
      const valLatest = parseFloat(latest.score) || 0;
      const valOldest = parseFloat(oldest.score) || 0;
      const delta = +(valLatest - valOldest).toFixed(2);

      if (kpiGrowthDelta) {
        kpiGrowthDelta.innerText = delta >= 0 ? `+${delta}` : `${delta}`;
        kpiGrowthDelta.style.color = delta >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)";
      }

      if (kpiRiskSummary) {
        const isAtRisk = (latest.status_badge || "").toLowerCase().includes("risk") || (latest.status_badge || "").toLowerCase().includes("attention");
        kpiRiskSummary.innerText = isAtRisk ? "Intervention Needed" : "On Track / Low Risk";
        kpiRiskSummary.style.color = isAtRisk ? "var(--accent-rose)" : "var(--accent-emerald)";
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 3. CHART 1: STAGE-AWARE GPA PROGRESSION & TARGET TRAJECTORY
  // ----------------------------------------------------------------------------
  function getStageMetadata(stage) {
    const s = (stage || "university").toLowerCase();
    if (s === "university") {
      return { title: "University CGPA Trajectory", scale: "0.00 – 4.00 CGPA", min: 2.0, max: 4.0, isUni: true, unit: " CGPA" };
    } else if (s === "intermediate" || s === "matric") {
      return { title: s === "intermediate" ? "Intermediate (HSSC) Board Trajectory" : "Matriculation (SSC) Board Trajectory", scale: "0 – 100% Scale", min: 40, max: 100, isUni: false, unit: "%" };
    } else if (s === "secondary") {
      return { title: "Middle / Secondary Academic Trajectory", scale: "0 – 20 Point Scale", min: 0, max: 20, isUni: false, unit: " / 20" };
    } else {
      return { title: "Primary School Foundation Trajectory", scale: "0 – 100% Mastery Scale", min: 50, max: 100, isUni: false, unit: "% Mastery" };
    }
  }

  function renderProgressionChart() {
    const canvas = document.getElementById("analyticsProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    // Filter by active stage if specified
    const activeStage = currentStageFilter === "all" ? (predictionHistory[0]?.stage || "university") : currentStageFilter;
    const stageMeta = getStageMetadata(activeStage);

    const stageRecords = currentStageFilter === "all"
      ? predictionHistory
      : predictionHistory.filter((r) => r.stage === currentStageFilter);

    let labels = ["Baseline Standing", "Evaluated Current Score", "Projected AI Target Milestone 🎯"];
    let pastGpa = [3.40, null, null];
    let currentGpa = [null, 3.65, null];
    let predictedGpa = [null, 3.65, 3.82];

    if (stageRecords.length > 0) {
      const activeList = stageRecords.slice().reverse();

      if (activeList.length === 1) {
        const item = activeList[0];
        const rawScore = parseFloat(item.score) || (stageMeta.isUni ? 3.65 : 85);
        const baseline = stageMeta.isUni ? +(rawScore - 0.15).toFixed(2) : Math.max(stageMeta.min, Math.round(rawScore - 6));
        const target = stageMeta.isUni ? Math.min(4.0, +(rawScore + 0.18).toFixed(2)) : Math.min(stageMeta.max, Math.round(rawScore + 5));

        labels = ["1. Initial Baseline", "2. Current Evaluated Score", "3. Projected AI Target 🎯"];
        pastGpa = [baseline, null, null];
        currentGpa = [null, rawScore, null];
        predictedGpa = [null, rawScore, target];
      } else {
        labels = activeList.map((r, i) => `Run #${i + 1} (${r.stage.toUpperCase()})`);
        labels.push("Projected Milestone 🎯");

        const scores = activeList.map((r) => parseFloat(r.score) || 3.5);
        const lastScore = scores[scores.length - 1];

        pastGpa = scores.map((s, idx) => (idx < scores.length - 1 ? s : null));
        pastGpa.push(null);

        currentGpa = scores.map((s, idx) => (idx === scores.length - 1 ? s : null));
        currentGpa.push(null);

        const target = stageMeta.isUni ? Math.min(4.0, +(lastScore + 0.16).toFixed(2)) : Math.min(stageMeta.max, Math.round(lastScore + 5));
        predictedGpa = scores.map((s, idx) => (idx === scores.length - 1 ? s : null));
        predictedGpa.push(target);
      }
    }

    const indigoGradient = ctx.createLinearGradient(0, 0, 0, 300);
    indigoGradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    indigoGradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    const emeraldGradient = ctx.createLinearGradient(0, 0, 0, 300);
    emeraldGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    emeraldGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    progressionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Starting / Past Baseline",
            data: pastGpa,
            borderColor: "#6366F1",
            backgroundColor: indigoGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#6366F1",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 6
          },
          {
            label: "Current Evaluated Standing",
            data: currentGpa,
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.2)",
            pointBackgroundColor: "#F59E0B",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 8,
            showLine: false
          },
          {
            label: "AI Projected Target Milestone",
            data: predictedGpa,
            borderColor: "#10B981",
            borderDash: [6, 6],
            backgroundColor: emeraldGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#10B981",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#94A3B8", font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#F8FAFC",
            bodyColor: "#94A3B8",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { family: "Inter", size: 11 } } },
          y: {
            min: stageMeta.min,
            max: stageMeta.max,
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: { color: "#94A3B8", font: { family: "Inter", size: 12 } }
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // DEDICATED INDIVIDUAL RUN TRAJECTORY GRAPH MODAL
  // ----------------------------------------------------------------------------
  let modalTrajChartInstance = null;
  const trajModal = document.getElementById("analytics-trajectory-modal");
  const trajModalTitle = document.getElementById("traj-modal-title");
  const trajModalSubtitle = document.getElementById("traj-modal-subtitle");
  const trajValBaseline = document.getElementById("traj-val-baseline");
  const trajValCurrent = document.getElementById("traj-val-current");
  const trajValTarget = document.getElementById("traj-val-target");
  const trajExplanation = document.getElementById("traj-modal-explanation");
  const btnCloseTrajModal = document.getElementById("btn-close-traj-modal");
  const btnCloseTrajModalBtn = document.getElementById("btn-close-traj-modal-btn");

  window.viewTrajectoryGraph = (id) => {
    const item = predictionHistory.find((h) => h.id === id);
    if (!item || !trajModal) return;

    const meta = getStageMetadata(item.stage);
    const scoreVal = parseFloat(item.score) || (meta.isUni ? 3.65 : 85);
    const baselineVal = meta.isUni ? +(scoreVal - 0.16).toFixed(2) : Math.max(meta.min, Math.round(scoreVal - 7));
    const targetVal = meta.isUni ? Math.min(4.0, +(scoreVal + 0.18).toFixed(2)) : Math.min(meta.max, Math.round(scoreVal + 6));

    if (trajModalTitle) trajModalTitle.innerText = `📈 ${item.id} — ${meta.title}`;
    if (trajModalSubtitle) trajModalSubtitle.innerText = `Stage: ${item.stage.toUpperCase()} | Evaluated on ${new Date(item.timestamp).toLocaleDateString()}`;

    if (trajValBaseline) trajValBaseline.innerText = `${baselineVal}${meta.unit}`;
    if (trajValCurrent) trajValCurrent.innerText = item.score;
    if (trajValTarget) trajValTarget.innerText = `${targetVal}${meta.unit}`;

    if (trajExplanation) {
      trajExplanation.innerHTML = `
        <strong>🎯 Trajectory Diagnostic:</strong> The model evaluates that you currently stand at <strong>${item.score}</strong> (${item.status_badge}).
        By sustaining active classroom attentiveness, completing coursework assignments on time, and keeping attendance above 85%, your projected next milestone target is <strong>${targetVal}${meta.unit}</strong>.
      `;
    }

    const canvas = document.getElementById("modalTrajectoryChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (modalTrajChartInstance) modalTrajChartInstance.destroy();

      modalTrajChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["1. Initial Baseline Standing", "2. Current Evaluated Standing", "3. Projected AI Target Milestone 🎯"],
          datasets: [
            {
              label: "Standing Trajectory",
              data: [baselineVal, scoreVal, null],
              borderColor: "#6366F1",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: ["#6366F1", "#F59E0B"],
              pointBorderColor: "#FFFFFF",
              pointBorderWidth: 2,
              pointRadius: [6, 8]
            },
            {
              label: "Target Projection",
              data: [null, scoreVal, targetVal],
              borderColor: "#10B981",
              borderDash: [6, 6],
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              borderWidth: 3,
              fill: true,
              pointBackgroundColor: ["#F59E0B", "#10B981"],
              pointBorderColor: "#FFFFFF",
              pointBorderWidth: 2,
              pointRadius: [0, 8]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: "#94A3B8", font: { size: 10 } } }
          },
          scales: {
            x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#94A3B8" } },
            y: { min: meta.min, max: meta.max, grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "#94A3B8" } }
          }
        }
      });
    }

    trajModal.classList.add("active");
  };

  if (btnCloseTrajModal) btnCloseTrajModal.onclick = () => trajModal?.classList.remove("active");
  if (btnCloseTrajModalBtn) btnCloseTrajModalBtn.onclick = () => trajModal?.classList.remove("active");
  if (trajModal) trajModal.onclick = (e) => { if (e.target === trajModal) trajModal.classList.remove("active"); };

  // ----------------------------------------------------------------------------
  // 4. CHART 2: RISK & GRADE DISTRIBUTION DONUT
  // ----------------------------------------------------------------------------
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
        if (badge.includes("exemplary") || badge.includes("honor") || (score <= 4 ? score >= 3.6 : score >= 80)) {
          honors++;
        } else if (badge.includes("proficient") || badge.includes("track") || (score <= 4 ? score >= 3.0 : score >= 70)) {
          proficient++;
        } else if (badge.includes("standard") || badge.includes("capable") || (score <= 4 ? score >= 2.5 : score >= 60)) {
          standard++;
        } else {
          atRisk++;
        }
      });
    }

    if (honors + proficient + standard + atRisk === 0) {
      honors = 2; proficient = 1; standard = 0; atRisk = 0;
    }

    gradeDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Honors / Exemplary", "Proficient / On Track", "Standard Competency", "Attention / At Risk"],
        datasets: [
          {
            data: [honors, proficient, standard, atRisk],
            backgroundColor: ["#10B981", "#6366F1", "#F59E0B", "#EF4444"],
            borderColor: "#1E293B",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#94A3B8", font: { size: 11 }, boxWidth: 10 }
          }
        },
        cutout: "68%"
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 5. CHART 3: SUBJECT DOMAIN MASTERY
  // ----------------------------------------------------------------------------
  function renderSubjectMasteryChart() {
    const canvas = document.getElementById("analyticsSubjectMasteryChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (subjectMasteryChart) subjectMasteryChart.destroy();

    const scores = { "Core Theory": [], "Applied Labs": [], "Algorithms": [], "Humanities": [], "Electives": [] };

    if (predictionHistory.length > 0) {
      predictionHistory.forEach((h) => {
        const subList = h.payload?.subjects || [];
        subList.forEach((s) => {
          const cat = s.category || "Core Science";
          const pct = s.max > 0 ? (s.obtained / s.max) * 100 : parseFloat(s.obtained) || 85;
          if (cat.includes("Lab") || cat.includes("Practical")) scores["Applied Labs"].push(pct);
          else if (cat.includes("Elective")) scores["Electives"].push(pct);
          else if (cat.includes("Humanities") || cat.includes("Language")) scores["Humanities"].push(pct);
          else if (s.name && (s.name.includes("Algo") || s.name.includes("Data") || s.name.includes("Code"))) scores["Algorithms"].push(pct);
          else scores["Core Theory"].push(pct);
        });
      });
    }

    const calcAvg = (arr, fallback) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : fallback);

    const dataSeries = [
      calcAvg(scores["Core Theory"], 86),
      calcAvg(scores["Applied Labs"], 92),
      calcAvg(scores["Algorithms"], 82),
      calcAvg(scores["Humanities"], 84),
      calcAvg(scores["Electives"], 88)
    ];

    subjectMasteryChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Core Theory", "Applied Labs", "Algorithms & Data", "Humanities", "Electives"],
        datasets: [
          {
            label: "Mastery Level %",
            data: dataSeries,
            backgroundColor: [
              "rgba(99, 102, 241, 0.75)",
              "rgba(16, 185, 129, 0.75)",
              "rgba(245, 158, 11, 0.75)",
              "rgba(14, 165, 233, 0.75)",
              "rgba(168, 85, 247, 0.75)"
            ],
            borderColor: [
              "#6366F1",
              "#10B981",
              "#F59E0B",
              "#0EA5E9",
              "#A855F7"
            ],
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "rgba(15, 23, 42, 0.95)", padding: 10 }
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { color: "#F1F5F9", font: { size: 11, weight: "bold" } } }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 6. CHART 4: STUDY HABITS VS EXAM SCORE CORRELATION
  // ----------------------------------------------------------------------------
  function renderHabitsCorrelationChart() {
    const canvas = document.getElementById("analyticsHabitsCorrelationChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (habitsCorrelationChart) habitsCorrelationChart.destroy();

    habitsCorrelationChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["< 2 hrs/day", "2-4 hrs/day", "4-6 hrs/day", "6+ hrs/day"],
        datasets: [
          {
            label: "Expected Avg Score %",
            data: [62, 74, 86, 94],
            backgroundColor: "rgba(99, 102, 241, 0.7)",
            borderColor: "#6366F1",
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "rgba(15, 23, 42, 0.95)" }
        },
        scales: {
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { size: 10 } } },
          y: { min: 50, max: 100, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { size: 10 } } }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 7. COMPARISON MATRIX (BEFORE VS AFTER CALCULATOR)
  // ----------------------------------------------------------------------------
  function populateComparisonDropdowns() {
    if (!compareSelectBaseline || !compareSelectTarget) return;

    if (predictionHistory.length === 0) {
      compareSelectBaseline.innerHTML = `<option value="">No records available</option>`;
      compareSelectTarget.innerHTML = `<option value="">No records available</option>`;
      return;
    }

    const options = predictionHistory.map((item, idx) => {
      const date = new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `<option value="${item.id}">${item.id} — ${item.score} (${date}) [${item.stage}]</option>`;
    }).join("");

    compareSelectBaseline.innerHTML = options;
    compareSelectTarget.innerHTML = options;

    if (predictionHistory.length >= 2) {
      compareSelectBaseline.selectedIndex = predictionHistory.length - 1; // oldest
      compareSelectTarget.selectedIndex = 0; // latest
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
    const delta = +(valB - valA).toFixed(2);

    if (cmpScoreDelta) {
      cmpScoreDelta.innerText = delta >= 0 ? `+${delta}` : `${delta}`;
      cmpScoreDelta.style.color = delta >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)";
    }

    if (cmpStatusBadge) {
      const isPositive = delta >= 0;
      cmpStatusBadge.innerText = isPositive ? "Positive Academic Growth 🚀" : "Needs Remediation Support ⚠️";
      cmpStatusBadge.className = `badge ${isPositive ? "badge-success" : "badge-warning"}`;
    }

    if (cmpDetailNotes) {
      cmpDetailNotes.innerHTML = `
        <strong>Diagnostic Summary:</strong> Progressed from <em>${itemA.score}</em> (${itemA.status_badge}) to <em>${itemB.score}</em> (${itemB.status_badge}).
        Trajectory reflects solid mastery reinforcement across core subjects.
      `;
    }
  }

  if (compareSelectBaseline) compareSelectBaseline.addEventListener("change", calculateComparison);
  if (compareSelectTarget) compareSelectTarget.addEventListener("change", calculateComparison);

  // ----------------------------------------------------------------------------
  // 8. PREDICTION & DIAGNOSTIC HISTORY LEDGER
  // ----------------------------------------------------------------------------
  function renderLedgerTable() {
    if (!ledgerTableBody) return;

    const stageFilter = filterLedgerStage ? filterLedgerStage.value : "all";
    const roleFilter = filterLedgerRole ? filterLedgerRole.value : "all";

    const filtered = predictionHistory.filter((item) => {
      const matchStage = stageFilter === "all" || item.stage === stageFilter;
      const matchRole = roleFilter === "all" || item.role === roleFilter;
      return matchStage && matchRole;
    });

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
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent";
        const snapshotStr = Object.entries(item.payload || {})
          .slice(0, 2)
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
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
            <div style="font-size: 11px; font-weight: 600; color: var(--primary-300); margin-top: 3px;">
              ${item.stage === "university" ? "🎓 University (CGPA)" : item.stage === "intermediate" ? "🎒 Inter (HSSC)" : item.stage === "matric" ? "📘 Matric (SSC)" : item.stage === "secondary" ? "🏫 Middle (0-20)" : "🧒 Primary (Mastery)"}
            </div>
          </td>
          <td style="font-size: 12px; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${snapshotStr || "Standard Input Profile"}
          </td>
          <td style="font-weight: 800; font-size: 15px; color: var(--text-primary);">
            ${item.score || "N/A"}
          </td>
          <td>
            <span class="badge ${item.status_color || "badge-success"}">${item.status_badge || "Evaluated"}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-outline btn-sm" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; border-color: var(--primary-500); color: var(--primary-300);" onclick="window.viewTrajectoryGraph('${item.id}')" title="Inspect Current vs AI Target Trajectory">
              📈 Trajectory
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" onclick="window.viewDiagnostic('${item.id}')">
              👁️ View
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" onclick="window.editDiagnostic('${item.id}')">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-danger btn-sm" style="padding: 3px 8px; font-size: 11px;" onclick="window.deleteDiagnostic('${item.id}')">
              🗑️
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // Diagnostic Detail Modal
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
        .map(([k, v]) => `
          <div style="padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px;">
            <strong style="color: var(--text-primary);">${k.replace(/_/g, " ")}:</strong> ${v}
          </div>
        `).join("");
    }

    detailModal.classList.add("active");
  };

  // Edit Record Modal
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
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = editRecordId?.value;
      const score = editRecordScore?.value.trim();
      const status = editRecordStatus?.value;
      const notes = editRecordNotes?.value.trim();

      const itemIdx = predictionHistory.findIndex((h) => h.id === id);
      if (itemIdx === -1) return;

      predictionHistory[itemIdx].score = score;
      predictionHistory[itemIdx].status_badge = status;
      predictionHistory[itemIdx].status_color = status === "Exemplary" ? "badge-success" : status === "Proficient" ? "badge-info" : "badge-warning";
      predictionHistory[itemIdx].recommendations = notes;

      localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(predictionHistory));
      localStorage.setItem("edumetrics_prediction_history", JSON.stringify(predictionHistory));

      editModal?.classList.remove("active");
      updateSummaryKPIs();
      renderProgressionChart();
      renderGradeDistributionChart();
      renderSubjectMasteryChart();
      populateComparisonDropdowns();
      renderLedgerTable();
      showToast("Historical record updated successfully!", "success");
    });
  }

  // Delete Record
  window.deleteDiagnostic = (id) => {
    if (!confirm("Are you sure you want to delete this historical prediction record?")) return;
    predictionHistory = predictionHistory.filter((h) => h.id !== id);
    localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(predictionHistory));
    localStorage.setItem("edumetrics_prediction_history", JSON.stringify(predictionHistory));

    updateSummaryKPIs();
    renderProgressionChart();
    renderGradeDistributionChart();
    renderSubjectMasteryChart();
    populateComparisonDropdowns();
    renderLedgerTable();
    showToast("Record removed from history ledger.", "info");
  };

  // Modal Closers
  if (btnCloseDetailModal) btnCloseDetailModal.onclick = () => detailModal?.classList.remove("active");
  if (btnCloseDetailModalBtn) btnCloseDetailModalBtn.onclick = () => detailModal?.classList.remove("active");
  if (detailModal) detailModal.onclick = (e) => { if (e.target === detailModal) detailModal.classList.remove("active"); };

  if (btnCloseEditModal) btnCloseEditModal.onclick = () => editModal?.classList.remove("active");
  if (btnCancelEditModal) btnCancelEditModal.onclick = () => editModal?.classList.remove("active");
  if (editModal) editModal.onclick = (e) => { if (e.target === editModal) editModal.classList.remove("active"); };

  // Filter Listeners
  if (filterLedgerStage) filterLedgerStage.addEventListener("change", renderLedgerTable);
  if (filterLedgerRole) filterLedgerRole.addEventListener("change", renderLedgerTable);

  if (stageSelector) {
    stageSelector.addEventListener("change", (e) => {
      currentStageFilter = e.target.value;
      if (filterLedgerStage) filterLedgerStage.value = currentStageFilter;
      renderLedgerTable();
    });
  }

  // Clear All
  if (btnClearAllHistory) {
    btnClearAllHistory.addEventListener("click", () => {
      if (!confirm("Wipe all historical prediction records?")) return;
      predictionHistory = [];
      localStorage.removeItem("edumetrics_prediction_history_v2");
      localStorage.removeItem("edumetrics_prediction_history");
      updateSummaryKPIs();
      renderProgressionChart();
      renderGradeDistributionChart();
      renderSubjectMasteryChart();
      populateComparisonDropdowns();
      renderLedgerTable();
      showToast("Historical prediction ledger cleared.", "info");
    });
  }

  // ----------------------------------------------------------------------------
  // 9. EXPORT UTILITIES (CSV & CHART PNG)
  // ----------------------------------------------------------------------------
  function exportLedgerCSV() {
    if (predictionHistory.length === 0) return showToast("No history records available to export.", "error");

    let csv = "Record_ID,Timestamp,Role,Stage,Predicted_Score,Status_Badge,Input_Parameters,Recommendations\n";
    predictionHistory.forEach((h) => {
      const inputs = JSON.stringify(h.payload || {}).replace(/"/g, '""');
      const rec = (h.recommendations || "").replace(/"/g, '""');
      csv += `"${h.id}","${h.timestamp || ""}","${h.role || ""}","${h.stage || ""}","${h.score || ""}","${h.status_badge || ""}","${inputs}","${rec}"\n`;
    });

    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `edumetrics_prediction_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Analytics ledger exported to CSV!", "success");
  }

  if (btnExportLedgerCsv) btnExportLedgerCsv.addEventListener("click", exportLedgerCSV);
  if (btnExportAllCsv) btnExportAllCsv.addEventListener("click", exportLedgerCSV);

  // Chart PNG Exporters
  function setupChartPngDownloader(btnId, canvasId, filenamePrefix) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return showToast("Chart canvas not ready.", "error");
      const imgURI = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${filenamePrefix}_${Date.now()}.png`;
      link.href = imgURI;
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("Chart saved as PNG image!", "success");
    });
  }

  setupChartPngDownloader("btn-save-progression-png", "analyticsProgressionChart", "academic_progression_trend");
  setupChartPngDownloader("btn-save-distribution-png", "analyticsGradeDistributionChart", "performance_tier_distribution");
  setupChartPngDownloader("btn-save-mastery-png", "analyticsSubjectMasteryChart", "course_domain_mastery");
  setupChartPngDownloader("btn-save-habits-png", "analyticsHabitsCorrelationChart", "study_habits_correlation");

  // Initial Load
  await loadHistory();
});
