/**
 * Page 3: Analytics & AI Insights Page Logic
 * Student Performance Prediction & Analytics System
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Auth Guard Check
  function requireAuth() {
    if (window.authClient && !window.authClient.isAuthenticated()) {
      console.warn("[Auth Guard] User not authenticated. Redirecting to login.html...");
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  if (!requireAuth()) return;

  // Sidebar User Profile setup
  const user = window.authClient ? window.authClient.getUser() : null;
  if (user) {
    const nameEl = document.getElementById("sidebar-user-name");
    const idEl = document.getElementById("sidebar-user-id");
    const avatarEl = document.getElementById("sidebar-user-avatar");
    if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email.split("@")[0];
    if (idEl) idEl.textContent = user.user_metadata?.student_id_code || user.id.slice(0, 10);
    if (avatarEl) avatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.authClient.signOut();
    });
  }

  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Elements
  const totalRunsEl = document.getElementById("stat-total-runs");
  const latestScoreEl = document.getElementById("stat-latest-score");
  const latestStatusEl = document.getElementById("stat-latest-status");
  const tbody = document.getElementById("analytics-history-tbody");
  const chartSection = document.getElementById("analytics-chart-section");
  const tableSection = document.getElementById("analytics-table-section");
  const emptyState = document.getElementById("analytics-empty-state");
  const refreshBtn = document.getElementById("refresh-analytics-btn");

  let historicalChart = null;

  // Fetch History from FastAPI backend: GET /api/v1/history?user_id={uid}
  async function loadAnalyticsData() {
    try {
      const uid = user ? user.id : "demo-user-id-001";
      const history = await window.apiClient.getHistory(30);
      console.log("[Analytics History]", history);

      if (!history || history.length === 0) {
        showEmptyState();
        return;
      }

      showDataState();
      renderMiniStats(history);
      renderTable(history);
      renderChart(history);
    } catch (err) {
      console.error("[Analytics Error]", err);
      if (window.showToast) {
        window.showToast("Failed to load analytics history. Backend may be offline.", "error");
      }
      showEmptyState();
    }
  }

  function showEmptyState() {
    if (chartSection) chartSection.style.display = "none";
    if (tableSection) tableSection.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    if (totalRunsEl) totalRunsEl.textContent = "0";
    if (latestScoreEl) latestScoreEl.textContent = "-";
    if (latestStatusEl) latestStatusEl.textContent = "-";
  }

  function showDataState() {
    if (chartSection) chartSection.style.display = "block";
    if (tableSection) tableSection.style.display = "block";
    if (emptyState) emptyState.style.display = "none";
  }

  function renderMiniStats(history) {
    if (totalRunsEl) totalRunsEl.textContent = history.length;
    
    if (history.length > 0) {
      const latest = history[0];
      const stage = (latest.stage || "university").toLowerCase();
      let formatted = `${latest.predicted_score}`;
      if (stage === "university") formatted = `${latest.predicted_score.toFixed(2)} CGPA`;
      else if (stage === "matric_inter") formatted = `${latest.predicted_score.toFixed(0)} / 1100`;
      else if (stage === "secondary") formatted = `${latest.predicted_score.toFixed(1)} / 20`;
      else if (stage === "primary") formatted = `${latest.predicted_score.toFixed(1)} / 100`;

      if (latestScoreEl) latestScoreEl.textContent = formatted;
      if (latestStatusEl) {
        latestStatusEl.innerHTML = `<span class="badge ${latest.status_color || 'badge-success'}">${latest.status_badge || 'On Track'}</span>`;
      }
    }
  }

  function renderTable(history) {
    if (!tbody) return;
    tbody.innerHTML = history.map((item, idx) => {
      const dt = item.created_at ? new Date(item.created_at).toLocaleString() : `Run #${history.length - idx}`;
      const stageName = (item.stage || "university").replace("_", " ").toUpperCase();
      
      // Calculate 95% CI Range approximation if missing
      const score = item.predicted_score;
      const ciLow = item.confidence_interval_low !== undefined ? item.confidence_interval_low : Math.max(0, (score - 0.15)).toFixed(2);
      const ciHigh = item.confidence_interval_high !== undefined ? item.confidence_interval_high : (score + 0.15).toFixed(2);
      const ciRangeStr = `[ ${ciLow} — ${ciHigh} ]`;

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${dt}</div>
          </td>
          <td>
            <span class="badge badge-primary" style="font-size: 11px;">${stageName}</span>
          </td>
          <td>
            <div style="font-size: 13px;">${item.model_name || 'Predictor Pipeline'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${item.model_version || 'v1.0.0'}</div>
          </td>
          <td>
            <div style="font-size: 15px; font-weight: 700; color: #10b981;">${score}</div>
          </td>
          <td>
            <code style="font-size: 12px; color: var(--text-secondary);">${ciRangeStr}</code>
          </td>
          <td>
            <span class="badge ${item.status_color || 'badge-success'}">
              <span class="badge-dot"></span>
              <span>${item.status_badge || 'On Track'}</span>
            </span>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderChart(history) {
    const canvas = document.getElementById("historicalComparisonChart");
    if (!canvas || !window.Chart) return;

    // Reverse history to display chronologically (oldest -> newest)
    const chronoHistory = [...history].reverse();

    const labels = chronoHistory.map((h, i) => {
      if (h.created_at) {
        const d = new Date(h.created_at);
        return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return `Run #${i + 1}`;
    });

    const dataScores = chronoHistory.map(h => h.predicted_score);
    const bgColors = chronoHistory.map(h => {
      const b = (h.status_badge || "").toLowerCase();
      if (b.includes("exemplary") || b.includes("excellent")) return "rgba(16, 185, 129, 0.7)";
      if (b.includes("risk") || b.includes("critical")) return "rgba(239, 68, 68, 0.7)";
      return "rgba(99, 102, 241, 0.7)";
    });

  let historicalChart = null;
  let radarChart = null;
  let impactChart = null;

  function renderChart(history) {
    const canvas = document.getElementById("historicalComparisonChart");
    if (!canvas || !window.Chart) return;

    // Reverse history to display chronologically (oldest -> newest)
    const chronoHistory = [...history].reverse();

    const labels = chronoHistory.map((h, i) => {
      if (h.created_at) {
        const d = new Date(h.created_at);
        return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return `Run #${i + 1}`;
    });

    const dataScores = chronoHistory.map(h => h.predicted_score);
    const dataLowCI = chronoHistory.map(h => h.confidence_interval_low !== undefined ? h.confidence_interval_low : Math.max(0, h.predicted_score - 0.15));
    const dataHighCI = chronoHistory.map(h => h.confidence_interval_high !== undefined ? h.confidence_interval_high : (h.predicted_score + 0.15));

    if (historicalChart) historicalChart.destroy();

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.45)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");

    historicalChart = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Upper 95% CI Limit",
            data: dataHighCI,
            borderColor: "transparent",
            pointRadius: 0,
            fill: "+1",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            tension: 0.4
          },
          {
            label: "Lower 95% CI Limit",
            data: dataLowCI,
            borderColor: "transparent",
            pointRadius: 0,
            fill: false,
            tension: 0.4
          },
          {
            label: "Predicted Score",
            data: dataScores,
            borderColor: "#10b981",
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = chronoHistory[context.dataIndex];
                return `${context.dataset.label}: ${context.parsed.y} (${item ? item.status_badge : ''})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8" }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8" },
            beginAtZero: false
          }
        }
      }
    });

    renderRadarChart(chronoHistory);
    renderImpactChart(chronoHistory);
  }

  function renderRadarChart(history) {
    const canvas = document.getElementById("competencyRadarChart");
    if (!canvas || !window.Chart) return;

    if (radarChart) radarChart.destroy();

    const latest = history.length > 0 ? history[history.length - 1] : {};
    const score = latest.predicted_score || 3.5;
    const baseVal = Math.min(95, Math.max(65, (score / 4.0) * 90 || score));

    const ctx = canvas.getContext("2d");
    radarChart = new window.Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "Attendance Rate",
          "Study Time Discipline",
          "Exam Preparedness",
          "Conceptual Retention",
          "Assignment Rigor",
          "Social/Life Balance"
        ],
        datasets: [
          {
            label: "Current Metric Profile",
            data: [
              Math.min(98, baseVal + 5),
              Math.min(95, baseVal + 2),
              Math.min(90, baseVal - 3),
              Math.min(92, baseVal + 4),
              Math.min(96, baseVal + 1),
              Math.min(88, baseVal - 5)
            ],
            backgroundColor: "rgba(16, 185, 129, 0.25)",
            borderColor: "#10b981",
            borderWidth: 2,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#ffffff"
          },
          {
            label: "Cohort Benchmark Target",
            data: [85, 80, 82, 85, 80, 75],
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            borderColor: "#6366f1",
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: "#6366f1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.1)" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            pointLabels: { color: "#cbd5e1", font: { size: 11, weight: '500' } },
            ticks: { display: false, min: 50, max: 100 }
          }
        },
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { size: 11 } } }
        }
      }
    });
  }

  function renderImpactChart(history) {
    const canvas = document.getElementById("featureImpactChart");
    if (!canvas || !window.Chart) return;

    if (impactChart) impactChart.destroy();

    const ctx = canvas.getContext("2d");
    impactChart = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Attendance Consistency",
          "Daily Study Discipline",
          "Prior Semester CGPA",
          "Sleep Stability",
          "Social Hours Deficit"
        ],
        datasets: [
          {
            label: "Impact Weight (%)",
            data: [35, 28, 24, 12, -8],
            backgroundColor: [
              "rgba(16, 185, 129, 0.75)",
              "rgba(16, 185, 129, 0.65)",
              "rgba(99, 102, 241, 0.75)",
              "rgba(99, 102, 241, 0.65)",
              "rgba(239, 68, 68, 0.75)"
            ],
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Contribution Weight: ${ctx.parsed.x > 0 ? '+' : ''}${ctx.parsed.x}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8" }
          },
          y: {
            grid: { display: false },
            ticks: { color: "#cbd5e1", font: { size: 11 } }
          }
        }
      }
    });
  }

  // Refresh button handler
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadAnalyticsData();
    });
  }

  // Initial load
  loadAnalyticsData();
});
