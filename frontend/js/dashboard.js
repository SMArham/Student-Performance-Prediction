/**
 * ============================================================================
 * EDUMETRICS AI — EXECUTIVE STUDENT & TEACHER DASHBOARD (dashboard.js)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Authentication Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // DOM Elements
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const logoutBtn = document.getElementById("logout-btn");
  const stageSelector = document.getElementById("stage-selector");

  // Profile DOMs
  const studentNameEl = document.getElementById("student-name");
  const studentAvatarEl = document.getElementById("student-avatar");
  const heroGreetingEl = document.getElementById("hero-greeting");
  const studentMajorEl = document.getElementById("student-major");
  const studentIdEl = document.getElementById("student-id-display");
  const institutionEl = document.getElementById("institution-name");
  const gradeLevelEl = document.getElementById("grade-level");

  // KPI DOMs
  const kpiCgpa = document.getElementById("kpi-cgpa");
  const kpiAttendance = document.getElementById("kpi-attendance");
  const kpiPredictedGpa = document.getElementById("kpi-predicted-gpa");
  const kpiStatusBadge = document.getElementById("kpi-status-badge");
  const kpiQuizzes = document.getElementById("kpi-quizzes");

  // Advisory DOMs
  const advisoryBadgeEl = document.getElementById("advisory-badge-hero");
  const advisoryTitleEl = document.getElementById("advisory-title");
  const advisoryDescEl = document.getElementById("advisory-desc");
  const aiTipsListEl = document.getElementById("ai-tips-list");

  // Recent History DOM
  const recentHistoryBody = document.getElementById("dashboard-recent-history-body");

  // Profile Modal DOMs
  const userProfileBtn = document.getElementById("user-profile-btn");
  const btnEditProfileOverview = document.getElementById("btn-edit-profile-overview");
  const profileModal = document.getElementById("profile-settings-modal");
  const btnCloseProfile = document.getElementById("btn-close-profile-modal");
  const btnCancelProfile = document.getElementById("btn-cancel-profile");
  const profileForm = document.getElementById("profile-details-form");

  let currentStage = "university";
  let predictionHistory = [];

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

  // Sidebar Toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.authClient.signOut();
    });
  }

  // Stage Switcher
  if (stageSelector) {
    stageSelector.addEventListener("change", (e) => {
      currentStage = e.target.value;
      loadExecutiveDashboard(currentStage);
    });
  }

  // Load Executive Dashboard
  async function loadExecutiveDashboard(stage) {
    // 1. Fetch persistent history records
    try {
      const storedV2 = localStorage.getItem("edumetrics_prediction_history_v2");
      const storedV1 = localStorage.getItem("edumetrics_prediction_history");
      if (storedV2) {
        predictionHistory = JSON.parse(storedV2);
      } else if (storedV1) {
        predictionHistory = JSON.parse(storedV1);
      } else {
        predictionHistory = [];
      }
    } catch (e) {
      predictionHistory = [];
    }

    // 2. Render Profile
    renderStudentProfile();

    // 3. Render KPIs
    renderKPIs(stage);

    // 4. Render Recent Mini-Ledger
    renderRecentHistoryTable();
  }

  function renderStudentProfile() {
    const currentUser = window.authClient ? window.authClient.getUser() : null;
    const meta = currentUser?.user_metadata || {};
    const displayName = meta.full_name || "Muhammad Ali";
    const avatarUrl = meta.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
    const studentId = meta.student_id || "SE-2023-049";
    const major = meta.major || "Software Engineering";
    const institution = meta.institution_name || "Faculty of Computer Science & Engineering";

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (heroGreetingEl) heroGreetingEl.innerText = `Welcome back, ${displayName.split(" ")[0]} 👋`;
    if (studentAvatarEl) studentAvatarEl.src = avatarUrl;
    if (studentMajorEl) studentMajorEl.innerText = major;
    if (studentIdEl) studentIdEl.innerText = studentId;
    if (institutionEl) institutionEl.innerText = institution;
    if (gradeLevelEl) gradeLevelEl.innerText = currentStage === "university" ? "Semester 4 (Undergraduate)" : "Active Term";
  }

  function renderKPIs(stage) {
    const isUni = stage === "university";

    if (predictionHistory.length > 0) {
      const latest = predictionHistory[0];
      if (kpiPredictedGpa) kpiPredictedGpa.innerText = latest.score;
      if (kpiStatusBadge) {
        kpiStatusBadge.innerText = latest.status_badge || "Evaluated";
        kpiStatusBadge.className = `badge ${latest.status_color || "badge-success"}`;
      }
      if (kpiCgpa) {
        kpiCgpa.innerText = isUni ? (latest.payload?.Previous_CGPA || "3.55") : "88.5%";
      }
      if (kpiAttendance) {
        const att = latest.payload?.Attendance_Pct || latest.payload?.Attendance_Rate || 91.5;
        kpiAttendance.innerText = `${att}%`;
      }
    } else {
      if (kpiCgpa) kpiCgpa.innerText = isUni ? "3.55" : "88.0%";
      if (kpiAttendance) kpiAttendance.innerText = "91.5%";
      if (kpiPredictedGpa) kpiPredictedGpa.innerText = isUni ? "3.75 CGPA" : "92.0%";
    }
  }

  function renderRecentHistoryTable() {
    if (!recentHistoryBody) return;

    if (predictionHistory.length === 0) {
      recentHistoryBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: var(--space-5);">
            No prediction runs evaluated yet. <a href="prediction.html" style="color: var(--primary-400); font-weight: 600;">Run your first prediction ➔</a>
          </td>
        </tr>
      `;
      return;
    }

    const recentRuns = predictionHistory.slice(0, 3);
    recentHistoryBody.innerHTML = recentRuns
      .map((item) => {
        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent";
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
            <span style="font-size: 11px; color: var(--text-secondary); margin-left: 4px;">${(item.stage || "University").toUpperCase()}</span>
          </td>
          <td style="font-weight: 800; font-size: 15px; color: var(--text-primary);">
            ${item.score || "N/A"}
          </td>
          <td>
            <span class="badge ${item.status_color || "badge-success"}">${item.status_badge || "Evaluated"}</span>
          </td>
          <td style="text-align: right;">
            <a href="analytics.html" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px;">
              <span>View Hub ➔</span>
            </a>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // Profile Modal Event Handlers
  if (userProfileBtn) userProfileBtn.onclick = () => profileModal?.classList.add("active");
  if (btnEditProfileOverview) btnEditProfileOverview.onclick = () => profileModal?.classList.add("active");
  if (btnCloseProfile) btnCloseProfile.onclick = () => profileModal?.classList.remove("active");
  if (btnCancelProfile) btnCancelProfile.onclick = () => profileModal?.classList.remove("active");
  if (profileModal) profileModal.onclick = (e) => { if (e.target === profileModal) profileModal.classList.remove("active"); };

  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("setting-fullname")?.value.trim() || "Muhammad Ali";
      const studentId = document.getElementById("setting-studentid")?.value.trim() || "SE-2023-049";
      const major = document.getElementById("setting-major")?.value.trim() || "Software Engineering";
      const inst = document.getElementById("setting-institution")?.value.trim() || "Faculty of Computer Science & Engineering";

      if (studentNameEl) studentNameEl.innerText = name;
      if (heroGreetingEl) heroGreetingEl.innerText = `Welcome back, ${name.split(" ")[0]} 👋`;
      if (studentIdEl) studentIdEl.innerText = studentId;
      if (studentMajorEl) studentMajorEl.innerText = major;
      if (institutionEl) institutionEl.innerText = inst;

      profileModal?.classList.remove("active");
      showToast("Profile settings updated successfully!", "success");
    });
  }

  // Initial Execution
  loadExecutiveDashboard(currentStage);
});
