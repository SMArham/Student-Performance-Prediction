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
  const initialTeacher = getTeacherIdentity();
  if (teacherNameEl) teacherNameEl.innerText = initialTeacher.name;
  if (teacherIdCodeEl) teacherIdCodeEl.innerText = initialTeacher.code;

  // Logout Handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
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
    const email = (u?.email || "").toLowerCase().trim();
    const isRealUuid = u?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id);

    // Primary unique tenant ID: Real UUID or unique email. NEVER generic "TCH-01"!
    let uid = isRealUuid ? u.id : (email || null);
    if (!uid) {
      if (u?.id && u.id !== "TCH-01" && u.id !== "TCH-2026-001" && !u.id.startsWith("TCH-")) {
        uid = u.id;
      } else if (email) {
        uid = `tch_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else {
        uid = "teacher_isolated_guest";
      }
    }

    let code = meta.id_code || meta.student_id;
    if (!code || code === "TCH-01" || code === "TCH-2026-001") {
      code = email ? `TCH-${(email.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "01").toUpperCase()}` : (uid ? `TCH-${uid.slice(-4).toUpperCase()}` : "TCH-01");
    }

    return {
      id: uid,
      email: email,
      code: code,
      name: meta.full_name || "Instructor",
      storageKey: `edumetrics_teacher_${uid}`
    };
  }

  async function loadEvaluatedStudents() {
    let rawList = [];
    const teacher = getTeacherIdentity();

    if (!teacher.id) {
      evaluatedStudentsList = [];
      filteredStudentsList = [];
      applyFilters();
      return;
    }

    // 0. Self-healing purge: Remove legacy test student 111 / arham from all unisolated storage keys
    try {
      ["edumetrics_teacher_TCH-01", "edumetrics_teacher_default", "edumetrics_teacher_guest", "edumetrics_teacher_teacher_isolated_guest"].forEach((k) => {
        const val = localStorage.getItem(k);
        if (val && (val.includes('"111"') || val.includes('"arham"') || val.includes("3.52"))) {
          localStorage.removeItem(k);
        }
      });
      if (teacher.storageKey) {
        const myVal = localStorage.getItem(teacher.storageKey);
        if (myVal && (myVal.includes('"111"') || myVal.includes('"arham"'))) {
          try {
            let list = JSON.parse(myVal);
            if (Array.isArray(list)) {
              list = list.filter((item) => {
                const sid = String(item.student_id || item.id || "");
                const sname = String(item.student_name || "").toLowerCase().trim();
                return sid !== "111" && sname !== "arham" && sid !== "STU-111";
              });
              if (list.length === 0) localStorage.removeItem(teacher.storageKey);
              else localStorage.setItem(teacher.storageKey, JSON.stringify(list));
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    // Cloud auto-purge of legacy unisolated test row
    if (window.authClient && window.authClient.client) {
      try {
        window.authClient.client
          .from("teacher_class_roster")
          .delete()
          .or("student_id_code.eq.111,student_name.eq.arham,id.eq.STU-111")
          .then(() => {})
          .catch(() => {});
      } catch (e) {}
    }

    // Check tombstones for this teacher
    const tombstoneKey = `sp_deleted_teacher_student_ids_${teacher.id}`;
    let tombstones = [];
    try {
      tombstones = JSON.parse(localStorage.getItem(tombstoneKey) || "[]");
      if (!Array.isArray(tombstones)) tombstones = [];
    } catch (e) {
      tombstones = [];
    }

    if (tombstones.includes("*")) {
      evaluatedStudentsList = [];
      filteredStudentsList = [];
      applyFilters();
      return;
    }

    // 1. Read strictly from this teacher's isolated storage key
    try {
      const candidateKeys = [teacher.storageKey];
      if (teacher.id) candidateKeys.push(`edumetrics_teacher_${teacher.id}`);

      const uniqueCandidateKeys = Array.from(new Set(candidateKeys)).filter(k => !k.includes("TCH-01") && !k.includes("default"));
      for (const k of uniqueCandidateKeys) {
        const localStr = localStorage.getItem(k);
        if (localStr) {
          const parsed = JSON.parse(localStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawList = [...parsed];
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Could not load evaluations from localStorage:", e);
    }

    // 2. Fetch directly from live Supabase Cloud Database (prediction_history & teacher_class_roster)
    if (window.authClient && window.authClient.client && teacher.id) {
      try {
        let q = window.authClient.client
          .from("prediction_history")
          .select("*")
          .order("created_at", { ascending: false });

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacher.id);
        if (isUuid) {
          q = q.eq("user_id", teacher.id);
        }

        const { data, error } = await q.limit(100);
        if (!error && Array.isArray(data) && data.length > 0) {
          const cloudTeacherEvals = data
            .filter((item) => {
              const p = item.input_features || item.payload || {};
              const matchesTeacher =
                (item.user_id && item.user_id === teacher.id) ||
                (p.teacher_id && p.teacher_id === teacher.id) ||
                (teacher.email && (p.teacher_email === teacher.email || item.email === teacher.email));
              return matchesTeacher;
            })
            .map((item) => {
              const p = item.input_features || item.payload || {};
              return {
                ...p,
                id: item.id,
                created_at: item.created_at,
                timestamp: item.created_at,
                predicted_score: item.predicted_score ?? p.predicted_score ?? 3.5,
                predicted_grade: item.predicted_grade || p.predicted_grade || "Grade A",
                status_badge: item.status_badge || p.status_badge || "On Track"
              };
            });
          rawList = [...rawList, ...cloudTeacherEvals];
        }
      } catch (cloudErr) {
        console.warn("[TeacherDashboard] Supabase history query note:", cloudErr);
      }

      try {
        let rosterQuery = window.authClient.client
          .from("teacher_class_roster")
          .select("*")
          .order("created_at", { ascending: false })
          .eq("teacher_id", teacher.id);

        const { data: rosterData, error: rosterErr } = await rosterQuery.limit(100);

        if (!rosterErr && Array.isArray(rosterData) && rosterData.length > 0) {
          const matchingRoster = rosterData
            .filter((r) => r.teacher_id === teacher.id || (teacher.email && r.teacher_email === teacher.email))
            .map((r) => ({
              id: r.id,
              student_id: r.student_id_code || r.roll_no || r.id,
              student_name: r.student_name,
              stage: r.stage || "university",
              predicted_score: r.predicted_score ?? 3.5,
              predicted_grade: r.predicted_grade || "Grade A",
              status_badge: r.status_badge || r.risk_level || "On Track",
              status_color: r.status_color || "badge-success",
              attendance_pct: r.attendance_pct || 85,
              courses: [{ name: r.subject || "Coursework", obtained: r.midterm_score || 85, total: 100 }],
              attentive: "High",
              comm_skill: "Good",
              academic_need: "Independent",
              rating: 5.0,
              notes: r.notes || "",
              timestamp: r.created_at || new Date().toISOString()
            }));
          rawList = [...rawList, ...matchingRoster];
        }
      } catch (rosterErr) {
        console.warn("[TeacherDashboard] Supabase roster query note:", rosterErr);
      }
    }

    // 3. Fetch from Backend History ONLY if explicitly tagged for this instructor
    try {
      if (window.apiClient && teacher.id) {
        const res = await window.apiClient.getHistory(100);
        if (Array.isArray(res)) {
          const teacherItems = res.filter((item) => {
            const isTeacher = (item.role || "").toLowerCase() === "teacher";
            const p = item.payload || item.input_payload || {};
            const tCode = p.teacher_code || p.teacher_id || item.teacher_id;
            const matchesId = (tCode === teacher.id || item.user_id === teacher.id || (teacher.email && p.teacher_email === teacher.email));
            return isTeacher && matchesId;
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
      const sId = String(item.student_id || payload.student_id || payload.student_id_code || item.roll_no || item.id || "STU-001");
      const sName = item.student_name || payload.student_name || payload.name || "Student";
      if (tombstones.includes(sId) || tombstones.includes(`STU-${sId}`) || sId === "111" || sId === "STU-111" || sName.toLowerCase().trim() === "arham") {
        return; // Exclude deleted and legacy test student
      }
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

  // ==========================================================================
  // DELETE & PURGE HELPERS (SUPABASE + LOCAL STORAGE + TOMBSTONES)
  // ==========================================================================
  async function deleteTeacherStudent(studentId, studentName) {
    if (!studentId) return;
    const teacher = getTeacherIdentity();
    const targetIdStr = String(studentId).trim();

    // 1. Tombstone in localStorage
    const tombstoneKey = `sp_deleted_teacher_student_ids_${teacher.id || teacher.code || "default"}`;
    try {
      let tombstones = JSON.parse(localStorage.getItem(tombstoneKey) || "[]");
      if (!Array.isArray(tombstones)) tombstones = [];
      if (!tombstones.includes(targetIdStr)) tombstones.push(targetIdStr);
      if (!tombstones.includes(`STU-${targetIdStr}`)) tombstones.push(`STU-${targetIdStr}`);
      localStorage.setItem(tombstoneKey, JSON.stringify(tombstones));
    } catch (e) {}

    // 2. Remove from candidate localStorage keys
    const candidateKeys = [
      teacher.storageKey,
      `edumetrics_teacher_${teacher.code}`,
      `edumetrics_teacher_${teacher.id}`,
      "edumetrics_teacher_default"
    ];
    Array.from(new Set(candidateKeys)).forEach((k) => {
      try {
        const stored = localStorage.getItem(k);
        if (stored) {
          let list = JSON.parse(stored) || [];
          if (Array.isArray(list)) {
            list = list.filter((s) => {
              const sid = String(s.student_id || s.id || "");
              return sid !== targetIdStr && sid !== `STU-${targetIdStr}` && (!studentName || s.student_name !== studentName);
            });
            localStorage.setItem(k, JSON.stringify(list));
          }
        }
      } catch (e) {}
    });

    // 3. Delete from Supabase `teacher_class_roster`
    if (window.authClient && window.authClient.client) {
      try {
        await window.authClient.client
          .from("teacher_class_roster")
          .delete()
          .or(`id.eq.${targetIdStr},id.eq.STU-${targetIdStr},student_id_code.eq.${targetIdStr}`);
      } catch (err) {
        console.warn("[Delete] Roster table delete notice:", err);
      }
      if (studentName) {
        try {
          let q = window.authClient.client.from("teacher_class_roster").delete().eq("student_name", studentName);
          if (teacher.id) q = q.eq("teacher_id", teacher.id);
          await q;
        } catch (err) {}
      }

      // 4. Delete from Supabase `prediction_history`
      try {
        const { data: histData } = await window.authClient.client
          .from("prediction_history")
          .select("id, input_features, payload, user_id")
          .order("created_at", { ascending: false })
          .limit(100);

        if (Array.isArray(histData)) {
          const idsToDelete = histData.filter((h) => {
            const p = h.input_features || h.payload || {};
            const matchesTeacher = (teacher.id && (h.user_id === teacher.id || p.teacher_id === teacher.id)) ||
                                   (teacher.code && p.teacher_id === teacher.code) ||
                                   (p.role === "teacher");
            if (!matchesTeacher) return false;
            const pStudentId = String(p.student_id || p.student_id_code || h.id || "");
            const pStudentName = p.student_name || "";
            return pStudentId === targetIdStr || pStudentId === `STU-${targetIdStr}` || (studentName && pStudentName === studentName);
          }).map((h) => h.id);

          if (idsToDelete.length > 0) {
            await window.authClient.client
              .from("prediction_history")
              .delete()
              .in("id", idsToDelete);
          }
        }
      } catch (err) {
        console.warn("[Delete] Prediction history delete notice:", err);
      }
    }
  }

  async function wipeAllTeacherEvaluations() {
    const teacher = getTeacherIdentity();

    // 1. Record wildcard tombstone
    const tombstoneKey = `sp_deleted_teacher_student_ids_${teacher.id || teacher.code || "default"}`;
    localStorage.setItem(tombstoneKey, JSON.stringify(["*"]));

    // 2. Clear all candidate localStorage keys
    const candidateKeys = [
      teacher.storageKey,
      `edumetrics_teacher_${teacher.code}`,
      `edumetrics_teacher_${teacher.id}`,
      "edumetrics_teacher_default"
    ];
    Array.from(new Set(candidateKeys)).forEach((k) => localStorage.removeItem(k));

    // 3. Delete from Supabase `teacher_class_roster`
    if (window.authClient && window.authClient.client) {
      try {
        if (teacher.id && teacher.code) {
          await window.authClient.client
            .from("teacher_class_roster")
            .delete()
            .or(`teacher_id.eq.${teacher.id},teacher_id.eq.${teacher.code}`);
        } else if (teacher.id) {
          await window.authClient.client
            .from("teacher_class_roster")
            .delete()
            .eq("teacher_id", teacher.id);
        } else if (teacher.code) {
          await window.authClient.client
            .from("teacher_class_roster")
            .delete()
            .eq("teacher_id", teacher.code);
        }
      } catch (err) {
        console.warn("[Wipe] Roster table wipe notice:", err);
      }

      // 4. Delete from Supabase `prediction_history`
      try {
        const { data: histData } = await window.authClient.client
          .from("prediction_history")
          .select("id, input_features, payload, user_id")
          .order("created_at", { ascending: false })
          .limit(200);

        if (Array.isArray(histData)) {
          const idsToDelete = histData.filter((h) => {
            const p = h.input_features || h.payload || {};
            const matchesTeacher = (teacher.id && (h.user_id === teacher.id || p.teacher_id === teacher.id)) ||
                                   (teacher.code && p.teacher_id === teacher.code);
            return matchesTeacher;
          }).map((h) => h.id);

          if (idsToDelete.length > 0) {
            await window.authClient.client
              .from("prediction_history")
              .delete()
              .in("id", idsToDelete);
          }
        }
      } catch (err) {
        console.warn("[Wipe] Prediction history wipe notice:", err);
      }
    }
  }

  // Standardized Table Row Delete Handler
  function attachDashboardDeleteHandlers() {
    document.querySelectorAll(".btn-delete-t-student").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        if (!id) return;

        const displayName = name ? `${name} (ID: ${id})` : `student ${id}`;
        const confirmed = window.confirm(`Are you sure you want to delete the evaluation record for ${displayName}?`);
        if (!confirmed) return;

        // Instantly/optimistically remove from UI
        evaluatedStudentsList = evaluatedStudentsList.filter(
          (x) => String(x.student_id) !== String(id) && String(x.id) !== String(id)
        );
        applyFilters();
        showToast(`Evaluation record for ${name || id} deleted successfully.`, "success");

        // Background delete from Supabase and LocalStorage
        await deleteTeacherStudent(id, name);
      });
    });
  }

  // Clear Entire Roster Action
  const btnClearTRoster = document.getElementById("btn-clear-t-roster");
  if (btnClearTRoster) {
    btnClearTRoster.addEventListener("click", async (e) => {
      e.preventDefault();
      const val = window.prompt("⚠️ WARNING: This will permanently delete ALL evaluated students from your dashboard.\n\nType CLEAR to confirm:");
      if (!val || val.trim().toUpperCase() !== "CLEAR") {
        if (val !== null) {
          showToast("Clear cancelled: You must type 'CLEAR' to wipe the ledger.", "warning");
        }
        return;
      }

      // Instantly clear UI
      evaluatedStudentsList = [];
      filteredStudentsList = [];
      applyFilters();
      showToast("All student evaluation records permanently wiped.", "info");

      // Background wipe from Supabase and LocalStorage
      await wipeAllTeacherEvaluations();
    });
  }

  // Initial Load
  loadEvaluatedStudents();
});

