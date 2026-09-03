/**
 * Teacher & Instructor Academic Suite (teacher-prediction.js)
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
    window.location.href = "prediction.html";
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

  // Teacher State for the CURRENT student being evaluated
  let teacherSubjectsStore = [];
  let editingSubjectId = null;

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

  function showErrorBanner(msg) {
    const errorBanner = document.getElementById("error-banner");
    const errorBannerMessage = document.getElementById("error-banner-message");
    if (errorBanner && errorBannerMessage) {
      errorBannerMessage.innerText = msg;
      errorBanner.classList.add("active");
      errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideErrorBanner() {
    const errorBanner = document.getElementById("error-banner");
    if (errorBanner) errorBanner.classList.remove("active");
  }

  // Sync Teacher Profile Identity
  function syncTeacherProfile() {
    const teacherNameEl = document.getElementById("teacher-name");
    const teacherIdCodeEl = document.getElementById("teacher-id-code");
    const name = userMeta.full_name || "Instructor";
    const idCode = userMeta.student_id || userMeta.id_code || "TCH-2026-001";
    if (teacherNameEl) teacherNameEl.innerText = name;
    if (teacherIdCodeEl) teacherIdCodeEl.innerText = idCode;
  }
  syncTeacherProfile();

  // ============================================================================
  // SECTION 2: DYNAMIC STAGE-SPECIFIC ACADEMIC CONTEXT FIELDS
  // ============================================================================
  const stageSelect = document.getElementById("t_student_stage");
  const stageContextContainer = document.getElementById("t-stage-context-container");

  function renderStageContextFields(stage) {
    if (!stageContextContainer) return;

    if (stage === "university") {
      stageContextContainer.innerHTML = `
        <div class="form-grid-4col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="t_uni_semester">Current Semester</label>
            <select id="t_uni_semester" class="form-select">
              <option value="1">Semester 1 (Freshman)</option>
              <option value="2">Semester 2 (Freshman)</option>
              <option value="3">Semester 3 (Sophomore)</option>
              <option value="4" selected>Semester 4 (Sophomore)</option>
              <option value="5">Semester 5 (Junior)</option>
              <option value="6">Semester 6 (Junior)</option>
              <option value="7">Semester 7 (Senior)</option>
              <option value="8">Semester 8 (Senior)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_uni_major">Degree Program / Major</label>
            <input type="text" id="t_uni_major" class="form-input" placeholder="e.g. Computer Science & AI">
          </div>
          <div class="form-group">
            <label class="form-label" for="t_uni_prev_cgpa">Prior Baseline CGPA (0.0 - 4.0)</label>
            <input type="number" step="0.01" min="0" max="4.0" id="t_uni_prev_cgpa" class="form-input" placeholder="e.g. 3.45">
          </div>
          <div class="form-group">
            <label class="form-label" for="t_uni_credits">Semester Credit Hours</label>
            <input type="number" min="3" max="24" id="t_uni_credits" class="form-input" placeholder="e.g. 16">
          </div>
        </div>
      `;
    } else if (stage === "intermediate") {
      stageContextContainer.innerHTML = `
        <div class="form-grid-4col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="t_inter_group">Academic Stream</label>
            <select id="t_inter_group" class="form-select">
              <option value="Pre-Engineering" selected>Pre-Engineering</option>
              <option value="Pre-Medical">Pre-Medical</option>
              <option value="ICS">ICS (Computer Science)</option>
              <option value="Commerce">Commerce / I.Com</option>
              <option value="Humanities">Humanities / Arts</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_inter_part">HSSC Part / Year</label>
            <select id="t_inter_part" class="form-select">
              <option value="11" selected>Part-I (11th Grade / First Year)</option>
              <option value="12">Part-II (12th Grade / Second Year)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_inter_board">Education Board</label>
            <select id="t_inter_board" class="form-select">
              <option value="Federal" selected>Federal (FBISE Islamabad)</option>
              <option value="Lahore">BISE Lahore</option>
              <option value="Karachi">BIEK Karachi</option>
              <option value="Rawalpindi">BISE Rawalpindi</option>
              <option value="Peshawar">BISE Peshawar</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_inter_ssc_marks">Matric (SSC) Marks (out of 1100)</label>
            <input type="number" min="0" max="1100" id="t_inter_ssc_marks" class="form-input" placeholder="e.g. 920">
          </div>
        </div>
      `;
    } else if (stage === "matric") {
      stageContextContainer.innerHTML = `
        <div class="form-grid-4col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="t_matric_group">Academic Group</label>
            <select id="t_matric_group" class="form-select">
              <option value="Science with Bio" selected>Science (Biology Group)</option>
              <option value="Science with CS">Science (Computer Science Group)</option>
              <option value="General Arts">General Arts / Humanities</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_matric_class">Class Standing</label>
            <select id="t_matric_class" class="form-select">
              <option value="9">9th Class (SSC Part-I)</option>
              <option value="10" selected>10th Class (SSC Part-II)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_matric_board">Education Board</label>
            <select id="t_matric_board" class="form-select">
              <option value="Federal" selected>Federal (FBISE Islamabad)</option>
              <option value="Lahore">BISE Lahore</option>
              <option value="Karachi">BSEK Karachi</option>
              <option value="Rawalpindi">BISE Rawalpindi</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_matric_ssc1_marks">9th Marks Baseline (out of 550)</label>
            <input type="number" min="0" max="550" id="t_matric_ssc1_marks" class="form-input" placeholder="e.g. 450">
          </div>
        </div>
      `;
    } else if (stage === "secondary") {
      stageContextContainer.innerHTML = `
        <div class="form-grid-3col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="t_sec_current_class">Current Class Standing</label>
            <select id="t_sec_current_class" class="form-select">
              <option value="Class 5">Class 5 (Middle Entry)</option>
              <option value="Class 6">Class 6 (Middle Standard)</option>
              <option value="Class 7" selected>Class 7 (Secondary Foundation)</option>
              <option value="Class 8">Class 8 (Pre-Matric Prep)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_sec_target_class">Target Next Class</label>
            <select id="t_sec_target_class" class="form-select">
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8" selected>Class 8</option>
              <option value="Class 9">Class 9 (SSC-I Matric)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_sec_prev_pct">Prior Annual Examination %</label>
            <input type="number" min="0" max="100" id="t_sec_prev_pct" class="form-input" placeholder="e.g. 82">
          </div>
        </div>
      `;
    } else if (stage === "primary") {
      stageContextContainer.innerHTML = `
        <div class="form-grid-3col" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label" for="t_prim_grade">Current Primary Grade</label>
            <select id="t_prim_grade" class="form-select">
              <option value="Class 1">Class 1</option>
              <option value="Class 2">Class 2</option>
              <option value="Class 3">Class 3</option>
              <option value="Class 4" selected>Class 4</option>
              <option value="Class 5">Class 5 (Graduating Primary)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_prim_target">Target Next Grade</label>
            <select id="t_prim_target" class="form-select">
              <option value="Class 2">Class 2</option>
              <option value="Class 3">Class 3</option>
              <option value="Class 4">Class 4</option>
              <option value="Class 5" selected>Class 5</option>
              <option value="Class 6">Class 6 (Middle School)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="t_prim_mastery">Foundational Literacy & Numeracy</label>
            <select id="t_prim_mastery" class="form-select">
              <option value="Exceeding" selected>Exceeding Expectations (Advanced)</option>
              <option value="Meeting">Meeting Core Competencies (Proficient)</option>
              <option value="Emerging">Emerging / Needs Learning Support</option>
            </select>
          </div>
        </div>
      `;
    }
  }

  if (stageSelect) {
    stageSelect.addEventListener("change", (e) => {
      renderStageContextFields(e.target.value);
    });
    renderStageContextFields(stageSelect.value);
  }

  // Pre-populate if query params exist (e.g. redirected from Dashboard "⚡ Evaluate")
  const urlParams = new URLSearchParams(window.location.search);
  const paramStudentId = urlParams.get("student_id");
  const paramName = urlParams.get("name");
  const paramStage = urlParams.get("stage");

  if (paramStudentId) {
    const sIdInput = document.getElementById("t_student_id");
    if (sIdInput) sIdInput.value = paramStudentId;
  }
  if (paramName) {
    const sNameInput = document.getElementById("t_student_name");
    if (sNameInput) sNameInput.value = paramName;
  }
  if (paramStage && stageSelect) {
    stageSelect.value = paramStage.toLowerCase();
    renderStageContextFields(stageSelect.value);
  }

  // ============================================================================
  // SECTION 3: ADD COURSES WITH INTEGRATED EXAM + QUIZ + ASSIGNMENT
  // ============================================================================
  const tSubjectsTableBody = document.getElementById("t-subjects-table-body");
  const tKpiTotalSubjects = document.getElementById("t-kpi-total-subjects");
  const tKpiTotalMarks = document.getElementById("t-kpi-total-marks");
  const tKpiAggregatePct = document.getElementById("t-kpi-aggregate-pct");
  const tKpiCalcGpa = document.getElementById("t-kpi-calc-gpa");
  const btnTAddSubject = document.getElementById("btn-t-add-subject");
  const teacherSubjectModal = document.getElementById("teacher-subject-modal");
  const btnCloseTSubjectModal = document.getElementById("btn-close-t-subject-modal");
  const btnCancelTSubj = document.getElementById("btn-cancel-t-subj");
  const tSubjectForm = document.getElementById("t-subject-form");
  const tSubjectModalTitle = document.getElementById("t-subject-modal-title");

  // Live Course Composite Preview inside Modal
  const inputExamObt = document.getElementById("t-subj-exam-obt");
  const inputExamTot = document.getElementById("t-subj-exam-tot");
  const inputQuizObt = document.getElementById("t-subj-quiz-obt");
  const inputQuizTot = document.getElementById("t-subj-quiz-tot");
  const inputAssignObt = document.getElementById("t-subj-assign-obt");
  const inputAssignTot = document.getElementById("t-subj-assign-tot");
  const previewText = document.getElementById("t-modal-preview-text");

  function updateModalCoursePreview() {
    if (!previewText) return;
    const eObt = parseFloat(inputExamObt?.value || 0);
    const eTot = parseFloat(inputExamTot?.value || 0);
    const qObt = parseFloat(inputQuizObt?.value || 0);
    const qTot = parseFloat(inputQuizTot?.value || 0);
    const aObt = parseFloat(inputAssignObt?.value || 0);
    const aTot = parseFloat(inputAssignTot?.value || 0);

    const totalObtained = eObt + qObt + aObt;
    const totalPossible = eTot + qTot + aTot;
    const pct = totalPossible > 0 ? ((totalObtained / totalPossible) * 100).toFixed(1) : "0.0";

    let grade = "A+";
    if (pct < 50) grade = "F (At Risk)";
    else if (pct < 60) grade = "D (Needs Support)";
    else if (pct < 70) grade = "C (Satisfactory)";
    else if (pct < 80) grade = "B (Good)";
    else if (pct < 90) grade = "A (Exemplary)";

    previewText.innerText = `${totalObtained.toFixed(1)} / ${totalPossible.toFixed(1)} (${pct}% — Grade ${grade})`;
  }

  [inputExamObt, inputExamTot, inputQuizObt, inputQuizTot, inputAssignObt, inputAssignTot].forEach((el) => {
    if (el) el.addEventListener("input", updateModalCoursePreview);
  });

  function renderTeacherSubjectsTable() {
    if (!tSubjectsTableBody) return;
    tSubjectsTableBody.innerHTML = "";

    if (teacherSubjectsStore.length === 0) {
      tSubjectsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: var(--space-5);">
            No courses logged for this student yet. Click <strong>➕ Add Course to Student</strong> to input coursework assessments.
          </td>
        </tr>
      `;
      if (tKpiTotalSubjects) tKpiTotalSubjects.innerText = "0";
      if (tKpiTotalMarks) tKpiTotalMarks.innerText = "0 / 0";
      if (tKpiAggregatePct) tKpiAggregatePct.innerText = "0.0%";
      if (tKpiCalcGpa) tKpiCalcGpa.innerText = "0.00 GPA";
      return;
    }

    let sumObtained = 0;
    let sumTotal = 0;

    teacherSubjectsStore.forEach((sub, idx) => {
      sumObtained += Number(sub.obtained);
      sumTotal += Number(sub.total);
      const pct = sub.total > 0 ? ((sub.obtained / sub.total) * 100).toFixed(1) : "0.0";
      
      let grade = "A+";
      if (pct < 50) grade = "F";
      else if (pct < 60) grade = "D";
      else if (pct < 70) grade = "C";
      else if (pct < 80) grade = "B";
      else if (pct < 90) grade = "A";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600; color: #ffffff;">
          ${sub.name}
          ${sub.notes ? `<div style="font-size:11px; color:var(--text-muted);">${sub.notes}</div>` : ''}
        </td>
        <td><span class="badge ${sub.category === 'Lab' ? 'badge-primary' : 'badge-neutral'}">${sub.category}</span></td>
        <td style="font-family: var(--font-family-mono);">${sub.exam_obtained} / ${sub.exam_total}</td>
        <td style="font-family: var(--font-family-mono);">${sub.quiz_obtained} / ${sub.quiz_total}</td>
        <td style="font-family: var(--font-family-mono);">${sub.assign_obtained} / ${sub.assign_total}</td>
        <td style="font-weight: 700; color: #ffffff;">${sub.obtained} / ${sub.total}</td>
        <td style="font-weight: 700; color: var(--color-lime);">${pct}%</td>
        <td><span class="badge ${grade === 'F' ? 'badge-danger' : 'badge-success'}">${grade}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <div class="action-btn-group">
            <button type="button" class="table-icon-btn btn-edit btn-edit-t-sub" data-idx="${idx}" title="Edit Course">✏️ Edit</button>
            <button type="button" class="table-icon-btn btn-delete btn-delete-t-sub" data-idx="${idx}" title="Delete Course">🗑️</button>
          </div>
        </td>
      `;
      tSubjectsTableBody.appendChild(tr);
    });

    const aggPct = sumTotal > 0 ? ((sumObtained / sumTotal) * 100).toFixed(1) : "0.0";
    const calcGpa = ((parseFloat(aggPct) / 100) * 4.0).toFixed(2);

    if (tKpiTotalSubjects) tKpiTotalSubjects.innerText = teacherSubjectsStore.length;
    if (tKpiTotalMarks) tKpiTotalMarks.innerText = `${sumObtained.toFixed(0)} / ${sumTotal.toFixed(0)}`;
    if (tKpiAggregatePct) tKpiAggregatePct.innerText = `${aggPct}%`;
    if (tKpiCalcGpa) tKpiCalcGpa.innerText = `${calcGpa} GPA`;

    // Attach edit and delete listeners
    document.querySelectorAll(".btn-delete-t-sub").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
        const removed = teacherSubjectsStore.splice(idx, 1);
        renderTeacherSubjectsTable();
        showToast(`Removed course '${removed[0]?.name}'.`, "info");
      });
    });

    document.querySelectorAll(".btn-edit-t-sub").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
        const course = teacherSubjectsStore[idx];
        if (!course) return;

        editingSubjectId = course.id;
        if (tSubjectModalTitle) tSubjectModalTitle.innerText = "✏️ Edit Course Assessment";
        document.getElementById("t-subj-name").value = course.name;
        document.getElementById("t-subj-category").value = course.category;
        document.getElementById("t-subj-exam-obt").value = course.exam_obtained;
        document.getElementById("t-subj-exam-tot").value = course.exam_total;
        document.getElementById("t-subj-quiz-obt").value = course.quiz_obtained;
        document.getElementById("t-subj-quiz-tot").value = course.quiz_total;
        document.getElementById("t-subj-assign-obt").value = course.assign_obtained;
        document.getElementById("t-subj-assign-tot").value = course.assign_total;
        document.getElementById("t-subj-notes").value = course.notes || "";

        updateModalCoursePreview();
        teacherSubjectModal?.classList.add("active");
      });
    });
  }

  // Open Add Course Modal
  if (btnTAddSubject && teacherSubjectModal) {
    btnTAddSubject.addEventListener("click", () => {
      editingSubjectId = null;
      if (tSubjectModalTitle) tSubjectModalTitle.innerText = "➕ Add Course to Student Gradebook";
      document.getElementById("t-subj-name").value = "";
      document.getElementById("t-subj-exam-obt").value = "60";
      document.getElementById("t-subj-exam-tot").value = "75";
      document.getElementById("t-subj-quiz-obt").value = "18";
      document.getElementById("t-subj-quiz-tot").value = "20";
      document.getElementById("t-subj-assign-obt").value = "9";
      document.getElementById("t-subj-assign-tot").value = "10";
      document.getElementById("t-subj-notes").value = "";
      updateModalCoursePreview();
      teacherSubjectModal.classList.add("active");
    });
  }

  if (btnCloseTSubjectModal && teacherSubjectModal) {
    btnCloseTSubjectModal.addEventListener("click", () => teacherSubjectModal.classList.remove("active"));
  }
  if (btnCancelTSubj && teacherSubjectModal) {
    btnCancelTSubj.addEventListener("click", () => teacherSubjectModal.classList.remove("active"));
  }

  // Save / Update Course in Store
  if (tSubjectForm) {
    tSubjectForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("t-subj-name").value.trim();
      const category = document.getElementById("t-subj-category").value;
      const eObt = parseFloat(document.getElementById("t-subj-exam-obt").value);
      const eTot = parseFloat(document.getElementById("t-subj-exam-tot").value);
      const qObt = parseFloat(document.getElementById("t-subj-quiz-obt").value);
      const qTot = parseFloat(document.getElementById("t-subj-quiz-tot").value);
      const aObt = parseFloat(document.getElementById("t-subj-assign-obt").value);
      const aTot = parseFloat(document.getElementById("t-subj-assign-tot").value);
      const notes = document.getElementById("t-subj-notes").value.trim();

      if (!name) {
        showToast("Course name is required.", "error");
        return;
      }
      if (eObt > eTot || qObt > qTot || aObt > aTot) {
        showToast("Obtained marks cannot exceed total marks in any component.", "error");
        return;
      }

      const totalObtained = eObt + qObt + aObt;
      const totalPossible = eTot + qTot + aTot;
      const pct = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

      const courseObj = {
        id: editingSubjectId || "subj_" + Date.now(),
        name,
        category,
        exam_obtained: eObt,
        exam_total: eTot,
        quiz_obtained: qObt,
        quiz_total: qTot,
        assign_obtained: aObt,
        assign_total: aTot,
        obtained: totalObtained,
        total: totalPossible,
        percentage: pct,
        notes
      };

      if (editingSubjectId) {
        const idx = teacherSubjectsStore.findIndex((s) => s.id === editingSubjectId);
        if (idx >= 0) teacherSubjectsStore[idx] = courseObj;
        showToast(`Course '${name}' updated!`, "success");
      } else {
        teacherSubjectsStore.push(courseObj);
        showToast(`Course '${name}' added to student gradebook!`, "success");
      }

      teacherSubjectModal?.classList.remove("active");
      renderTeacherSubjectsTable();
    });
  }

  // Initialize teacherSubjectsStore as empty — each instructor adds their own students & courses
  renderTeacherSubjectsTable();

  // ============================================================================
  // SECTION 5: RUN COMPREHENSIVE AI DIAGNOSTIC FOR INDIVIDUAL STUDENT
  // ============================================================================
  const teacherIndividualForm = document.getElementById("teacher-individual-form");
  const teacherResultCard = document.getElementById("teacher-result-card");
  const btnResetForm = document.getElementById("btn-reset-form");
  const btnTNextStudent = document.getElementById("btn-t-next-student");

  function resetIndividualForm() {
    document.getElementById("t_student_name").value = "";
    document.getElementById("t_student_id").value = "";
    teacherSubjectsStore = [];
    renderTeacherSubjectsTable();
    if (teacherResultCard) teacherResultCard.style.display = "none";
    hideErrorBanner();
    showToast("Form reset. Ready to evaluate a new student.", "info");
    document.getElementById("t_student_name").focus();
  }

  if (btnResetForm) btnResetForm.addEventListener("click", resetIndividualForm);
  if (btnTNextStudent) btnTNextStudent.addEventListener("click", resetIndividualForm);

  if (teacherIndividualForm) {
    teacherIndividualForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrorBanner();

      const studentName = document.getElementById("t_student_name")?.value.trim();
      const studentId = document.getElementById("t_student_id")?.value.trim();
      const stage = document.getElementById("t_student_stage")?.value || "university";
      const attendance = parseFloat(document.getElementById("t_attendance")?.value || 85);
      const attentive = document.getElementById("t_attentive")?.value || "High";
      const commSkill = document.getElementById("t_comm_skill")?.value || "Exceptional";
      const behavior = document.getElementById("t_behavior")?.value || "Exemplary";
      const participation = document.getElementById("t_participation")?.value || "Leader";
      const academicNeed = document.getElementById("t_academic_need")?.value || "Independent";
      const rating = parseFloat(document.getElementById("t_rating")?.value || 5.0);
      const notes = document.getElementById("t_notes")?.value.trim() || "";

      if (!studentName || !studentId) {
        showErrorBanner("Please provide both Student Full Name and Roll No / Student ID.");
        return;
      }

      if (teacherSubjectsStore.length === 0) {
        showErrorBanner("Please add at least 1 course for this student before running AI diagnostic.");
        return;
      }

      const submitBtn = document.getElementById("btn-t-individual-submit");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>⏳ Evaluating Student with ML Pipeline...</span>`;
      }

      try {
        // Compute coursework totals
        let sumObt = 0;
        let sumTot = 0;
        teacherSubjectsStore.forEach((s) => {
          sumObt += Number(s.obtained);
          sumTot += Number(s.total);
        });
        const courseworkPct = sumTot > 0 ? (sumObt / sumTot) * 100 : attendance;
        const gpaScale = Math.min(4.0, Math.max(0.0, (courseworkPct / 100) * 4.0));

        // Build Payload according to Stage
        let payload = {
          role: "teacher",
          student_name: studentName,
          student_id: studentId,
          stage: stage,
          attendance_pct: attendance,
          attentiveness_level: attentive,
          communication_skill: commSkill,
          behavior_discipline: behavior,
          discussion_participation: participation,
          academic_need: academicNeed,
          teacher_rating: rating,
          teacher_notes: notes,
          subjects: teacherSubjectsStore,
          courses_count: teacherSubjectsStore.length,
          coursework_pct: courseworkPct
        };

        if (stage === "university") {
          const sem = parseInt(document.getElementById("t_uni_semester")?.value || "4");
          const major = document.getElementById("t_uni_major")?.value.trim() || "Computer Science";
          const prevCgpa = parseFloat(document.getElementById("t_uni_prev_cgpa")?.value || gpaScale.toFixed(2));
          const credits = parseInt(document.getElementById("t_uni_credits")?.value || "16");

          Object.assign(payload, {
            Age: 20 + Math.floor(sem / 2),
            Attendance_Pct: attendance,
            Study_Hours_Per_Day: rating >= 4.0 ? 5.0 : 3.0,
            Previous_CGPA: prevCgpa,
            Sleep_Hours: 7.0,
            Social_Hours_Week: 8,
            Gender: "Male",
            Major: major,
            Semester: sem,
            Credits: credits
          });
        } else if (stage === "intermediate") {
          const group = document.getElementById("t_inter_group")?.value || "Pre-Engineering";
          const part = document.getElementById("t_inter_part")?.value || "11";
          const board = document.getElementById("t_inter_board")?.value || "Federal";
          const sscMarks = parseFloat(document.getElementById("t_inter_ssc_marks")?.value || (courseworkPct * 11).toFixed(0));

          Object.assign(payload, {
            SSC_I_Marks: Math.round(sscMarks * 0.5),
            SSC_II_Marks: Math.round(sscMarks * 0.5),
            HSSC_I_Marks: Math.round(courseworkPct * 5.5),
            Attendance_Rate: attendance,
            Study_Hours: 4.5,
            Previous_Failures: 0,
            Exam_Attempts: 1,
            Region: board,
            Subject_Group: group,
            Grade_Level: part
          });
        } else if (stage === "matric") {
          const group = document.getElementById("t_matric_group")?.value || "Science with Bio";
          const sscClass = document.getElementById("t_matric_class")?.value || "10";
          const board = document.getElementById("t_matric_board")?.value || "Federal";
          const ssc1Marks = parseFloat(document.getElementById("t_matric_ssc1_marks")?.value || (courseworkPct * 5.5).toFixed(0));

          Object.assign(payload, {
            SSC_I_Marks: Math.round(ssc1Marks),
            SSC_II_Marks: Math.round(courseworkPct * 5.5),
            Attendance_Rate: attendance,
            Study_Hours: 4.0,
            Previous_Failures: 0,
            Region: board,
            Subject_Group: group,
            Grade_Level: sscClass
          });
        } else {
          // Secondary / Primary
          Object.assign(payload, {
            SSC_I_Marks: Math.round(courseworkPct * 5.0),
            Attendance_Rate: attendance,
            Study_Hours: 3.5,
            Previous_Failures: 0
          });
        }

        // Call Backend Prediction API
        let predictionResult = null;
        try {
          if (window.apiClient) {
            const apiStage = stage === "university" ? "university" : "matric-inter";
            predictionResult = await window.apiClient.post(`/api/v1/predictions/${apiStage}`, payload);
          }
        } catch (apiErr) {
          console.warn("Backend API call fallback:", apiErr);
        }

        // Calibrate Scores
        let predictedScore = 3.65;
        let predictedGrade = "Grade A";
        let statusBadge = "On Track";
        let statusColor = "badge-success";

        if (predictionResult && predictionResult.predicted_score !== undefined) {
          predictedScore = predictionResult.predicted_score;
          if (stage === "university") {
            predictedScore = Math.min(4.0, Math.max(1.0, predictedScore));
          }
        } else {
          // Reliable fallback calculation
          if (stage === "university") {
            predictedScore = Number((gpaScale * 0.7 + (rating / 5.0) * 4.0 * 0.3).toFixed(2));
          } else {
            predictedScore = Number((courseworkPct * 0.75 + (attendance) * 0.15 + (rating * 10) * 0.1).toFixed(1));
          }
        }

        // Letter Grade & Risk Stratification
        if (stage === "university") {
          if (predictedScore >= 3.67) { predictedGrade = "Grade A+ (Exemplary)"; statusBadge = "Exemplary Distinction"; statusColor = "badge-success"; }
          else if (predictedScore >= 3.33) { predictedGrade = "Grade A (High Honors)"; statusBadge = "On Track"; statusColor = "badge-success"; }
          else if (predictedScore >= 3.00) { predictedGrade = "Grade B+ (Proficient)"; statusBadge = "On Track"; statusColor = "badge-info"; }
          else if (predictedScore >= 2.50) { predictedGrade = "Grade B (Capable)"; statusBadge = "Moderate Attention"; statusColor = "badge-warning"; }
          else if (predictedScore >= 2.00) { predictedGrade = "Grade C (Developing)"; statusBadge = "Remedial Coaching"; statusColor = "badge-warning"; }
          else { predictedGrade = "Grade F (At Risk)"; statusBadge = "Critical Academic Risk"; statusColor = "badge-danger"; }
        } else {
          if (predictedScore >= 85) { predictedGrade = "Grade A-1 (Outstanding)"; statusBadge = "Exemplary Distinction"; statusColor = "badge-success"; }
          else if (predictedScore >= 75) { predictedGrade = "Grade A (Excellent)"; statusBadge = "On Track"; statusColor = "badge-success"; }
          else if (predictedScore >= 65) { predictedGrade = "Grade B (Good)"; statusBadge = "On Track"; statusColor = "badge-info"; }
          else if (predictedScore >= 50) { predictedGrade = "Grade C (Satisfactory)"; statusBadge = "Moderate Attention"; statusColor = "badge-warning"; }
          else { predictedGrade = "Grade F (At Risk)"; statusBadge = "Critical Intervention Needed"; statusColor = "badge-danger"; }
        }

        // AI Pedagogical Intervention Strategy Synthesis
        let strategy = "";
        if (academicNeed === "High" || statusBadge.includes("Risk")) {
          strategy = `⚠️ Urgent Pedagogical Intervention: Student requires targeted one-on-one office hour tutorials. Focus primarily on theory concepts and reinforce active recall practice. Attentiveness level is currently '${attentive}'—recommend structured modular assignments with progressive deadlines.`;
        } else if (attentive === "Low" || participation === "Passive") {
          strategy = `💡 Engagement & Classroom Participation: Student exhibits strong potential but demonstrates low classroom focus or passive participation. Recommend pairing with an active peer study group and incorporating interactive question-answering during lecture sessions.`;
        } else if (predictedScore >= (stage === "university" ? 3.5 : 80)) {
          strategy = `🌟 Advanced Honours Path: Student is performing at an exemplary standard with strong verbal skills ('${commSkill}') and self-directed independence. Recommend assignment of advanced extension projects, mentoring roles, or research topics.`;
        } else {
          strategy = `✅ Steady Progress: Student maintains reliable coursework completion. Continue tracking continuous assessment marks and maintain attendance above ${attendance}%.`;
        }

        // Render Individual Results Card
        if (teacherResultCard) {
          teacherResultCard.style.display = "block";
          document.getElementById("t-result-student-header").innerText = `AI Diagnostic: ${studentName} (${studentId})`;
          document.getElementById("t-result-meta").innerText = `Instructor Evaluation • Level: ${stage.toUpperCase()} • ${teacherSubjectsStore.length} Course(s) Evaluated`;
          
          const stageBadge = document.getElementById("t-result-stage-badge");
          if (stageBadge) stageBadge.innerText = stage.charAt(0).toUpperCase() + stage.slice(1);
          
          const riskBadge = document.getElementById("t-result-risk-badge");
          if (riskBadge) {
            riskBadge.innerText = statusBadge;
            riskBadge.className = `badge ${statusColor}`;
          }

          const scoreUnit = document.getElementById("t-res-score-unit");
          const scoreEl = document.getElementById("t-res-predicted-score");
          if (stage === "university") {
            if (scoreEl) scoreEl.innerText = typeof predictedScore === "number" ? predictedScore.toFixed(2) : predictedScore;
            if (scoreUnit) scoreUnit.innerText = "Projected Semester CGPA (0-4.0)";
          } else {
            if (scoreEl) scoreEl.innerText = `${typeof predictedScore === "number" ? predictedScore.toFixed(1) : predictedScore}%`;
            if (scoreUnit) scoreUnit.innerText = "Projected Overall Board Marks %";
          }

          const gradeEl = document.getElementById("t-res-predicted-grade");
          if (gradeEl) gradeEl.innerText = predictedGrade;

          const coursePctEl = document.getElementById("t-res-coursework-pct");
          if (coursePctEl) coursePctEl.innerText = `${courseworkPct.toFixed(1)}%`;

          // Qualitative Indicators with Dynamic Status Coloring
          const ratingBadge = document.getElementById("t-rating-badge");
          if (ratingBadge) ratingBadge.innerText = `Teacher Rating: ${rating.toFixed(1)} ⭐`;
          
          const resFocus = document.getElementById("t-res-focus");
          if (resFocus) {
            resFocus.innerText = attentive;
            resFocus.style.color = attentive === "High" ? "var(--color-lime)" : attentive === "Moderate" ? "#facc15" : "#f43f5e";
          }
          
          const resComm = document.getElementById("t-res-comm");
          if (resComm) {
            resComm.innerText = commSkill;
            resComm.style.color = (commSkill === "Exceptional" || commSkill === "Good") ? "#38bdf8" : "#fb923c";
          }
          
          const resBeh = document.getElementById("t-res-behavior");
          if (resBeh) {
            resBeh.innerText = behavior;
            resBeh.style.color = behavior === "Exemplary" ? "#4ade80" : behavior === "Cooperative" ? "#38bdf8" : "#fb923c";
          }
          
          const resNeed = document.getElementById("t-res-need");
          if (resNeed) {
            resNeed.innerText = academicNeed;
            resNeed.style.color = academicNeed === "Independent" ? "#4ade80" : academicNeed === "Moderate" ? "#fb923c" : "#f43f5e";
          }

          const recText = document.getElementById("t-recommendations-text");
          if (recText) recText.innerText = strategy;

          teacherResultCard.scrollIntoView({ behavior: "smooth" });
        }

        // ====================================================================
        // DATABASE PERSISTENCE & ZERO DATA REDUNDANCY (UPSERT)
        // ====================================================================
        const evaluatedRecord = {
          student_id: studentId,
          student_name: studentName,
          stage: stage,
          predicted_score: predictedScore,
          predicted_grade: predictedGrade,
          status_badge: statusBadge,
          status_color: statusColor,
          attendance_pct: attendance,
          courses: teacherSubjectsStore,
          attentive: attentive,
          comm_skill: commSkill,
          behavior: behavior,
          participation: participation,
          academic_need: academicNeed,
          rating: rating,
          notes: notes,
          strategy: strategy,
          teacher_id: userMeta.id || currentUser?.id || "teacher_default",
          teacher_code: userMeta.id_code || userMeta.student_id || "TCH-2026-001",
          teacher_name: userMeta.full_name || "Instructor",
          timestamp: new Date().toISOString()
        };

        // 1. LocalStorage De-duplicated Upsert by student_id across candidate teacher keys
        try {
          const teacherCode = userMeta.id_code || userMeta.student_id || "TCH-01";
          const keys = [`edumetrics_teacher_${teacherCode}`];
          if (currentUser?.id) keys.push(`edumetrics_teacher_${currentUser.id}`);

          keys.forEach((k) => {
            let teacherEvals = [];
            const existing = localStorage.getItem(k);
            if (existing) {
              try { teacherEvals = JSON.parse(existing) || []; } catch(e) {}
            }
            teacherEvals = teacherEvals.filter((item) => item.student_id !== studentId);
            teacherEvals.unshift(evaluatedRecord);
            localStorage.setItem(k, JSON.stringify(teacherEvals));
          });
        } catch (storageErr) {
          console.warn("LocalStorage save error:", storageErr);
        }

        // 2. Save into Supabase prediction_history & teacher_class_roster (Direct Cloud Table + API)
        try {
          if (window.authClient && window.authClient.client) {
            const session = window.authClient.getSession();
            const teacherId = session?.user?.id;
            const isUuid = teacherId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacherId);

            const predPayload = {
              stage: stage,
              input_features: evaluatedRecord,
              predicted_score: typeof predictedScore === "number" ? predictedScore : 3.5,
              predicted_grade: predictedGrade,
              status_badge: statusBadge,
              created_at: window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString()
            };
            if (isUuid) {
              predPayload.user_id = teacherId;
            }

            window.authClient.client.from("prediction_history").insert(predPayload).then(() => {
              console.log("[Supabase] Teacher evaluation saved to prediction_history table.");
            }).catch((e) => {
              console.warn("[Supabase] Teacher history insert notice:", e.message);
              if (predPayload.user_id) {
                delete predPayload.user_id;
                window.authClient.client.from("prediction_history").insert(predPayload).catch(() => {});
              }
            });

            // Also upsert directly into teacher_class_roster table
            const teacherCode = userMeta.id_code || userMeta.student_id || "TCH-01";
            const rosterRow = {
              id: `STU-${studentId || Math.floor(10 + Math.random() * 90)}`,
              teacher_id: teacherCode || "TCH-01",
              instructor_id: teacherCode || "TCH-01",
              student_name: studentName,
              student_id_code: studentId,
              roll_no: studentId,
              stage: stage,
              attendance_pct: parseFloat(attendance) || 85.0,
              quiz_test_pct: parseFloat(evaluatedRecord.quizzes_avg || 80.0),
              assignment_pct: parseFloat(evaluatedRecord.coursework_avg || 80.0),
              midterm_score: parseFloat(predictedScore) || 80.0,
              avg_marks: parseFloat(predictedScore) || 80.0,
              predicted_score: parseFloat(predictedScore) || 3.5,
              predicted_grade: predictedGrade,
              status_badge: statusBadge,
              status_color: statusColor,
              gender: "male",
              notes: notes || strategy || "",
              created_at: window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString()
            };
            window.authClient.client.from("teacher_class_roster").upsert(rosterRow, { onConflict: "id" }).then(() => {
              console.log("[Supabase] Student persisted in teacher_class_roster.");
            }).catch((rErr) => {
              console.warn("[Supabase] teacher_class_roster notice:", rErr.message);
            });
          }

          if (window.apiClient) {
            const ciLow = typeof predictedScore === "number" ? +(predictedScore * 0.92).toFixed(2) : 3.2;
            const ciHigh = typeof predictedScore === "number" ? +(predictedScore * 1.05).toFixed(2) : 3.9;

            await window.apiClient.post("/api/v1/history", {
              role: "teacher",
              stage: stage,
              predicted_score: predictedScore,
              predicted_grade: predictedGrade,
              status_badge: statusBadge,
              confidence_min: ciLow,
              confidence_max: ciHigh,
              confidence_interval_low: ciLow,
              confidence_interval_high: ciHigh,
              input_payload: evaluatedRecord,
              input_features: evaluatedRecord,
              explanation: {
                positive_factors: ["Classroom Focus", "Consistent Attendance", "Active Verbal Communication"],
                growth_factors: ["Targeted Revision", "Coursework Consistency"],
                recommendation: strategy || "Maintain academic momentum."
              },
              teacher_rating: rating || 5.0,
              teacher_notes: notes || "Evaluated with complete telemetry."
            });
          }
        } catch (dbErr) {
          console.warn("Supabase history save warning:", dbErr);
        }

        // 3. Auto-persist courses into Supabase academic_records & academic_subjects
        try {
          if (window.apiClient && teacherSubjectsStore && teacherSubjectsStore.length > 0) {
            const termSubjects = teacherSubjectsStore.map((c) => {
              const obt = Number(c.total_obtained ?? c.exam_obtained ?? 80);
              const tot = Number(c.total_possible ?? c.exam_total ?? 100);
              const pct = tot > 0 ? (obt / tot) * 100 : 80;
              let calcGrade = "A";
              if (pct >= 85) calcGrade = "A+";
              else if (pct >= 75) calcGrade = "A";
              else if (pct >= 65) calcGrade = "B";
              else if (pct >= 50) calcGrade = "C";
              else calcGrade = "F";

              return {
                id: c.id || ("sub_" + Math.random().toString(36).substring(2, 9)),
                subject_name: c.name || "Coursework",
                subject_category: c.category || "Theory",
                credits: Number(c.credits || 3),
                obtained_marks: obt,
                total_marks: tot,
                grade: c.grade || calcGrade
              };
            });

            await window.apiClient.createAcademicRecord({
              stage: stage,
              term_name: `${studentName} (${studentId})`,
              gpa: stage === "university" ? (typeof predictedScore === "number" ? predictedScore : 3.5) : courseworkPct,
              cgpa: stage === "university" ? (typeof predictedScore === "number" ? predictedScore : 3.5) : courseworkPct,
              credit_hours: teacherSubjectsStore.length * 3.0,
              subjects: termSubjects
            });
          }
        } catch (acadErr) {
          console.warn("Academic records auto-save note:", acadErr);
        }

        showToast(`Evaluation for '${studentName}' successfully saved!`, "success");
      } catch (err) {
        showErrorBanner("Evaluation error: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>⚡ Run AI</span>`;
        }
      }
    });
  }

  // ============================================================================
  // SETTINGS MODAL & LOGOUT
  // ============================================================================
  const btnOpenSettings = document.getElementById("btn-open-settings");
  const profileModal = document.getElementById("profile-settings-modal");
  const btnCloseProfile = document.getElementById("btn-close-profile-modal");
  const btnCancelProfile = document.getElementById("btn-cancel-profile");
  const modalTabBtns = document.querySelectorAll(".modal-tab-btn");
  const modalTabContents = document.querySelectorAll(".profile-tab-content");
  const profileForm = document.getElementById("profile-details-form");
  const passwordChangeForm = document.getElementById("password-change-form");
  const btnDeleteAccount = document.getElementById("btn-delete-account-confirm");
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  function populateTeacherSettings() {
    const nameInput = document.getElementById("setting-fullname");
    const idInput = document.getElementById("setting-studentid");
    const progInput = document.getElementById("setting-program");
    const instInput = document.getElementById("setting-institution");

    if (nameInput) nameInput.value = userMeta.full_name || "Instructor";
    if (idInput) idInput.value = userMeta.student_id || userMeta.id_code || "TCH-2026-001";
    if (progInput) progInput.value = userMeta.program || userMeta.major || "Computer Science";
    if (instInput) instInput.value = userMeta.institution_name || userMeta.institution || "Faculty of Engineering";

    // Reset and clear security password fields
    const secForm = document.getElementById("password-change-form") || document.getElementById("profile-security-form");
    if (secForm) secForm.reset();
    const newPassInput = document.getElementById("setting-new-password");
    const confPassInput = document.getElementById("setting-confirm-password");
    if (newPassInput) newPassInput.value = "";
    if (confPassInput) confPassInput.value = "";

    modalTabBtns.forEach((b, i) => { if (i === 0) b.classList.add("active"); else b.classList.remove("active"); });
    modalTabContents.forEach((c, i) => {
      if (i === 0) { c.classList.add("active"); c.style.display = "block"; }
      else { c.classList.remove("active"); c.style.display = "none"; }
    });
  }

  const railProfileBtn = document.getElementById("rail-profile-btn");
  if (railProfileBtn && profileModal) {
    railProfileBtn.addEventListener("click", () => {
      populateTeacherSettings();
      profileModal.classList.add("active");
    });
  }

  const teacherHeaderBtn = document.getElementById("teacher-profile-header-btn");
  if (teacherHeaderBtn && profileModal) {
    teacherHeaderBtn.addEventListener("click", () => {
      populateTeacherSettings();
      profileModal.classList.add("active");
    });
  }

  if (btnOpenSettings && profileModal) {
    btnOpenSettings.addEventListener("click", () => {
      populateTeacherSettings();
      profileModal.classList.add("active");
    });
  }
  if (btnCloseProfile && profileModal) {
    btnCloseProfile.addEventListener("click", () => profileModal.classList.remove("active"));
  }
  if (btnCancelProfile && profileModal) {
    btnCancelProfile.addEventListener("click", () => profileModal.classList.remove("active"));
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

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("setting-fullname")?.value.trim() || "Instructor";
      const prog = document.getElementById("setting-program")?.value.trim() || "Computer Science";
      const inst = document.getElementById("setting-institution")?.value.trim() || "Faculty of Engineering";

      if (window.authClient) {
        await window.authClient.updateUser({
          full_name: name,
          program: prog,
          major: prog,
          institution_name: inst
        });
      }
      syncTeacherProfile();
      profileModal?.classList.remove("active");
      showToast("Instructor profile updated!", "success");
    });
  }

  if (passwordChangeForm) {
    passwordChangeForm.addEventListener("submit", async (e) => {
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
        passwordChangeForm.reset();
        showToast("Password updated securely!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update password.", "error");
      }
    });
  }

  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("Permanently delete your instructor account and all cohort records? This action cannot be undone.")) {
        if (window.authClient) await window.authClient.deleteAccount();
        window.location.href = "login.html";
      }
    });
  }
});
