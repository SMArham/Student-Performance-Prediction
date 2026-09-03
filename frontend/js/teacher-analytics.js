/**
 * ============================================================================
 * EDUMETRICS AI — TEACHER COHORT ANALYTICS & VISUALIZATIONS (teacher-analytics.js)
 * Complete Cohort Telemetry: Academic Scores, Behavioral Matrix, Communication,
 * Course Mastery (Theory vs Quiz vs Assignment), and Risk Stratification Charts
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

  // Live Database Health Check
  if (window.authClient && typeof window.authClient.checkDatabaseHealth === "function") {
    window.authClient.checkDatabaseHealth().then((status) => {
      const text = document.getElementById("db-health-text");
      if (text) {
        text.innerText = status.connected ? `Supabase Cloud (${status.latency}ms)` : "Local Cache Active";
      }
    });
  }

  // Set Chart.js universal font to Inter for unified design system consistency
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  function syncTeacherProfile() {
    const teacherNameEl = document.getElementById("teacher-name");
    const teacherIdCodeEl = document.getElementById("teacher-id-code");
    const name = userMeta.full_name || "Instructor Portal";
    const idCode = userMeta.student_id || userMeta.id_code || "TCH-2026-001";
    if (teacherNameEl) teacherNameEl.innerText = name;
    if (teacherIdCodeEl) teacherIdCodeEl.innerText = idCode;
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

  const cohortTopScore = document.getElementById("cohort-top-score");
  const cohortMidScore = document.getElementById("cohort-mid-score");
  const cohortLowScore = document.getElementById("cohort-low-score");

  const masteryTheoryVal = document.getElementById("mastery-theory-val");
  const masteryQuizVal = document.getElementById("mastery-quiz-val");
  const masteryAssignVal = document.getElementById("mastery-assign-val");

  const filterStage = document.getElementById("t-filter-stage");
  const filterRisk = document.getElementById("t-filter-risk");

  const ledgerTbody = document.getElementById("cohort-master-tbody");
  const ledgerCountBadge = document.getElementById("ledger-count-badge");

  // Chart Instances
  let chartScores = null;
  let chartRisk = null;
  let chartBehavior = null;
  let chartMastery = null;

  // Fullscreen Modal DOMs
  const fsModal = document.getElementById("analytics-fullscreen-modal");
  const fsCanvas = document.getElementById("fullscreenChartCanvas");
  const fsTitle = document.getElementById("fs-modal-title");
  const fsSubtitle = document.getElementById("fs-modal-subtitle");
  const btnCloseFs = document.getElementById("btn-close-fs-modal");
  const btnCloseFsBtn = document.getElementById("btn-close-fs-modal-btn");
  const btnFsDownloadPng = document.getElementById("btn-fs-download-png");
  let fsChartInstance = null;
  let currentActiveChartType = null;

  // 3. Data Store (Strictly isolated per instructor — No mock data)
  let cohortStudents = [];

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

  // Load All Cohort Evaluations for the logged-in instructor
  async function loadCohortData() {
    const teacher = getTeacherIdentity();

    let localEvals = [];
    try {
      const candidateKeys = [teacher.storageKey];
      if (teacher.code) candidateKeys.push(`edumetrics_teacher_${teacher.code}`);
      if (teacher.id) candidateKeys.push(`edumetrics_teacher_${teacher.id}`);

      for (const k of candidateKeys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored) || [];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localEvals = parsed;
            break;
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse teacher evaluations from localStorage:", e);
    }

    let remoteEvals = [];

    // Direct live Supabase Cloud Database Table Query (prediction_history & teacher_class_roster)
    if (window.authClient && window.authClient.client && (teacher.id || teacher.code)) {
      try {
        let q = window.authClient.client
          .from("prediction_history")
          .select("*")
          .order("created_at", { ascending: false });

        if (teacher.id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacher.id);
          if (isUuid) {
            q = q.eq("user_id", teacher.id);
          }
        }

        const { data, error } = await q.limit(100);
        if (!error && Array.isArray(data)) {
          data.forEach((item) => {
            const p = item.input_features || item.payload || {};
            const matchesTeacher = (teacher.id && (item.user_id === teacher.id || p.teacher_id === teacher.id)) ||
                                   (teacher.code && p.teacher_id === teacher.code);
            if (matchesTeacher) {
              const sId = p.student_id || item.student_id || "STU-" + String(item.id).slice(0, 4);
              remoteEvals.push({
                student_id: sId,
                student_name: p.student_name || item.student_name || "Evaluated Student",
                stage: item.stage || p.stage || "university",
                predicted_score: item.predicted_score ?? p.predicted_score ?? 3.65,
                predicted_grade: item.predicted_grade || p.predicted_grade || "Grade A",
                status_badge: item.status_badge || p.status_badge || "On Track",
                status_color: (item.status_badge || p.status_badge || "").includes("Risk") ? "badge-danger" : "badge-success",
                attendance_pct: p.attendance_pct || 85,
                coursework_pct: p.coursework_pct || 80,
                attentive: p.attentive || p.attentiveness_level || "High",
                comm_skill: p.comm_skill || p.communication_skill || "Good",
                behavior: p.behavior || p.behavior_discipline || "Exemplary",
                participation: p.participation || p.discussion_participation || "Active",
                academic_need: p.academic_need || "Independent",
                rating: item.teacher_rating ?? p.rating ?? p.teacher_rating ?? 5.0,
                notes: item.teacher_notes || p.notes || "",
                courses: p.subjects || p.courses || [],
                timestamp: item.created_at || item.timestamp || new Date().toISOString()
              });
            }
          });
        }
      } catch (cloudErr) {
        console.warn("[TeacherAnalytics] Supabase history query note:", cloudErr);
      }

      try {
        let rosterQuery = window.authClient.client
          .from("teacher_class_roster")
          .select("*")
          .order("created_at", { ascending: false });

        if (teacher.id && teacher.code) {
          rosterQuery = rosterQuery.or(`teacher_id.eq.${teacher.id},teacher_id.eq.${teacher.code}`);
        } else if (teacher.id) {
          rosterQuery = rosterQuery.eq("teacher_id", teacher.id);
        } else if (teacher.code) {
          rosterQuery = rosterQuery.eq("teacher_id", teacher.code);
        }

        const { data: rosterData, error: rosterErr } = await rosterQuery.limit(100);

        if (!rosterErr && Array.isArray(rosterData)) {
          rosterData.forEach((r) => {
            if ((teacher.id && r.teacher_id === teacher.id) || (teacher.code && r.teacher_id === teacher.code)) {
              const sId = r.student_id_code || r.roll_no || r.id;
              remoteEvals.push({
                student_id: sId,
                student_name: r.student_name,
                stage: r.stage || "university",
                predicted_score: r.predicted_score ?? 3.65,
                predicted_grade: r.predicted_grade || "Grade A",
                status_badge: r.status_badge || r.risk_level || "On Track",
                status_color: r.status_color || "badge-success",
                attendance_pct: r.attendance_pct || 85,
                coursework_pct: r.quiz_test_pct || 80,
                attentive: "High",
                comm_skill: "Good",
                behavior: "Exemplary",
                participation: "Active",
                academic_need: "Independent",
                rating: 5.0,
                notes: r.notes || "",
                courses: [{ name: r.subject || "Coursework", obtained: r.midterm_score || 85, total: 100 }],
                timestamp: r.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (rosterErr) {
        console.warn("[TeacherAnalytics] Supabase roster query note:", rosterErr);
      }
    }

    try {
      if (window.apiClient && (teacher.code || teacher.id)) {
        const res = await window.apiClient.get("/api/v1/history");
        const list = res.history || res.data || (Array.isArray(res) ? res : []);
        list.forEach((item) => {
          const isTeacher = (item.role || "").toLowerCase() === "teacher" || item.input_payload?.role === "teacher";
          const p = item.input_payload || item.payload || {};
          const tCode = p.teacher_code || p.teacher_id || item.teacher_id;
          const matchesCode = teacher.code && tCode === teacher.code;
          const matchesId = teacher.id && (tCode === teacher.id || item.user_id === teacher.id);
          if (isTeacher && (matchesCode || matchesId)) {
            remoteEvals.push({
              student_id: p.student_id || item.student_id || "STU-" + item.id?.slice(0, 4),
              student_name: p.student_name || item.student_name || "Evaluated Student",
              stage: item.stage || p.stage || "university",
              predicted_score: item.predicted_score ?? p.predicted_score ?? 3.65,
              predicted_grade: item.predicted_grade || p.predicted_grade || "Grade A",
              status_badge: item.status_badge || p.status_badge || "On Track",
              status_color: item.status_badge?.includes("Risk") ? "badge-danger" : "badge-success",
              attendance_pct: p.attendance_pct || 85,
              coursework_pct: p.coursework_pct || 80,
              attentive: p.attentive || p.attentiveness_level || "High",
              comm_skill: p.comm_skill || p.communication_skill || "Good",
              behavior: p.behavior || p.behavior_discipline || "Exemplary",
              participation: p.participation || p.discussion_participation || "Active",
              academic_need: p.academic_need || "Independent",
              rating: item.teacher_rating ?? p.rating ?? p.teacher_rating ?? 5.0,
              notes: item.teacher_notes || p.notes || "",
              courses: p.subjects || p.courses || [],
              timestamp: item.created_at || item.timestamp || new Date().toISOString()
            });
          }
        });
      }
    } catch (apiErr) {
      console.warn("Could not fetch remote evaluations:", apiErr);
    }

    // Combine local + remote evaluations for this teacher only (de-duplicated by student_id)
    const combinedMap = new Map();
    [...remoteEvals, ...localEvals].forEach((s) => {
      if (s && s.student_id) {
        combinedMap.set(s.student_id, s);
      }
    });

    cohortStudents = Array.from(combinedMap.values());
    updateAnalyticsView();
  }

  // Helper: Normalize score to percentage (0 - 100)
  function normalizeToPercentage(student) {
    const raw = Number(student.predicted_score) || 0;
    const stage = (student.stage || "").toLowerCase();
    if (stage === "university") {
      // 0.0 - 4.0 GPA scale -> 0 - 100%
      return Math.min(100, Math.max(0, (raw / 4.0) * 100));
    }
    return Math.min(100, Math.max(0, raw));
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
    let maxPct = 0;
    let minPct = total > 0 ? 100 : 0;

    filtered.forEach((s) => {
      const pct = normalizeToPercentage(s);
      sumScorePct += pct;
      if (pct > maxPct) maxPct = pct;
      if (pct < minPct) minPct = pct;

      const badge = (s.status_badge || "").toLowerCase();
      const need = (s.academic_need || "").toLowerCase();

      // Passing threshold >= 50%
      if (pct >= 50 && !badge.includes("fail") && !badge.includes("critical")) {
        passCount++;
      }
      // High risk: score < 50% or explicit high risk / remedial coaching tag
      if (pct < 50 || badge.includes("risk") || badge.includes("remedial") || badge.includes("intervention") || need.includes("high")) {
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

    const activeStage = filterStage ? filterStage.options[filterStage.selectedIndex].text : "All Tiers";
    if (kpiStagesMeta) kpiStagesMeta.innerText = total > 0 ? `Filtered by: ${activeStage}` : "No student evaluations recorded";

    // Benchmark Mini Strip
    if (cohortTopScore) cohortTopScore.innerText = total > 0 ? `${maxPct.toFixed(1)}%` : "--";
    if (cohortMidScore) cohortMidScore.innerText = total > 0 ? `${meanPct}%` : "--";
    if (cohortLowScore) cohortLowScore.innerText = total > 0 ? `${minPct.toFixed(1)}%` : "--";

    // 2. Render Charts
    renderChartStudentScores(filtered);
    renderChartRiskDonut(filtered);
    renderChartBehaviorRadar(filtered);
    renderChartComponentMastery(filtered);

    // 3. Render Master Ledger Table
    renderMasterLedgerTable(filtered);
  }

  // --------------------------------------------------------------------------
  // CHART 1: Student Scores & Coursework Distribution
  // --------------------------------------------------------------------------
  function renderChartStudentScores(students) {
    const ctx = document.getElementById("tChartStudentScores")?.getContext("2d");
    if (!ctx) return;

    if (chartScores) chartScores.destroy();

    const displayStudents = students.slice(0, 10);
    const labels = displayStudents.length > 0 ? displayStudents.map((s) => s.student_name || s.student_id) : ["No Students Evaluated Yet"];
    const predScores = displayStudents.length > 0 ? displayStudents.map((s) => Number(normalizeToPercentage(s).toFixed(1))) : [0];
    const courseScores = displayStudents.length > 0 ? displayStudents.map((s) => Number(parseFloat(s.coursework_pct || s.attendance_pct || 0).toFixed(1))) : [0];

    chartScores = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "AI Projected Final Marks %",
            data: predScores,
            backgroundColor: "rgba(187, 247, 96, 0.85)",
            borderColor: "#bbf760",
            borderWidth: 1.5,
            borderRadius: 6,
            barPercentage: 0.65
          },
          {
            label: "Coursework Continuous Avg %",
            data: courseScores,
            backgroundColor: "rgba(56, 189, 248, 0.7)",
            borderColor: "#38bdf8",
            borderWidth: 1.5,
            borderRadius: 6,
            barPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#94a3b8", font: { size: 11, weight: "600" } }
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#ffffff",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#94a3b8", font: { size: 11 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#94a3b8",
              font: { size: 11 },
              callback: (v) => v + "%"
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // CHART 2: Cohort Grade Standing & Risk Stratification (Donut)
  // --------------------------------------------------------------------------
  function renderChartRiskDonut(students) {
    const ctx = document.getElementById("tChartRiskDonut")?.getContext("2d");
    if (!ctx) return;

    if (chartRisk) chartRisk.destroy();

    if (students.length === 0) {
      chartRisk = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["No Class Evaluations Recorded"],
          datasets: [
            {
              data: [1],
              backgroundColor: ["rgba(255, 255, 255, 0.05)"],
              borderColor: "rgba(255, 255, 255, 0.08)",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#64748b", font: { size: 11, weight: "600" }, usePointStyle: true }
            },
            tooltip: { enabled: false }
          }
        }
      });
      return;
    }

    let exemplary = 0;
    let onTrack = 0;
    let moderate = 0;
    let highRisk = 0;

    students.forEach((s) => {
      const pct = normalizeToPercentage(s);
      const status = (s.status_badge || "").toLowerCase();
      const need = (s.academic_need || "").toLowerCase();

      if (pct >= 80 || status.includes("exemplary")) {
        exemplary++;
      } else if ((pct >= 65 && pct < 80) || status.includes("track") || status.includes("honors") || status.includes("proficient")) {
        onTrack++;
      } else if ((pct >= 50 && pct < 65) || status.includes("moderate") || status.includes("attention")) {
        moderate++;
      } else {
        highRisk++;
      }
    });

    const total = students.length || 1;

    chartRisk = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          `Exemplary / Honors (${exemplary})`,
          `On Track / Proficient (${onTrack})`,
          `Moderate Attention (${moderate})`,
          `Critical Risk / Remedial (${highRisk})`
        ],
        datasets: [
          {
            data: [exemplary, onTrack, moderate, highRisk],
            backgroundColor: [
              "#a8f04b", // Lime
              "#38bdf8", // Blue
              "#ff9c27", // Orange
              "#f87171"  // Red
            ],
            borderColor: "#0c0d10",
            borderWidth: 3,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#cbd5e1",
              font: { size: 11, weight: "600" },
              padding: 12,
              usePointStyle: true,
              pointStyle: "circle"
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const count = context.raw;
                const pct = ((count / total) * 100).toFixed(1);
                return ` ${count} Students (${pct}% of cohort)`;
              }
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // CHART 3: Instructor Behavioral & Soft-Skills Radar Matrix
  // --------------------------------------------------------------------------
  function renderChartBehaviorRadar(students) {
    const ctx = document.getElementById("tChartBehaviorRadar")?.getContext("2d");
    if (!ctx) return;

    if (chartBehavior) chartBehavior.destroy();

    let sumFocus = 0;
    let sumComm = 0;
    let sumBeh = 0;
    let sumPart = 0;
    let sumIndep = 0;
    let sumAtt = 0;

    const count = students.length;

    students.forEach((s) => {
      // 1. Focus Score (0 - 100)
      const f = (s.attentive || "").toLowerCase();
      if (f.includes("high")) sumFocus += 95;
      else if (f.includes("mod")) sumFocus += 75;
      else if (f.includes("low")) sumFocus += 45;
      else sumFocus += 80;

      // 2. Verbal & Communication (0 - 100)
      const c = (s.comm_skill || "").toLowerCase();
      if (c.includes("except")) sumComm += 96;
      else if (c.includes("good")) sumComm += 82;
      else if (c.includes("dev")) sumComm += 65;
      else if (c.includes("need") || c.includes("supp")) sumComm += 45;
      else sumComm += 75;

      // 3. Discipline & Conduct (0 - 100)
      const b = (s.behavior || "").toLowerCase();
      if (b.includes("exemp")) sumBeh += 98;
      else if (b.includes("coop")) sumBeh += 85;
      else if (b.includes("guid") || b.includes("disrupt")) sumBeh += 50;
      else sumBeh += 80;

      // 4. Discussion Participation (0 - 100)
      const p = (s.participation || "").toLowerCase();
      if (p.includes("lead")) sumPart += 98;
      else if (p.includes("act")) sumPart += 85;
      else if (p.includes("pass")) sumPart += 50;
      else sumPart += 75;

      // 5. Learning Independence (0 - 100)
      const n = (s.academic_need || "").toLowerCase();
      if (n.includes("indep")) sumIndep += 95;
      else if (n.includes("mod")) sumIndep += 70;
      else if (n.includes("high") || n.includes("remed")) sumIndep += 40;
      else sumIndep += 75;

      // 6. Lecture Attendance (0 - 100)
      const att = parseFloat(s.attendance_pct ?? s.attendance ?? 85) || 85;
      sumAtt += Math.min(100, Math.max(0, att));
    });

    const avgFocus = count > 0 ? Math.round(sumFocus / count) : 0;
    const avgComm = count > 0 ? Math.round(sumComm / count) : 0;
    const avgBeh = count > 0 ? Math.round(sumBeh / count) : 0;
    const avgPart = count > 0 ? Math.round(sumPart / count) : 0;
    const avgIndep = count > 0 ? Math.round(sumIndep / count) : 0;
    const avgAtt = count > 0 ? Math.round(sumAtt / count) : 0;

    chartBehavior = new Chart(ctx, {
      type: "radar",
      data: {
        labels: [
          "🎯 Classroom Focus",
          "🗣️ Verbal Presentation",
          "🤝 Behavior & Discipline",
          "👥 Active Participation",
          "🛠️ Learning Independence",
          "📅 Lecture Attendance"
        ],
        datasets: [
          {
            label: "Cohort Behavioral Telemetry (%)",
            data: [avgFocus, avgComm, avgBeh, avgPart, avgIndep, avgAtt],
            backgroundColor: "rgba(168, 240, 75, 0.22)",
            borderColor: "#a8f04b",
            borderWidth: 2,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#a8f04b",
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Institutional Mastery Benchmark",
            data: [80, 80, 80, 80, 80, 80],
            backgroundColor: "transparent",
            borderColor: "rgba(148, 163, 184, 0.4)",
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.07)" },
            grid: { color: "rgba(255, 255, 255, 0.07)" },
            pointLabels: {
              color: "#cbd5e1",
              font: { size: 11, weight: "600" }
            },
            ticks: {
              backdropColor: "transparent",
              color: "#64748b",
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
            labels: { color: "#94a3b8", font: { size: 11, weight: "600" } }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // CHART 4: Coursework Pillar Mastery (Theory vs Quiz vs Assignment)
  // --------------------------------------------------------------------------
  function renderChartComponentMastery(students) {
    const ctx = document.getElementById("tChartComponentMastery")?.getContext("2d");
    if (!ctx) return;

    if (chartMastery) chartMastery.destroy();

    // Aggregate component marks across all courses in cohort
    let totalExamObt = 0, totalExamTot = 0;
    let totalQuizObt = 0, totalQuizTot = 0;
    let totalAssignObt = 0, totalAssignTot = 0;

    students.forEach((s) => {
      const courses = s.courses || [];
      courses.forEach((c) => {
        totalExamObt += Number(c.exam_obtained || (c.percentage ? c.percentage * 0.75 : 0));
        totalExamTot += Number(c.exam_total || 0);

        totalQuizObt += Number(c.quiz_obtained || 0);
        totalQuizTot += Number(c.quiz_total || 0);

        totalAssignObt += Number(c.assign_obtained || 0);
        totalAssignTot += Number(c.assign_total || 0);
      });
    });

    const hasData = totalExamTot > 0 || totalQuizTot > 0 || totalAssignTot > 0;
    const theoryPct = totalExamTot > 0 ? Math.round((totalExamObt / totalExamTot) * 100) : 0;
    const quizPct = totalQuizTot > 0 ? Math.round((totalQuizObt / totalQuizTot) * 100) : 0;
    const assignPct = totalAssignTot > 0 ? Math.round((totalAssignObt / totalAssignTot) * 100) : 0;

    if (masteryTheoryVal) masteryTheoryVal.innerText = hasData ? `${theoryPct}%` : "--";
    if (masteryQuizVal) masteryQuizVal.innerText = hasData ? `${quizPct}%` : "--";
    if (masteryAssignVal) masteryAssignVal.innerText = hasData ? `${assignPct}%` : "--";

    // Group component mastery by actual evaluated courses
    const courseMap = new Map();
    students.forEach((s) => {
      (s.courses || []).forEach((c) => {
        const name = (c.name || "Core Subject").trim();
        if (!courseMap.has(name)) {
          courseMap.set(name, {
            examObt: 0, examTot: 0,
            quizObt: 0, quizTot: 0,
            assignObt: 0, assignTot: 0
          });
        }
        const item = courseMap.get(name);
        item.examObt += Number(c.exam_obtained || (c.percentage ? c.percentage * 0.75 : 0));
        item.examTot += Number(c.exam_total || 0);
        item.quizObt += Number(c.quiz_obtained || 0);
        item.quizTot += Number(c.quiz_total || 0);
        item.assignObt += Number(c.assign_obtained || 0);
        item.assignTot += Number(c.assign_total || 0);
      });
    });

    let categories = [];
    let theoryData = [];
    let quizData = [];
    let assignData = [];

    if (courseMap.size > 0) {
      courseMap.forEach((val, cName) => {
        categories.push(cName);
        theoryData.push(val.examTot > 0 ? Math.round((val.examObt / val.examTot) * 100) : theoryPct);
        quizData.push(val.quizTot > 0 ? Math.round((val.quizObt / val.quizTot) * 100) : quizPct);
        assignData.push(val.assignTot > 0 ? Math.round((val.assignObt / val.assignTot) * 100) : assignPct);
      });
    } else {
      categories = ["Core Curriculum", "Applied Coursework", "Theoretical Concepts", "Electives / Labs"];
      theoryData = hasData ? [theoryPct, theoryPct, theoryPct, theoryPct] : [0, 0, 0, 0];
      quizData = hasData ? [quizPct, quizPct, quizPct, quizPct] : [0, 0, 0, 0];
      assignData = hasData ? [assignPct, assignPct, assignPct, assignPct] : [0, 0, 0, 0];
    }

    chartMastery = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categories,
        datasets: [
          {
            label: "Theory Exams (%)",
            data: theoryData,
            backgroundColor: "#a8f04b",
            borderRadius: 4
          },
          {
            label: "Quizzes & Midterms (%)",
            data: quizData,
            backgroundColor: "#38bdf8",
            borderRadius: 4
          },
          {
            label: "Assignments & Labs (%)",
            data: assignData,
            backgroundColor: "#ff9c27",
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#94a3b8", font: { size: 11 } }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#94a3b8", font: { size: 11 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#94a3b8",
              font: { size: 11 },
              callback: (v) => v + "%"
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // MASTER LEDGER TABLE RENDERING & CRUD ACTIONS
  // --------------------------------------------------------------------------
  let pendingDeleteStudentId = null;

  function renderMasterLedgerTable(students) {
    if (!ledgerTbody) return;
    ledgerTbody.innerHTML = "";

    if (ledgerCountBadge) {
      ledgerCountBadge.innerText = `${students.length} Student(s) Recorded`;
    }

    if (students.length === 0) {
      ledgerTbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 48px 16px;">
            <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
              No Class Evaluations Recorded Yet
            </div>
            <div style="font-size: 13px; color: var(--text-muted); max-width: 460px; margin: 0 auto 16px;">
              Run student diagnostic forecasts from the Teacher Suite to unlock real-time cohort analytics, mastery charts, and pedagogical telemetry.
            </div>
            <a href="teacher-prediction.html" class="btn btn-primary btn-sm">
              <span>⚡ Run AI</span>
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
        <td style="font-weight: 600; color: #38bdf8;">${s.coursework_pct ? parseFloat(s.coursework_pct).toFixed(1) + "%" : "--"}</td>
        <td style="font-weight: 800; color: var(--color-lime);">${displayScore}</td>
        <td><span class="badge ${s.status_color || 'badge-success'}">${s.status_badge || 'On Track'}</span></td>
        <td>
          <div style="font-size: 11.5px; display: flex; gap: 4px; flex-wrap: wrap;">
            <span class="badge badge-neutral" title="Focus">🎯 ${s.attentive || 'High'}</span>
            <span class="badge badge-neutral" title="Communication">🗣️ ${s.comm_skill || 'Good'}</span>
            <span class="badge badge-neutral" title="Support Need">🛠️ ${s.academic_need || 'Independent'}</span>
          </div>
        </td>
        <td style="color: #facc15; font-weight: 700;">${Number(s.rating || 5.0).toFixed(1)} ⭐</td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="action-btn-group">
            <button type="button" class="table-icon-btn btn-view btn-view-student" data-id="${s.student_id}" title="View Full Diagnostic Dossier">
              👁️ View
            </button>
            <button type="button" class="table-icon-btn btn-edit btn-edit-student" data-id="${s.student_id}" title="Edit Student Evaluation">
              ✏️ Edit
            </button>
            <a href="teacher-prediction.html?student_id=${encodeURIComponent(s.student_id)}&name=${encodeURIComponent(s.student_name)}&stage=${encodeURIComponent(s.stage)}" 
               class="table-icon-btn btn-eval" title="Run AI on student in Teacher Suite">
              ⚡ Run AI
            </a>
            <button type="button" class="table-icon-btn btn-delete btn-delete-student" data-id="${s.student_id}" title="Delete Student Record">
              🗑️
            </button>
          </div>
        </td>
      `;
      ledgerTbody.appendChild(tr);
    });

    attachLedgerCRUDListeners();
  }

  // --------------------------------------------------------------------------
  // LEDGER CRUD EVENT HANDLERS
  // --------------------------------------------------------------------------
  const modalViewCohort = document.getElementById("modal-view-cohort-student");
  const modalEditCohort = document.getElementById("modal-edit-cohort-student");
  const modalDeleteCohort = document.getElementById("modal-delete-cohort-student");
  const formEditCohort = document.getElementById("edit-cohort-student-form");

  function attachLedgerCRUDListeners() {
    // 1. View Diagnostic Triggers
    document.querySelectorAll(".btn-view-student").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openViewModal(id);
      });
    });

    // 2. Edit Student Triggers
    document.querySelectorAll(".btn-edit-student").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openEditModal(id);
      });
    });

    // 3. Delete Student Triggers
    document.querySelectorAll(".btn-delete-student").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openDeleteModal(id);
      });
    });
  }

  // View Modal Handler (Read)
  function openViewModal(studentId) {
    if (!modalViewCohort) return;
    const s = cohortStudents.find((x) => String(x.student_id) === String(studentId));
    if (!s) return;

    const isUni = (s.stage || "").toLowerCase() === "university";
    const displayScore = isUni
      ? (typeof s.predicted_score === "number" ? s.predicted_score.toFixed(2) : s.predicted_score) + " CGPA"
      : (typeof s.predicted_score === "number" ? s.predicted_score.toFixed(1) : s.predicted_score) + "%";

    const nameEl = document.getElementById("view-modal-student-name");
    const metaEl = document.getElementById("view-modal-meta");
    const scoreEl = document.getElementById("view-diag-score");
    const gradeEl = document.getElementById("view-diag-grade");
    const cwEl = document.getElementById("view-diag-coursework");
    const focusEl = document.getElementById("view-diag-focus");
    const commEl = document.getElementById("view-diag-comm");
    const behEl = document.getElementById("view-diag-behavior");
    const needEl = document.getElementById("view-diag-need");
    const attEl = document.getElementById("view-diag-att");
    const ratingEl = document.getElementById("view-diag-rating");
    const stratEl = document.getElementById("view-diag-strategy");
    const coursesTbody = document.getElementById("view-diag-courses-tbody");
    const btnEdit = document.getElementById("btn-view-to-edit");
    const btnPredict = document.getElementById("btn-view-to-predict");

    if (nameEl) nameEl.innerText = `${s.student_name} (${s.student_id})`;
    if (metaEl) metaEl.innerText = `Roll / ID: ${s.student_id} • Academic Stage: ${(s.stage || "Uni").toUpperCase()} • Status: ${s.status_badge || "On Track"}`;
    if (scoreEl) scoreEl.innerText = displayScore;
    if (gradeEl) gradeEl.innerText = s.predicted_grade || "Grade A";
    if (cwEl) cwEl.innerText = s.coursework_pct ? `${parseFloat(s.coursework_pct).toFixed(1)}%` : "--";
    if (focusEl) focusEl.innerText = s.attentive || "High";
    if (commEl) commEl.innerText = s.comm_skill || "Good";
    if (behEl) behEl.innerText = s.behavior || "Exemplary";
    if (needEl) needEl.innerText = s.academic_need || "Independent";
    if (attEl) attEl.innerText = `${s.attendance_pct || 85}%`;
    if (ratingEl) ratingEl.innerText = `${Number(s.rating || 5.0).toFixed(1)} ⭐`;
    if (stratEl) stratEl.innerText = s.notes || s.strategy || "Student displays consistent academic performance. Maintain regular continuous revision.";

    // Render evaluated courses list
    if (coursesTbody) {
      coursesTbody.innerHTML = "";
      const courses = s.courses || [];
      if (courses.length === 0) {
        coursesTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">No individual coursework modules recorded.</td></tr>`;
      } else {
        courses.forEach((c) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td style="font-weight: 700; color: #ffffff;">${c.name || "Subject Module"}</td>
            <td>${c.exam_obtained || 0} / ${c.exam_total || 0}</td>
            <td>${c.quiz_obtained || 0} / ${c.quiz_total || 0}</td>
            <td>${c.assign_obtained || 0} / ${c.assign_total || 0}</td>
            <td style="text-align: right; font-weight: 700; color: var(--color-lime);">${Number(c.percentage || 0).toFixed(1)}%</td>
          `;
          coursesTbody.appendChild(row);
        });
      }
    }

    if (btnEdit) {
      btnEdit.onclick = () => {
        modalViewCohort.classList.remove("active");
        openEditModal(s.student_id);
      };
    }
    if (btnPredict) {
      btnPredict.href = `teacher-prediction.html?student_id=${encodeURIComponent(s.student_id)}&name=${encodeURIComponent(s.student_name)}&stage=${encodeURIComponent(s.stage)}`;
    }

    modalViewCohort.classList.add("active");
  }

  // Edit Modal Handler (Update)
  function openEditModal(studentId) {
    if (!modalEditCohort) return;
    const s = cohortStudents.find((x) => String(x.student_id) === String(studentId));
    if (!s) return;

    document.getElementById("edit-original-id").value = s.student_id;
    document.getElementById("edit-student-id").value = s.student_id;
    document.getElementById("edit-student-name").value = s.student_name || "";
    document.getElementById("edit-student-stage").value = (s.stage || "university").toLowerCase();
    document.getElementById("edit-attendance").value = s.attendance_pct || 85;
    document.getElementById("edit-attentive").value = s.attentive || "High";
    document.getElementById("edit-comm-skill").value = s.comm_skill || "Good";
    document.getElementById("edit-behavior").value = s.behavior || "Exemplary";
    document.getElementById("edit-academic-need").value = s.academic_need || "Independent";
    document.getElementById("edit-rating").value = s.rating ? Number(s.rating).toFixed(1) : "5.0";
    document.getElementById("edit-predicted-score").value = s.predicted_score !== undefined ? s.predicted_score : "";
    document.getElementById("edit-strategy").value = s.notes || s.strategy || "";

    modalEditCohort.classList.add("active");
  }

  // Save Edit Handler
  if (formEditCohort) {
    formEditCohort.addEventListener("submit", (e) => {
      e.preventDefault();
      const origId = document.getElementById("edit-original-id").value;
      const idx = cohortStudents.findIndex((x) => String(x.student_id) === String(origId));
      if (idx === -1) return;

      const s = cohortStudents[idx];
      const newName = document.getElementById("edit-student-name").value.trim();
      const newStage = document.getElementById("edit-student-stage").value;
      const newAtt = parseFloat(document.getElementById("edit-attendance").value) || 85;
      const newFocus = document.getElementById("edit-attentive").value;
      const newComm = document.getElementById("edit-comm-skill").value;
      const newBeh = document.getElementById("edit-behavior").value;
      const newNeed = document.getElementById("edit-academic-need").value;
      const newRating = parseFloat(document.getElementById("edit-rating").value) || 5.0;
      let newScore = parseFloat(document.getElementById("edit-predicted-score").value);
      const newNotes = document.getElementById("edit-strategy").value.trim();

      // Recalibrate score if empty
      if (isNaN(newScore)) {
        if (newStage === "university") {
          newScore = Number((3.0 + (newRating / 5.0) * 0.9).toFixed(2));
        } else {
          newScore = Number((70.0 + (newRating * 3.5)).toFixed(1));
        }
      }

      // Re-determine Grade & Risk Badge
      let newGrade = "Grade A";
      let newStatusBadge = "On Track";
      let newStatusColor = "badge-success";

      if (newStage === "university") {
        if (newScore >= 3.67) { newGrade = "Grade A+ (Exemplary)"; newStatusBadge = "Exemplary Distinction"; newStatusColor = "badge-success"; }
        else if (newScore >= 3.33) { newGrade = "Grade A (High Honors)"; newStatusBadge = "On Track"; newStatusColor = "badge-success"; }
        else if (newScore >= 3.00) { newGrade = "Grade B+ (Proficient)"; newStatusBadge = "On Track"; newStatusColor = "badge-info"; }
        else if (newScore >= 2.50) { newGrade = "Grade B (Capable)"; newStatusBadge = "Moderate Attention"; newStatusColor = "badge-warning"; }
        else if (newScore >= 2.00) { newGrade = "Grade C (Developing)"; newStatusBadge = "Remedial Coaching"; newStatusColor = "badge-warning"; }
        else { newGrade = "Grade F (At Risk)"; newStatusBadge = "Critical Academic Risk"; newStatusColor = "badge-danger"; }
      } else {
        if (newScore >= 85) { newGrade = "Grade A-1 (Outstanding)"; newStatusBadge = "Exemplary Distinction"; newStatusColor = "badge-success"; }
        else if (newScore >= 75) { newGrade = "Grade A (Excellent)"; newStatusBadge = "On Track"; newStatusColor = "badge-success"; }
        else if (newScore >= 65) { newGrade = "Grade B (Good)"; newStatusBadge = "On Track"; newStatusColor = "badge-info"; }
        else if (newScore >= 50) { newGrade = "Grade C (Satisfactory)"; newStatusBadge = "Moderate Attention"; newStatusColor = "badge-warning"; }
        else { newGrade = "Grade F (At Risk)"; newStatusBadge = "Critical Intervention Needed"; newStatusColor = "badge-danger"; }
      }

      // Apply updates
      s.student_name = newName;
      s.stage = newStage;
      s.attendance_pct = newAtt;
      s.attentive = newFocus;
      s.comm_skill = newComm;
      s.behavior = newBeh;
      s.academic_need = newNeed;
      s.rating = newRating;
      s.predicted_score = newScore;
      s.predicted_grade = newGrade;
      s.status_badge = newStatusBadge;
      s.status_color = newStatusColor;
      s.notes = newNotes;
      s.timestamp = new Date().toISOString();

      // Persist to teacher's isolated localStorage
      const teacher = getTeacherIdentity();
      localStorage.setItem(teacher.storageKey, JSON.stringify(cohortStudents));

      modalEditCohort.classList.remove("active");
      updateAnalyticsView();
      showToast(`Student '${newName}' evaluation updated successfully!`, "success");
    });
  }

  // Delete Modal Handler (Delete)
  function openDeleteModal(studentId) {
    if (!modalDeleteCohort) return;
    const s = cohortStudents.find((x) => String(x.student_id) === String(studentId));
    if (!s) return;

    pendingDeleteStudentId = s.student_id;
    const targetNameEl = document.getElementById("delete-target-name");
    const targetIdEl = document.getElementById("delete-target-id");
    if (targetNameEl) targetNameEl.innerText = s.student_name || "Student";
    if (targetIdEl) targetIdEl.innerText = `Roll / ID: ${s.student_id} • Stage: ${(s.stage || "").toUpperCase()}`;

    modalDeleteCohort.classList.add("active");
  }

  // Confirm Delete
  const btnConfirmDelete = document.getElementById("btn-confirm-delete-student");
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", () => {
      if (!pendingDeleteStudentId) return;

      const deletedStudent = cohortStudents.find((x) => String(x.student_id) === String(pendingDeleteStudentId));
      cohortStudents = cohortStudents.filter((x) => String(x.student_id) !== String(pendingDeleteStudentId));

      const teacher = getTeacherIdentity();
      localStorage.setItem(teacher.storageKey, JSON.stringify(cohortStudents));

      modalDeleteCohort.classList.remove("active");
      pendingDeleteStudentId = null;

      updateAnalyticsView();
      showToast(`Record for '${deletedStudent?.student_name || "Student"}' deleted successfully!`, "success");
    });
  }

  // Close triggers for View, Edit, Delete modals
  document.getElementById("btn-close-view-modal")?.addEventListener("click", () => modalViewCohort?.classList.remove("active"));
  document.getElementById("btn-close-view-modal-bottom")?.addEventListener("click", () => modalViewCohort?.classList.remove("active"));
  document.getElementById("btn-close-edit-modal")?.addEventListener("click", () => modalEditCohort?.classList.remove("active"));
  document.getElementById("btn-cancel-edit-modal")?.addEventListener("click", () => modalEditCohort?.classList.remove("active"));
  document.getElementById("btn-close-delete-modal")?.addEventListener("click", () => modalDeleteCohort?.classList.remove("active"));
  document.getElementById("btn-cancel-delete-modal")?.addEventListener("click", () => modalDeleteCohort?.classList.remove("active"));

  // --------------------------------------------------------------------------
  // FULLSCREEN THEATER LOGIC
  // --------------------------------------------------------------------------
  function openFullscreenChart(chartType, title, subtitle) {
    if (!fsModal || !fsCanvas) return;
    if (fsChartInstance) fsChartInstance.destroy();

    currentActiveChartType = chartType;
    if (fsTitle) fsTitle.innerText = title;
    if (fsSubtitle) fsSubtitle.innerText = subtitle;

    fsModal.classList.add("active");

    const ctx = fsCanvas.getContext("2d");
    const filtered = getFilteredStudents();

    if (chartType === "scores") {
      const labels = filtered.map((s) => s.student_name || s.student_id);
      const predScores = filtered.map((s) => Number(normalizeToPercentage(s).toFixed(1)));
      const courseScores = filtered.map((s) => Number(parseFloat(s.coursework_pct || 80).toFixed(1)));

      fsChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            { label: "AI Projected Score %", data: predScores, backgroundColor: "#a8f04b" },
            { label: "Coursework Continuous Avg %", data: courseScores, backgroundColor: "#38bdf8" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#ffffff", font: { size: 13 } } } },
          scales: {
            x: { ticks: { color: "#cbd5e1" } },
            y: { min: 0, max: 100, ticks: { color: "#cbd5e1", callback: (v) => v + "%" } }
          }
        }
      });
    } else if (chartType === "risk") {
      let exemplary = 0, onTrack = 0, moderate = 0, highRisk = 0;
      filtered.forEach((s) => {
        const pct = normalizeToPercentage(s);
        if (pct >= 80) exemplary++;
        else if (pct >= 70) onTrack++;
        else if (pct >= 55) moderate++;
        else highRisk++;
      });

      fsChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Exemplary / Honors", "On Track / Proficient", "Moderate Attention", "Critical Risk / Remedial"],
          datasets: [{ data: [exemplary, onTrack, moderate, highRisk], backgroundColor: ["#a8f04b", "#10b981", "#fb923c", "#f43f5e"] }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#ffffff", font: { size: 14 } } } }
        }
      });
    } else if (chartType === "radar") {
      renderChartBehaviorRadar(filtered);
      // Clone behavior config into theater
      fsChartInstance = new Chart(ctx, chartBehavior.config);
    } else if (chartType === "mastery") {
      renderChartComponentMastery(filtered);
      fsChartInstance = new Chart(ctx, chartMastery.config);
    }
  }

  // Fullscreen Open Triggers
  document.getElementById("btn-fs-scores")?.addEventListener("click", () => {
    openFullscreenChart("scores", "Student Academic Performance & Coursework Distribution", "High-resolution comparative telemetry");
  });
  document.getElementById("btn-fs-risk")?.addEventListener("click", () => {
    openFullscreenChart("risk", "Cohort Grade Standing & Risk Stratification", "High-resolution academic tier breakdown");
  });
  document.getElementById("btn-fs-radar")?.addEventListener("click", () => {
    openFullscreenChart("radar", "Cohort Behavioral & Soft-Skills Radar Matrix", "High-resolution soft skills evaluation");
  });
  document.getElementById("btn-fs-mastery")?.addEventListener("click", () => {
    openFullscreenChart("mastery", "Coursework Pillar Mastery: Theory vs Quizzes vs Assignments", "High-resolution coursework assessment audit");
  });

  // Fullscreen Close Triggers
  if (btnCloseFs) btnCloseFs.addEventListener("click", () => fsModal?.classList.remove("active"));
  if (btnCloseFsBtn) btnCloseFsBtn.addEventListener("click", () => fsModal?.classList.remove("active"));

  // Download High-Res PNG from Theater
  if (btnFsDownloadPng) {
    btnFsDownloadPng.addEventListener("click", () => {
      if (!fsChartInstance) return;
      const url = fsChartInstance.toBase64Image();
      const a = document.createElement("a");
      a.href = url;
      a.download = `EduMetrics_Cohort_${currentActiveChartType || "Chart"}_${Date.now()}.png`;
      a.click();
      showToast("High-resolution chart downloaded!", "success");
    });
  }

  // Quick PNG Save Triggers on Individual Cards
  document.getElementById("btn-png-scores")?.addEventListener("click", () => {
    if (chartScores) {
      const a = document.createElement("a");
      a.href = chartScores.toBase64Image();
      a.download = `Cohort_Scores_${Date.now()}.png`;
      a.click();
      showToast("Saved Scores chart as PNG!", "success");
    }
  });
  document.getElementById("btn-png-risk")?.addEventListener("click", () => {
    if (chartRisk) {
      const a = document.createElement("a");
      a.href = chartRisk.toBase64Image();
      a.download = `Cohort_Risk_${Date.now()}.png`;
      a.click();
      showToast("Saved Risk chart as PNG!", "success");
    }
  });
  document.getElementById("btn-png-radar")?.addEventListener("click", () => {
    if (chartBehavior) {
      const a = document.createElement("a");
      a.href = chartBehavior.toBase64Image();
      a.download = `Cohort_Behavior_${Date.now()}.png`;
      a.click();
      showToast("Saved Behavior chart as PNG!", "success");
    }
  });
  document.getElementById("btn-png-mastery")?.addEventListener("click", () => {
    if (chartMastery) {
      const a = document.createElement("a");
      a.href = chartMastery.toBase64Image();
      a.download = `Cohort_Mastery_${Date.now()}.png`;
      a.click();
      showToast("Saved Mastery chart as PNG!", "success");
    }
  });

  // Filter Listeners (Stage & Risk)
  if (filterStage) filterStage.addEventListener("change", updateAnalyticsView);
  if (filterRisk) filterRisk.addEventListener("change", updateAnalyticsView);

  // Settings Modal & Profile Tabs
  const profileModal = document.getElementById("profile-settings-modal");
  const btnCloseProfile = document.getElementById("btn-close-profile-modal");
  const railProfileBtn = document.getElementById("rail-profile-btn");
  const modalTabBtns = document.querySelectorAll(".modal-tab-btn");
  const modalTabContents = document.querySelectorAll(".profile-tab-content");
  const logoutBtn = document.getElementById("logout-btn");

  if (railProfileBtn && profileModal) {
    railProfileBtn.addEventListener("click", () => {
      profileModal.classList.add("active");
    });
  }
  if (btnCloseProfile && profileModal) {
    btnCloseProfile.addEventListener("click", () => profileModal.classList.remove("active"));
  }

  modalTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      modalTabBtns.forEach((b) => b.classList.remove("active"));
      modalTabContents.forEach((c) => { c.classList.remove("active"); c.style.display = "none"; });
      btn.classList.add("active");
      const targetEl = document.getElementById(target);
      if (targetEl) {
        targetEl.classList.add("active");
        targetEl.style.display = "block";
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // Initial Boot
  await loadCohortData();
});
