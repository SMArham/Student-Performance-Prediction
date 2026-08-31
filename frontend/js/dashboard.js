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
    const currentUser = window.authClient ? window.authClient.getUser() : null;
    const meta = currentUser?.user_metadata || {};
    const displayName = meta.full_name || info?.full_name || "Muhammad Ali";
    const avatarUrl = meta.avatar_url || info?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
    const studentId = meta.student_id || info?.student_id_code || "SE-2023-049";
    const major = meta.major || info?.program_or_major || "Software Engineering";
    const institution = meta.institution_name || info?.institution_name || "Faculty of Computer Science & Engineering";

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (heroGreetingEl) heroGreetingEl.innerText = `Welcome back, ${displayName.split(" ")[0]} 👋`;
    if (studentAvatarEl) studentAvatarEl.src = avatarUrl;
    if (studentMajorEl) studentMajorEl.innerText = major;
    if (studentIdEl) studentIdEl.innerText = studentId;
    if (institutionEl) institutionEl.innerText = institution;
    if (gradeLevelEl && info?.current_grade_level) gradeLevelEl.innerText = info.current_grade_level;

    // Populate Settings Modal fields
    const setNameInput = document.getElementById("setting-fullname");
    const setIdInput = document.getElementById("setting-studentid");
    const setInstInput = document.getElementById("setting-institution");
    const setMajorInput = document.getElementById("setting-major");
    const setStageSelect = document.getElementById("setting-stage");
    const setBigAvatar = document.getElementById("avatar-preview-big");

    if (setNameInput) setNameInput.value = displayName;
    if (setIdInput) setIdInput.value = studentId;
    if (setInstInput) setInstInput.value = institution;
    if (setMajorInput) setMajorInput.value = major;
    if (setStageSelect) setStageSelect.value = meta.stage || currentStage;
    if (setBigAvatar) setBigAvatar.src = avatarUrl;
  }

  // ----------------------------------------------------------------------------
  // Profile & Settings Modal Controller
  // ----------------------------------------------------------------------------
  function initProfileSettings() {
    const profileBtn = document.getElementById("user-profile-btn");
    const profileModal = document.getElementById("profile-settings-modal");
    const closeBtn = document.getElementById("btn-close-profile-modal");
    const cancelBtn = document.getElementById("btn-cancel-profile");
    const tabBtns = document.querySelectorAll(".modal-tab-btn");
    const tabContents = document.querySelectorAll(".profile-tab-content");

    const profileForm = document.getElementById("profile-details-form");
    const avatarFileInput = document.getElementById("avatar-file-input");
    const btnGenAvatar = document.getElementById("btn-generate-avatar");
    const btnApplyAvatar = document.getElementById("btn-apply-avatar");
    const avatarUrlInput = document.getElementById("avatar-url-input");
    const avatarBigPreview = document.getElementById("avatar-preview-big");

    const passwordForm = document.getElementById("password-change-form");
    const btnDeleteAcc = document.getElementById("btn-delete-account");

    let pendingAvatarUrl = "";

    if (profileBtn && profileModal) {
      profileBtn.addEventListener("click", (e) => {
        if (e.target.closest("#logout-btn")) return;
        renderStudentProfile(dashboardData?.student_info);
        profileModal.classList.add("active");
      });
    }

    if (closeBtn && profileModal) {
      closeBtn.addEventListener("click", () => profileModal.classList.remove("active"));
    }
    if (cancelBtn && profileModal) {
      cancelBtn.addEventListener("click", () => profileModal.classList.remove("active"));
    }

    if (profileModal) {
      profileModal.addEventListener("click", (e) => {
        if (e.target === profileModal) profileModal.classList.remove("active");
      });
    }

    // Modal Tabs Navigation
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add("active");
      });
    });

    // Custom Avatar File Upload
    if (avatarFileInput) {
      avatarFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          showToast("Image file size exceeds 2MB limit.", "error");
          return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
          pendingAvatarUrl = evt.target.result;
          if (avatarBigPreview) avatarBigPreview.src = pendingAvatarUrl;
          showToast("Photo loaded! Click 'Apply Photo' to save.", "info");
        };
        reader.readAsDataURL(file);
      });
    }

    // Dicebear Randomizer
    if (btnGenAvatar) {
      btnGenAvatar.addEventListener("click", () => {
        const seed = Math.random().toString(36).substring(2, 9);
        pendingAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        if (avatarBigPreview) avatarBigPreview.src = pendingAvatarUrl;
      });
    }

    // Apply Avatar
    if (btnApplyAvatar) {
      btnApplyAvatar.addEventListener("click", async () => {
        const customUrl = avatarUrlInput ? avatarUrlInput.value.trim() : "";
        const finalUrl = customUrl || pendingAvatarUrl;

        if (!finalUrl) {
          showToast("Please choose an image file or paste an image URL first.", "error");
          return;
        }

        try {
          await window.authClient.updateUser({ avatar_url: finalUrl });
          renderStudentProfile(dashboardData?.student_info);
          showToast("Profile picture updated successfully!", "success");
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Error updating avatar: " + err.message, "error");
        }
      });
    }

    // Save Profile Details
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("setting-fullname")?.value.trim();
        const studentId = document.getElementById("setting-studentid")?.value.trim();
        const inst = document.getElementById("setting-institution")?.value.trim();
        const major = document.getElementById("setting-major")?.value.trim();
        const stage = document.getElementById("setting-stage")?.value;

        if (!fullName) {
          showToast("Please provide your full name.", "error");
          return;
        }

        try {
          await window.authClient.updateUser({
            full_name: fullName,
            student_id: studentId,
            institution_name: inst,
            major: major,
            stage: stage
          });

          renderStudentProfile(dashboardData?.student_info);
          showToast("Profile details updated successfully!", "success");
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Failed to update profile: " + err.message, "error");
        }
      });
    }

    // Password Update
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPass = document.getElementById("setting-new-password")?.value;
        const confPass = document.getElementById("setting-confirm-password")?.value;

        if (newPass.length < 6) {
          showToast("Password must be at least 6 characters.", "error");
          return;
        }
        if (newPass !== confPass) {
          showToast("Passwords do not match.", "error");
          return;
        }

        try {
          await window.authClient.updatePassword(newPass);
          showToast("Password updated successfully!", "success");
          passwordForm.reset();
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Password update failed: " + err.message, "error");
        }
      });
    }

    // Danger Zone: Account Deletion
    if (btnDeleteAcc) {
      btnDeleteAcc.addEventListener("click", async () => {
        const confirm1 = confirm("⚠️ Are you sure you want to PERMANENTLY delete your student account?");
        if (!confirm1) return;

        const confirm2 = confirm("🚨 FINAL WARNING: All your academic records, course entries, and forecast histories will be irreversibly erased. Proceed?");
        if (!confirm2) return;

        try {
          await window.authClient.deleteAccount();
        } catch (err) {
          showToast("Error deleting account: " + err.message, "error");
        }
      });
    }
  }

  initProfileSettings();


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

  // Chart Instances
  let progressionChart = null;
  let subjectMasteryChart = null;
  let habitsCorrelationChart = null;
  let gradeDistributionChart = null;
  let localPredictionHistory = [];

  // Filter elements
  const filterHistoryStage = document.getElementById("filter-history-stage");
  const filterHistoryRole = document.getElementById("filter-history-role");
  const btnExportLedgerCsv = document.getElementById("btn-export-ledger-csv");
  const btnExportAnalyticsCsv = document.getElementById("btn-export-analytics-csv");
  const btnClearHistoryAll = document.getElementById("btn-clear-history-all");

  // History Detail Modal Elements
  const historyDetailModal = document.getElementById("history-detail-modal");
  const btnCloseHdModal = document.getElementById("btn-close-hd-modal");
  const btnCloseHdModalBottom = document.getElementById("btn-close-hd-modal-bottom");
  const hdScore = document.getElementById("hd-score");
  const hdScale = document.getElementById("hd-scale");
  const hdBadge = document.getElementById("hd-badge");
  const hdConfidence = document.getElementById("hd-confidence");
  const hdInputsGrid = document.getElementById("hd-inputs-grid");
  const hdRecommendations = document.getElementById("hd-recommendations");

  // ----------------------------------------------------------------------------
  // Chart.js 1: GPA Progression Trend Visualization
  // ----------------------------------------------------------------------------
  function renderProgressionChart(trendData, stage) {
    const canvas = document.getElementById("gpaProgressionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (progressionChart) progressionChart.destroy();

    const labels = trendData?.labels || ["Sem 1", "Sem 2", "Sem 3", "Sem 4 (Current)", "Sem 5 (Target)"];
    const pastGpa = trendData?.past_gpa_series || [3.30, 3.42, 3.55, null, null];
    const currentGpa = trendData?.current_gpa_series || [null, null, null, 3.65, null];
    const predictedGpa = trendData?.predicted_target_series || [null, null, null, 3.65, 3.78];

    const indigoGradient = ctx.createLinearGradient(0, 0, 0, 300);
    indigoGradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");
    indigoGradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    const emeraldGradient = ctx.createLinearGradient(0, 0, 0, 300);
    emeraldGradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
    emeraldGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    const maxScale = stage === "university" ? 4.0 : stage === "secondary" ? 20.0 : stage === "matric_inter" ? 1100 : 100;

    progressionChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Past Term Performance",
            data: pastGpa,
            borderColor: "#6366F1",
            backgroundColor: indigoGradient,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "#6366F1",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 5
          },
          {
            label: "Current Term Standing",
            data: currentGpa,
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.2)",
            pointBackgroundColor: "#F59E0B",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2,
            pointRadius: 7,
            showLine: false
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
            pointRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
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
          x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94A3B8", font: { family: "Inter", size: 12 } } },
          y: {
            min: stage === "university" ? 2.0 : 0,
            max: maxScale,
            grid: { color: "rgba(255, 255, 255, 0.06)" },
            ticks: { color: "#94A3B8", font: { family: "Inter", size: 12 } }
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Chart.js 2: Subject Domain Mastery (Bar Chart)
  // ----------------------------------------------------------------------------
  function renderSubjectMasteryChart() {
    const canvas = document.getElementById("subjectMasteryChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (subjectMasteryChart) subjectMasteryChart.destroy();

    subjectMasteryChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Core Theory", "Applied Labs", "Algorithms", "Humanities", "Electives"],
        datasets: [
          {
            label: "Average Score %",
            data: [86, 92, 80, 84, 88],
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
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 10
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94A3B8", font: { size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: "#F1F5F9", font: { size: 11, weight: "bold" } }
          }
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Chart.js 3: Study Habits vs Performance Correlation
  // ----------------------------------------------------------------------------
  function renderHabitsCorrelationChart() {
    const canvas = document.getElementById("habitsCorrelationChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (habitsCorrelationChart) habitsCorrelationChart.destroy();

    habitsCorrelationChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["< 2 hrs/day", "2-4 hrs/day", "4-6 hrs/day", "6+ hrs/day"],
        datasets: [
          {
            label: "Expected Avg %",
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
  // Chart.js 4: Risk & Grade Distribution Donut
  // ----------------------------------------------------------------------------
  function renderGradeDistributionChart() {
    const canvas = document.getElementById("gradeDistributionChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (gradeDistributionChart) gradeDistributionChart.destroy();

    gradeDistributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Honors (A/A+)", "Proficient (B)", "Standard (C)", "At Risk (D/F)"],
        datasets: [
          {
            data: [55, 30, 10, 5],
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
            labels: { color: "#94A3B8", font: { size: 10 }, boxWidth: 10 }
          }
        },
        cutout: "68%"
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 5. Prediction History Ledger & Diagnostics Detail
  // ----------------------------------------------------------------------------
  async function loadPredictionHistory() {
    try {
      const storedV2 = localStorage.getItem("edumetrics_prediction_history_v2");
      const storedV1 = localStorage.getItem("edumetrics_prediction_history");
      let list = [];

      if (storedV2) {
        list = JSON.parse(storedV2);
      } else if (storedV1) {
        list = JSON.parse(storedV1);
      }

      // Also merge any remote recent predictions if available from dashboard data
      if (dashboardData?.recent_predictions && Array.isArray(dashboardData.recent_predictions)) {
        dashboardData.recent_predictions.forEach((remote) => {
          const exists = list.some((l) => l.id === remote.id);
          if (!exists) {
            list.push({
              id: remote.id || `pred-${Date.now()}`,
              timestamp: remote.created_at || new Date().toISOString(),
              role: "student",
              stage: remote.stage || currentStage,
              score: remote.formatted_score || `${remote.predicted_score}`,
              status_badge: remote.status_badge || "Evaluated",
              status_color: remote.status_color || "badge-success",
              payload: remote.features || {},
              recommendations: remote.recommendation || "Model forecast evaluated."
            });
          }
        });
      }

      localPredictionHistory = list;

      // Update Latest AI Prediction KPI if history exists
      if (localPredictionHistory.length > 0) {
        const latest = localPredictionHistory[0];
        if (kpiPredictedGpa && latest.score) {
          kpiPredictedGpa.innerText = latest.score.split(" ")[0];
        }
        if (kpiStatusBadge && latest.status_color) {
          kpiStatusBadge.className = `badge ${latest.status_color}`;
          if (kpiStatusText) kpiStatusText.innerText = latest.status_badge || "Evaluated";
        }
      }
    } catch (e) {
      console.warn("Error loading history:", e);
      localPredictionHistory = [];
    }

    renderHistoryLedger();
  }

  function renderHistoryLedger() {
    if (!historyTableBody) return;

    const stageFilter = filterHistoryStage ? filterHistoryStage.value : "all";
    const roleFilter = filterHistoryRole ? filterHistoryRole.value : "all";

    const filtered = localPredictionHistory.filter((item) => {
      const matchStage = stageFilter === "all" || item.stage === stageFilter;
      const matchRole = roleFilter === "all" || item.role === roleFilter;
      return matchStage && matchRole;
    });

    if (filtered.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
            No historical prediction records matching the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = filtered
      .map((item, idx) => {
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
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${(item.stage || "University").toUpperCase()}</div>
          </td>
          <td style="font-size: 12px; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${snapshotStr || "Standard Metric Profile"}
          </td>
          <td style="font-weight: 800; font-size: 15px; color: var(--text-primary);">
            ${item.score || "N/A"}
          </td>
          <td>
            <span class="badge ${item.status_color || "badge-success"}">${item.status_badge || "Evaluated"}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" onclick="window.viewDiagnosticSnapshot('${item.id}')">
              👁️ View
            </button>
            <button type="button" class="btn btn-danger btn-sm" style="padding: 3px 8px; font-size: 11px;" onclick="window.deleteHistoryRecord('${item.id}')">
              🗑️
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  window.viewDiagnosticSnapshot = (id) => {
    const item = localPredictionHistory.find((h) => h.id === id);
    if (!item || !historyDetailModal) return;

    if (hdScore) hdScore.innerText = item.score;
    if (hdScale) hdScale.innerText = `Stage: ${(item.stage || "University").toUpperCase()}`;
    if (hdBadge) {
      hdBadge.innerText = item.status_badge || "Evaluated";
      hdBadge.className = `badge ${item.status_color || "badge-success"}`;
    }
    if (hdRecommendations) {
      hdRecommendations.innerText = item.recommendations || "High academic stability maintained. Continue regular revision and study habits.";
    }

    if (hdInputsGrid) {
      hdInputsGrid.innerHTML = Object.entries(item.payload || {})
        .map(
          ([k, v]) => `
        <div style="padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px;">
          <strong style="color: var(--text-primary);">${k.replace(/_/g, " ")}:</strong> ${v}
        </div>
      `
        )
        .join("");
    }

    historyDetailModal.classList.add("active");
  };

  window.deleteHistoryRecord = (id) => {
    if (!confirm("Are you sure you want to delete this historical prediction record?")) return;
    localPredictionHistory = localPredictionHistory.filter((h) => h.id !== id);
    localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(localPredictionHistory));
    renderHistoryLedger();
    showToast("Record removed from history ledger.", "info");
  };

  if (btnCloseHdModal) btnCloseHdModal.addEventListener("click", () => historyDetailModal?.classList.remove("active"));
  if (btnCloseHdModalBottom) btnCloseHdModalBottom.addEventListener("click", () => historyDetailModal?.classList.remove("active"));
  if (historyDetailModal) {
    historyDetailModal.addEventListener("click", (e) => {
      if (e.target === historyDetailModal) historyDetailModal.classList.remove("active");
    });
  }

  // Filter Listeners
  if (filterHistoryStage) filterHistoryStage.addEventListener("change", renderHistoryLedger);
  if (filterHistoryRole) filterHistoryRole.addEventListener("change", renderHistoryLedger);

  // Clear History
  if (btnClearHistoryAll) {
    btnClearHistoryAll.addEventListener("click", () => {
      if (!confirm("Wipe all locally stored prediction histories?")) return;
      localPredictionHistory = [];
      localStorage.removeItem("edumetrics_prediction_history_v2");
      renderHistoryLedger();
      showToast("Historical prediction ledger cleared.", "info");
    });
  }

  // Export CSV
  function exportLedgerToCsv() {
    if (localPredictionHistory.length === 0) {
      return showToast("No history records available to export.", "error");
    }

    let csv = "Record_ID,Timestamp,Role,Stage,Predicted_Score,Status_Badge,Input_Parameters,Recommendations\n";
    localPredictionHistory.forEach((h) => {
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
    showToast("Analytics Ledger exported to CSV!", "success");
  }

  if (btnExportLedgerCsv) btnExportLedgerCsv.addEventListener("click", exportLedgerToCsv);
  if (btnExportAnalyticsCsv) btnExportAnalyticsCsv.addEventListener("click", exportLedgerToCsv);

  function showLoadingState(isLoading) {
    const loaders = document.querySelectorAll(".kpi-value");
    if (isLoading) {
      loaders.forEach((el) => el.classList.add("skeleton"));
    } else {
      loaders.forEach((el) => el.classList.remove("skeleton"));
    }
  }

  function showEmptyState(isEmpty) {
    if (emptyStateContainer && dashboardContent) {
      emptyStateContainer.style.display = isEmpty ? "flex" : "none";
      dashboardContent.style.display = isEmpty ? "none" : "block";
    }
  }

  // Load and Render All Visualizations
  renderSubjectMasteryChart();
  renderHabitsCorrelationChart();
  renderGradeDistributionChart();
  loadPredictionHistory();
  loadDashboard(currentStage);
});
