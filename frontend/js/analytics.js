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

    if (historicalChart) {
      historicalChart.destroy();
    }

    const ctx = canvas.getContext("2d");
    historicalChart = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Predicted Score",
            data: dataScores,
            backgroundColor: bgColors,
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = chronoHistory[context.dataIndex];
                return `Stage: ${item.stage} | Score: ${context.parsed.y} (${item.status_badge || 'On Track'})`;
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
            beginAtZero: true
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
