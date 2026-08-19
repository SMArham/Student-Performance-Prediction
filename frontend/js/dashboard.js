/**
 * PAGE 1: Student Dashboard Controller
 * Student Performance Prediction & Analytics System
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authentication Guard
  if (!window.authClient || !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // Dashboard State
  let currentStage = "university";
  let progressionChart = null;
  let dashboardData = null;

  // DOM Elements
  const stageSelector = document.getElementById("stage-selector");
  const studentNameEl = document.getElementById("student-name");
  const studentAvatarEl = document.getElementById("student-avatar");
  const studentMajorEl = document.getElementById("student-major");
  const studentIdEl = document.getElementById("student-id-code");
  const institutionEl = document.getElementById("student-institution");
  const gradeLevelEl = document.getElementById("student-grade-level");
  const heroGreetingEl = document.getElementById("hero-greeting");
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  // KPI Elements
  const kpiCurrentGpa = document.getElementById("kpi-current-gpa");
  const kpiCumulativeCgpa = document.getElementById("kpi-cumulative-cgpa");
  const kpiDeltaCgpa = document.getElementById("kpi-delta-cgpa");
  const kpiPredictedGpa = document.getElementById("kpi-predicted-gpa");
  const kpiStatusBadge = document.getElementById("kpi-status-badge");
  const kpiStatusText = document.getElementById("kpi-status-text");

  // Advisory Elements
  const advisoryBadgeEl = document.getElementById("advisory-badge-hero");
  const advisoryTitleEl = document.getElementById("advisory-title");
  const advisoryDescEl = document.getElementById("advisory-desc");
  const aiTipsListEl = document.getElementById("ai-tips-list");

  // Modal / Quick Predict Elements
  const quickPredictBtn = document.getElementById("quick-predict-btn");
  const predictModal = document.getElementById("predict-modal");
  const closePredictModal = document.getElementById("close-predict-modal");
  const predictForm = document.getElementById("predict-form");

  // History Table & Empty State
  const historyTableBody = document.getElementById("history-table-body");
  const emptyStateContainer = document.getElementById("empty-state-container");
  const dashboardContent = document.getElementById("dashboard-analytics-content");

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
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.authClient.signOut();
    });
  }

  // Stage Switcher
  if (stageSelector) {
    stageSelector.addEventListener("change", (e) => {
      currentStage = e.target.value;
      loadDashboard(currentStage);
    });
  }

  // ----------------------------------------------------------------------------
  // Load & Render Dashboard Data
  // ----------------------------------------------------------------------------
  async function loadDashboard(stage) {
    try {
      showLoadingState(true);
      const res = await window.apiClient.getDashboardSummary(stage);
      dashboardData = res;

      renderStudentProfile(res.student_info);
      renderKPIs(res.kpis);
      renderAdvisory(res.kpis, res.quick_tips);
      renderProgressionChart(res.progression_trend, stage);
      renderHistoryTable(res.recent_predictions);

      if (!res.has_records && res.recent_predictions.length === 0) {
        showEmptyState(true);
      } else {
        showEmptyState(false);
      }
    } catch (err) {
      console.error("Dashboard loading error:", err);
      showToast("Error fetching dashboard data: " + err.message, "error");
    } finally {
      showLoadingState(false);
    }
  }

  function renderStudentProfile(info) {
    if (!info) return;
    const currentUser = window.authClient ? window.authClient.getUser() : null;
    const displayName = currentUser?.user_metadata?.full_name || info.full_name || "Student";
    const avatarUrl = currentUser?.user_metadata?.avatar_url || info.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (heroGreetingEl) heroGreetingEl.innerText = `Welcome back, ${displayName.split(" ")[0]} 👋`;
    if (studentAvatarEl) studentAvatarEl.src = avatarUrl;
    if (studentMajorEl) studentMajorEl.innerText = info.program_or_major;
    if (studentIdEl) studentIdEl.innerText = info.student_id_code;
    if (institutionEl) institutionEl.innerText = info.institution_name;
    if (gradeLevelEl) gradeLevelEl.innerText = info.current_grade_level;
  }

  function renderKPIs(kpis) {
    if (!kpis) return;
    if (kpiCurrentGpa) kpiCurrentGpa.innerText = kpis.current_gpa.toFixed(2);
    if (kpiCumulativeCgpa) kpiCumulativeCgpa.innerText = kpis.cumulative_cgpa.toFixed(2);
    if (kpiPredictedGpa) kpiPredictedGpa.innerText = kpis.predicted_gpa.toFixed(2);

    if (kpiDeltaCgpa) {
      const delta = kpis.delta_cgpa;
      const isUp = delta >= 0;
      kpiDeltaCgpa.className = `kpi-delta ${isUp ? 'up' : 'down'}`;
      kpiDeltaCgpa.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(delta).toFixed(2)} vs prev`;
    }

    if (kpiStatusBadge) {
      kpiStatusBadge.className = `badge ${kpis.status_color}`;
      if (kpiStatusText) kpiStatusText.innerText = kpis.status_badge;
    }
  }

  function renderAdvisory(kpis, tips = []) {
    if (advisoryBadgeEl && kpis) {
      advisoryBadgeEl.className = `status-badge-hero ${kpis.status_color}`;
      if (advisoryTitleEl) advisoryTitleEl.innerText = `Performance Status: ${kpis.status_badge}`;
      if (advisoryDescEl) advisoryDescEl.innerText = kpis.status_message;
    }

    if (aiTipsListEl) {
      aiTipsListEl.innerHTML = tips.map(tip => `
        <li class="ai-rec-item">
          <span class="ai-rec-icon">⚡</span>
          <span>${tip}</span>
        </li>
      `).join("");
    }
  }

  // ----------------------------------------------------------------------------
  // Chart.js GPA Progression Trend Visualization
  // ----------------------------------------------------------------------------
  function renderProgressionChart(trendData, stage) {
    const canvas = document.getElementById("gpaProgressionChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (progressionChart) {
      progressionChart.destroy();
    }

    const labels = trendData.labels || [];
    const pastGpa = trendData.past_gpa_series || [];
    const currentGpa = trendData.current_gpa_series || [];
    const predictedGpa = trendData.predicted_target_series || [];

    // Create Indigo & Emerald Gradients
    const indigoGradient = ctx.createLinearGradient(0, 0, 0, 300);
    indigoGradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    indigoGradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    const emeraldGradient = ctx.createLinearGradient(0, 0, 0, 300);
    emeraldGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    emeraldGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    const maxScale = stage === "university" ? 4.0 : (stage === "secondary" ? 20.0 : (stage === "matric_inter" ? 1100 : 100));

    progressionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Past Historical GPA",
            data: pastGpa,
            borderColor: "#6366F1",
            backgroundColor: indigoGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#6366F1",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: "Current Term GPA",
            data: currentGpa,
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.2)",
            borderWidth: 0,
            pointBackgroundColor: "#F59E0B",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
            showLine: false,
          },
          {
            label: "AI Predicted Target Trajectory",
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
            pointRadius: 6,
            pointHoverRadius: 8,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false, // Customized in HTML footer legend
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#F8FAFC",
            bodyColor: "#94A3B8",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                if (context.raw === null || context.raw === undefined) return null;
                const val = typeof context.raw === 'number' ? context.raw.toFixed(2) : context.raw;
                return ` ${context.dataset.label}: ${val}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "#94A3B8",
              font: { family: "Inter", size: 12 }
            }
          },
          y: {
            min: stage === "university" ? 2.0 : 0,
            max: maxScale,
            grid: {
              color: "rgba(255, 255, 255, 0.06)",
            },
            ticks: {
              color: "#94A3B8",
              font: { family: "Inter", size: 12 },
              callback: function(value) {
                return stage === "university" ? value.toFixed(1) : value;
              }
            }
          }
        }
      }
    });
  }

  function renderHistoryTable(items = []) {
    if (!historyTableBody) return;
    if (items.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
            No prediction runs recorded yet. Use the "Quick Forecast" button to test the AI models!
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = items.map(item => {
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent";
      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${item.model_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.model_version}</div>
          </td>
          <td><span class="badge ${item.status_color}">${item.stage.toUpperCase()}</span></td>
          <td style="font-weight: 700; font-size: 15px;">${item.predicted_score.toFixed(2)}</td>
          <td><span class="badge ${item.status_color}">${item.status_badge}</span></td>
          <td style="color: var(--text-muted); font-size: 12px;">${dateStr}</td>
        </tr>
      `;
    }).join("");
  }

  function showLoadingState(isLoading) {
    const loaders = document.querySelectorAll(".kpi-value");
    if (isLoading) {
      loaders.forEach(el => el.classList.add("skeleton"));
    } else {
      loaders.forEach(el => el.classList.remove("skeleton"));
    }
  }

  function showEmptyState(isEmpty) {
    if (emptyStateContainer && dashboardContent) {
      emptyStateContainer.style.display = isEmpty ? "flex" : "none";
      dashboardContent.style.display = isEmpty ? "none" : "block";
    }
  }

  // ----------------------------------------------------------------------------
  // Quick Prediction Drawer Modal Interaction
  // ----------------------------------------------------------------------------
  if (quickPredictBtn && predictModal) {
    quickPredictBtn.addEventListener("click", () => {
      predictModal.classList.add("active");
    });
  }

  if (closePredictModal && predictModal) {
    closePredictModal.addEventListener("click", () => {
      predictModal.classList.remove("active");
    });
  }

  // Close modal when clicking outside dialog
  if (predictModal) {
    predictModal.addEventListener("click", (e) => {
      if (e.target === predictModal) {
        predictModal.classList.remove("active");
      }
    });
  }

  if (predictForm) {
    predictForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = predictForm.querySelector("button[type='submit']");

      const attendance = parseFloat(document.getElementById("modal_attendance").value);
      const studyHours = parseFloat(document.getElementById("modal_study_hours").value);
      const prevCgpa = parseFloat(document.getElementById("modal_prev_cgpa").value);
      const sleepHours = parseFloat(document.getElementById("modal_sleep_hours").value);
      const socialHours = parseInt(document.getElementById("modal_social_hours").value);
      const major = document.getElementById("modal_major").value;
      const gender = document.getElementById("modal_gender").value;

      const payload = {
        Age: 21,
        Attendance_Pct: attendance,
        Study_Hours_Per_Day: studyHours,
        Previous_CGPA: prevCgpa,
        Sleep_Hours: sleepHours,
        Social_Hours_Week: socialHours,
        Gender: gender,
        Major: major
      };

      try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Running ML Model...";
        const result = await window.apiClient.runPrediction(currentStage, payload);

        showToast(`Prediction generated: ${result.formatted_score} (${result.status_badge})`, "success");
        predictModal.classList.remove("active");

        // Dynamically update dashboard
        loadDashboard(currentStage);
      } catch (err) {
        showToast("Prediction failed: " + err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Run AI Forecast";
      }
    });
  }

  // Initial Load
  loadDashboard(currentStage);
});
