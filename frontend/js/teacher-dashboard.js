/**
 * Teacher Dashboard Controller (teacher-dashboard.js)
 * EduMetrics AI - Student Success & Academic Performance Prediction Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // Check Authentication & Role Access Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = window.authClient ? window.authClient.getUser() : null;
  const userMeta = currentUser?.user_metadata || {};
  if (userMeta.role === "student") {
    window.location.href = "dashboard.html";
    return;
  }

  // Live Database Health Check
  if (window.authClient && typeof window.authClient.checkDatabaseHealth === "function") {
    window.authClient.checkDatabaseHealth().then((status) => {
      const text = document.getElementById("db-health-text");
      if (text) {
        if (status.connected) {
          text.innerText = `Supabase Cloud (${status.latency}ms)`;
        } else {
          text.innerText = "Local Cache Active";
        }
      }
    });
  }

  // Toast System
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

  // Sync Profile Identity
  const teacherNameEl = document.getElementById("teacher-name");
  const teacherIdCodeEl = document.getElementById("teacher-id-code");
  const name = userMeta.full_name || "Instructor Portal";
  const idCode = userMeta.student_id || userMeta.id_code || "TCH-01";
  if (teacherNameEl) teacherNameEl.innerText = name;
  if (teacherIdCodeEl) teacherIdCodeEl.innerText = idCode;

  // Logout Handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // Profile Modal Elements
  const railProfileBtn = document.getElementById("rail-profile-btn");
  const profileModal = document.getElementById("profile-settings-modal");
  const btnCloseProfile = document.getElementById("btn-close-profile-modal");
  const profileForm = document.getElementById("profile-details-form");

  function openTeacherSettings() {
    const nameInput = document.getElementById("setting-fullname");
    const idInput = document.getElementById("setting-studentid");
    const deptInput = document.getElementById("setting-department");
    const instInput = document.getElementById("setting-institution");

    if (nameInput) nameInput.value = userMeta.full_name || "Dr. Muhammad Farooq";
    if (idInput) idInput.value = userMeta.student_id || userMeta.id_code || "TCH-2026-001";
    if (deptInput) deptInput.value = userMeta.department || "Computer Science / AI";
    if (instInput) instInput.value = userMeta.institution_name || userMeta.institution || "Faculty of Engineering";

    // Reset and clear security password fields
    const secForm = document.getElementById("profile-security-form");
    if (secForm) secForm.reset();
    const newPassInput = document.getElementById("setting-new-password");
    const confPassInput = document.getElementById("setting-confirm-password");
    if (newPassInput) newPassInput.value = "";
    if (confPassInput) confPassInput.value = "";

    profileModal?.classList.add("active");
  }

  if (railProfileBtn) railProfileBtn.addEventListener("click", openTeacherSettings);
  if (btnCloseProfile && profileModal) {
    btnCloseProfile.addEventListener("click", () => profileModal.classList.remove("active"));
  }
  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) profileModal.classList.remove("active");
    });
  }

  // Profile Modal Tab Switching
  const modalTabBtns = profileModal ? profileModal.querySelectorAll(".modal-tab-btn") : [];
  const modalTabContents = profileModal ? profileModal.querySelectorAll(".profile-tab-content") : [];

  modalTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      modalTabBtns.forEach((b) => b.classList.remove("active"));
      modalTabContents.forEach((c) => {
        c.classList.remove("active");
        c.style.display = "none";
      });

      btn.classList.add("active");
      const activeContent = document.getElementById(targetTab);
      if (activeContent) {
        activeContent.classList.add("active");
        activeContent.style.display = "block";
      }
    });
  });

  const securityForm = document.getElementById("profile-security-form");
  if (securityForm) {
    securityForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = document.getElementById("setting-new-password")?.value;
      const confPass = document.getElementById("setting-confirm-password")?.value;

      if (!newPass || newPass.length < 6) {
        return showToast("Password must be at least 6 characters long.", "error");
      }
      if (newPass !== confPass) {
        return showToast("Passwords do not match.", "error");
      }

      try {
        if (window.authClient) await window.authClient.updatePassword(newPass);
        profileModal?.classList.remove("active");
        securityForm.reset();
        showToast("Password updated securely!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update password.", "error");
      }
    });
  }

  const btnDeleteAccount = document.getElementById("btn-delete-account-confirm");
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("Permanently delete your instructor account and all cohort records? This action cannot be undone.")) {
        if (window.authClient) await window.authClient.deleteAccount();
        window.location.href = "login.html";
      }
    });
  }

  // ============================================================================
  // EVALUATED STUDENTS & DIAGNOSTIC LEDGER
  // ============================================================================
  let evaluatedStudentsList = [];
  let filteredStudentsList = [];

  const kpiClassSize = document.getElementById("kpi-class-size");
  const kpiPassRate = document.getElementById("kpi-pass-rate");
  const kpiHighRisk = document.getElementById("kpi-high-risk");
  const kpiClassAvg = document.getElementById("kpi-class-avg");
  const dashboardRosterBody = document.getElementById("dashboard-roster-body");
  const pedagogySummaryEl = document.getElementById("dashboard-pedagogy-summary");
  const stageFilter = document.getElementById("filter-evaluated-stage");

  function getTeacherIdentity() {
    const u = window.authClient ? window.authClient.getUser() : null;
    const meta = u?.user_metadata || {};
    const code = meta.id_code || meta.student_id || "";
    const uid = u?.id || "";
    return {
      id: uid,
      code: code,
      name: meta.full_name || "Instructor",
      storageKey: code ? `edumetrics_teacher_${code}` : (uid ? `edumetrics_teacher_${uid}` : "edumetrics_teacher_default")
    };
  }

  async function loadEvaluatedStudents() {
    let rawList = [];
    const teacher = getTeacherIdentity();

    // 1. Read strictly from this teacher's isolated storage key (no fallback to shared legacy keys)
    try {
      const localStr = localStorage.getItem(teacher.storageKey);
      if (localStr) {
        const parsed = JSON.parse(localStr);
        if (Array.isArray(parsed)) {
          const matching = parsed.filter((item) => {
            const tCode = item.teacher_code || item.teacher_id;
            return tCode === teacher.code || (teacher.id && tCode === teacher.id);
          });
          rawList = [...matching];
        }
      }
    } catch (e) {
      console.warn("Could not load evaluations from localStorage:", e);
    }

    // 2. Fetch from Backend History ONLY if explicitly tagged for this instructor
    try {
      if (window.apiClient && (teacher.code || teacher.id)) {
        const res = await window.apiClient.getHistory(100);
        if (Array.isArray(res)) {
          const teacherItems = res.filter((item) => {
            const isTeacher = (item.role || "").toLowerCase() === "teacher";
            const p = item.payload || item.input_payload || {};
            const tCode = p.teacher_code || p.teacher_id || item.teacher_id;
            const matchesCode = teacher.code && tCode === teacher.code;
            const matchesId = teacher.id && (tCode === teacher.id || item.user_id === teacher.id);
            return isTeacher && (matchesCode || matchesId);
          });
          rawList = [...rawList, ...teacherItems];
        }
      }
    } catch (e) {
      console.warn("Could not load prediction history from API:", e);
    }

    // Strict zero-data policy: If instructor hasn't evaluated any students yet, roster remains completely empty!

    // 4. De-duplicate by Student ID (keep most recent evaluation per student)
    const studentMap = new Map();
    rawList.forEach((item) => {
      const payload = item.payload || {};
      const sId = item.student_id || payload.student_id || payload.student_id_code || item.roll_no || item.id || "STU-001";
      const sName = item.student_name || payload.student_name || payload.name || "Student";
      const sStage = (item.stage || payload.stage || "university").toLowerCase();
      const score = item.predicted_score ?? item.score ?? payload.predicted_score ?? 3.5;
      const grade = item.predicted_grade || item.grade || "Grade A";
      const badge = item.status_badge || "On Track";
      const color = item.status_color || (badge.includes("Exemplary") ? "badge-success" : badge.includes("Risk") ? "badge-warning" : "badge-info");
      const att = payload.attendance_pct ?? payload.Attendance_Pct ?? payload.Attendance_Rate ?? item.attendance_pct ?? 85;
      const courses = payload.subjects || payload.courses || item.courses || [];
      const focus = payload.attentiveness_level || item.attentive || "High";
      const comm = payload.communication_skill || item.comm_skill || "Good";
      const need = payload.academic_need || item.academic_need || "Independent";
      const rating = payload.teacher_rating || item.rating || 4.5;
      const time = item.timestamp || item.created_at || new Date().toISOString();

      if (!studentMap.has(sId) || new Date(time) > new Date(studentMap.get(sId).timestamp)) {
        studentMap.set(sId, {
          id: item.id || sId,
          student_id: sId,
          student_name: sName,
          stage: sStage,
          predicted_score: score,
          predicted_grade: grade,
          status_badge: badge,
          status_color: color,
          attendance_pct: att,
          courses: courses,
          attentive: focus,
          comm_skill: comm,
          academic_need: need,
          rating: rating,
          timestamp: time
        });
      }
    });

    evaluatedStudentsList = Array.from(studentMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    applyFilters();
  }

  function applyFilters() {
    const st = stageFilter?.value || "all";

    filteredStudentsList = evaluatedStudentsList.filter((s) => {
      return st === "all" || (s.stage || "").toLowerCase() === st.toLowerCase();
    });

    renderRosterKPIs();
    renderRosterTable();
  }

  if (stageFilter) stageFilter.addEventListener("change", applyFilters);

  function renderRosterKPIs() {
    const total = evaluatedStudentsList.length;
    if (kpiClassSize) kpiClassSize.innerText = `${total}`;

    if (total === 0) {
      if (kpiPassRate) kpiPassRate.innerText = "--";
      if (kpiHighRisk) kpiHighRisk.innerText = "0";
      if (kpiClassAvg) kpiClassAvg.innerText = "--";
      if (pedagogySummaryEl) {
        pedagogySummaryEl.innerText = "No individual students evaluated yet. Launch the Teacher Prediction Suite to begin diagnosing students.";
      }
      return;
    }

    let passingCount = 0;
    let highRiskCount = 0;
    let sumScore = 0;

    evaluatedStudentsList.forEach((s) => {
      const raw = parseFloat(s.predicted_score) || 0;
      const isUni = s.stage === "university" || raw <= 4.0;
      const pct = isUni ? (raw / 4.0) * 100 : raw;
      if (pct >= 50) passingCount++;
      if (pct < 60 || (s.status_badge || "").toLowerCase().includes("risk") || (s.academic_need || "").toLowerCase().includes("remedial") || (s.academic_need || "").toLowerCase().includes("high")) {
        highRiskCount++;
      }
      sumScore += pct;
    });

    const passRate = ((passingCount / total) * 100).toFixed(1);
    const avgScore = (sumScore / total).toFixed(1);

    if (kpiPassRate) kpiPassRate.innerText = `${passRate}%`;
    if (kpiHighRisk) kpiHighRisk.innerText = `${highRiskCount}`;
    if (kpiClassAvg) kpiClassAvg.innerText = `${avgScore}%`;

    if (pedagogySummaryEl) {
      pedagogySummaryEl.innerText = `${total} distinct student(s) evaluated. Cohort pass rate is ${passRate}% with ${highRiskCount} student(s) flagged for intensive remedial coaching.`;
    }
  }

  function renderRosterTable() {
    if (!dashboardRosterBody) return;

    if (filteredStudentsList.length === 0) {
      dashboardRosterBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 48px 16px;">
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
              No Evaluated Students Yet
            </div>
            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
              You have not evaluated any students in your instructor profile yet.
            </div>
            <a href="teacher-prediction.html" class="btn btn-primary btn-sm">⚡ Run AI</a>
          </td>
        </tr>
      `;
      return;
    }

    dashboardRosterBody.innerHTML = filteredStudentsList
      .map((s) => {
        const stageName = s.stage.charAt(0).toUpperCase() + s.stage.slice(1);
        const scoreVal = typeof s.predicted_score === "number" ? s.predicted_score.toFixed(2) : s.predicted_score;
        const scoreSuffix = s.stage === "university" || parseFloat(scoreVal) <= 4.0 ? " CGPA" : "%";
        const badgeColor = s.status_color || "badge-success";
        const badgeText = s.status_badge || "Evaluated";
        const coursesCount = (s.courses || []).length || 1;

        return `
        <tr>
          <td style="font-weight: 700; color: var(--color-lime); font-family: 'JetBrains Mono', monospace; font-size: 12.5px;">
            ${s.student_id}
          </td>
          <td style="font-weight: 600; color: #ffffff;">
            ${s.student_name}
          </td>
          <td>
            <span class="badge badge-primary" style="font-size: 11px;">${stageName}</span>
          </td>
          <td>
            <span style="font-weight: 600; color: #ffffff;">${coursesCount} Course(s)</span>
          </td>
          <td>${s.attendance_pct || 85}%</td>
          <td style="font-weight: 800; color: var(--color-lime); font-size: 13.5px;">
            ${scoreVal}${scoreSuffix}
          </td>
          <td>
            <span class="badge ${badgeColor}">${badgeText}</span>
          </td>
          <td style="font-size: 11.5px; color: var(--text-secondary);">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <span class="badge badge-neutral" title="Classroom Focus">${s.attentive || 'High'} Focus</span>
              <span class="badge badge-neutral" title="Verbal Presentation">${s.comm_skill || 'Good'}</span>
              <span class="badge ${s.academic_need === 'High' ? 'badge-warning' : 'badge-neutral'}" title="Support Need">${s.academic_need || 'Independent'}</span>
            </div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <a href="teacher-prediction.html?student_id=${encodeURIComponent(s.student_id)}&name=${encodeURIComponent(s.student_name)}&stage=${encodeURIComponent(s.stage)}" 
                 class="table-icon-btn btn-eval" title="Open in AI Evaluation Suite">
                ⚡ Run AI
              </a>
              <button type="button" class="table-icon-btn btn-delete btn-delete-t-student" data-id="${s.student_id}" data-name="${s.student_name}" title="Delete Record">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    attachDashboardDeleteHandlers();
  }

  // Standardized Delete Confirmation Logic
  let pendingDeleteStudentId = null;
  const modalDeleteTStudent = document.getElementById("modal-delete-t-student");
  const btnCloseDelTModal = document.getElementById("btn-close-del-t-modal");
  const btnCancelDelTModal = document.getElementById("btn-cancel-del-t-modal");
  const btnConfirmDelTStudent = document.getElementById("btn-confirm-del-t-student");

  function attachDashboardDeleteHandlers() {
    document.querySelectorAll(".btn-delete-t-student").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const name = e.currentTarget.getAttribute("data-name");
        pendingDeleteStudentId = id;

        const targetNameEl = document.getElementById("del-t-target-name");
        const targetIdEl = document.getElementById("del-t-target-id");
        if (targetNameEl) targetNameEl.innerText = name || "Student";
        if (targetIdEl) targetIdEl.innerText = `ID: ${id}`;

        if (modalDeleteTStudent) modalDeleteTStudent.classList.add("active");
      });
    });
  }

  if (btnCloseDelTModal) btnCloseDelTModal.addEventListener("click", () => modalDeleteTStudent?.classList.remove("active"));
  if (btnCancelDelTModal) btnCancelDelTModal.addEventListener("click", () => modalDeleteTStudent?.classList.remove("active"));

  if (btnConfirmDelTStudent) {
    btnConfirmDelTStudent.addEventListener("click", () => {
      if (!pendingDeleteStudentId) return;

      const teacher = getTeacherIdentity();
      evaluatedStudentsStore = evaluatedStudentsStore.filter((x) => String(x.student_id) !== String(pendingDeleteStudentId));
      localStorage.setItem(teacher.storageKey, JSON.stringify(evaluatedStudentsStore));

      if (modalDeleteTStudent) modalDeleteTStudent.classList.remove("active");
      pendingDeleteStudentId = null;

      renderRosterTable();
      computeDashboardKPIs(evaluatedStudentsStore);
      showToast("Student evaluation removed from dashboard.", "success");
    });
  }



  // Initial Load
  loadEvaluatedStudents();
});

