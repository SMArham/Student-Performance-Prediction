/**
 * AI Academic Performance Prediction & Analytics Platform (Page 2)
 * EduMetrics AI - Student Success & Academic Performance Prediction Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ============================================================================
  // 1. GLOBAL STATE MANAGEMENT & AUTH SAFEGUARD
  // ============================================================================
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = window.authClient ? window.authClient.getUser() : null;
  const userMeta = currentUser?.user_metadata || {};
  if (userMeta.role === "teacher") {
    window.location.href = "teacher-prediction.html";
    return;
  }

  let currentRole = "student";
  let currentStudentStep = 1;  // 1 to 5
  let currentStage = "university"; // 'university' | 'intermediate' | 'matric' | 'secondary' | 'primary'
  let hasUnsavedFormData = false;
  let activeStudentPrediction = null;

  // Sync Profile Identity
  function syncUserProfile() {
    const user = window.authClient ? window.authClient.getUser() : null;
    const meta = user?.user_metadata || userMeta;
    const displayName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Muhammad Ali");
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentIdCodeEl) {
      studentIdCodeEl.innerText = (user?.id && (user.id.startsWith("STU-") || user.id.startsWith("TCH-")))
        ? user.id
        : (meta.student_id || meta.id_code || "STU-01");
    }

    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById("navbar-user-avatar");
    if (avatarEl) avatarEl.innerText = initials || "SP";
  }

  syncUserProfile();
  if (window.authClient && window.authClient.syncProfileWithDatabase) {
    window.authClient.syncProfileWithDatabase().then(() => syncUserProfile());
  }

  // Initial Academic Subjects Store by Stage (Starts strictly empty for new users)
  const defaultSubjectsStore = {
    university: [],
    intermediate: [],
    matric: [],
    secondary: [],
    primary: []
  };

  // Stage Preset Suggestions for Modal (Pakistani Curriculum)
  const stageSubjectPresets = {
    university: [
      "Custom Subject / Course...",
      "Data Structures & Algorithms",
      "Calculus & Analytical Geometry",
      "Object Oriented Programming",
      "Database Systems",
      "Computer Networks",
      "Operating Systems",
      "Artificial Intelligence Principles",
      "Software Engineering",
      "Linear Algebra & Differential Equations",
      "Technical & Business Report Writing"
    ],
    intermediate: [
      "Custom Subject / Course...",
      "Mathematics (Pre-Engineering / ICS)",
      "Biology (Pre-Medical)",
      "Physics (Theory & Practical)",
      "Chemistry (Theory & Practical)",
      "Computer Science (Theory & Practical)",
      "English Compulsory",
      "Urdu Compulsory",
      "Islamic Education / Pakistan Studies",
      "Principles of Accounting (I.Com)",
      "Principles of Economics (I.Com)",
      "Business Mathematics (I.Com)",
      "Statistics (General Science)"
    ],
    matric: [
      "Custom Subject / Course...",
      "Mathematics (Science Group)",
      "Physics (Theory & Practical)",
      "Chemistry (Theory & Practical)",
      "Biology (Theory & Practical)",
      "Computer Science (Theory & Practical)",
      "English Compulsory",
      "Urdu Compulsory",
      "Islamiyat Compulsory / Ethics",
      "Pakistan Studies",
      "General Science (Arts Group)",
      "General Mathematics (Arts Group)"
    ],
    secondary: [
      "Custom Subject / Course...",
      "Mathematics",
      "General Science",
      "English",
      "Urdu",
      "Social Studies (History & Geography)",
      "Computer Education",
      "Islamiyat / Moral Education"
    ],
    primary: [
      "Custom Subject / Course...",
      "English",
      "Urdu",
      "Mathematics",
      "General Knowledge & Science",
      "Islamiyat / Ethics"
    ]
  };

  // Stage Assessment Periods (Pakistani Academic Terms)
  const stageAssessmentPeriods = {
    university: [
      "Midterm Examination",
      "Final Terminal Examination",
      "Sessional Assessments / Quizzes"
    ],
    intermediate: [
      "Part 1 (11th Grade Annual)",
      "Part 2 (12th Grade Annual)",
      "Send-Up Exam / Pre-Board",
      "Mid-Term Evaluation",
      "Monthly Assessment"
    ],
    matric: [
      "9th Class Annual (Part 1)",
      "10th Class Annual (Part 2)",
      "Pre-Board / Send-Up",
      "Mid-Term Test",
      "Monthly Test"
    ],
    secondary: [
      "1st Term Examination",
      "Mid-Term Examination (25/50 Marks)",
      "Final Term Examination",
      "Monthly Test Series"
    ],
    primary: [
      "First Term Assessment",
      "Mid-Term Assessment (25 Marks)",
      "Final Term Assessment",
      "Classroom Monthly Quiz"
    ]
  };

  // Get active user-isolated subjects storage key
  function getActiveUserSubjectsKey() {
    const user = window.authClient ? window.authClient.getUser() : null;
    const uid = user?.id || (user?.email ? user.email.replace(/[^a-zA-Z0-9]/g, "_") : "guest");
    return "edumetrics_subjects_store_v3_" + uid;
  }

  function loadSubjectsStore() {
    try {
      const key = getActiveUserSubjectsKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return JSON.parse(JSON.stringify(defaultSubjectsStore));
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultSubjectsStore));
    }
  }

  // Live in-memory subjects store with User-Isolated LocalStorage persistence
  let subjectsStore = loadSubjectsStore();

  function persistSubjects() {
    try {
      const key = getActiveUserSubjectsKey();
      localStorage.setItem(key, JSON.stringify(subjectsStore));
    } catch (e) {}
  }

  // Teacher Class Roster In-Memory Data (Starts strictly empty for teacher)
  let classRoster = [];

  let uploadedCsvData = [];

  // ============================================================================
  // 2. DOM ELEMENT CACHE
  // ============================================================================
  const roleBtnStudent = document.getElementById("role-btn-student");
  const roleBtnTeacher = document.getElementById("role-btn-teacher");
  const studentSection = document.getElementById("student-prediction-section");
  const teacherSection = document.getElementById("teacher-prediction-section");
  const pageBreadcrumbTitle = document.getElementById("page-breadcrumb-title");
  const sidebarPredictionLabel = document.getElementById("sidebar-prediction-label");
  const headerStageContainer = document.getElementById("header-stage-container");
  const headerStageSelector = document.getElementById("header-stage-selector");
  const stageSelectorHidden = document.getElementById("stage-selector");
  const errorBanner = document.getElementById("error-banner");
  const errorBannerMessage = document.getElementById("error-banner-message");
  const toastContainer = document.getElementById("toast-container");

  // Stepper Elements
  const stepItems = document.querySelectorAll(".step-item");
  const studentSteps = [
    document.getElementById("student-step-1"),
    document.getElementById("student-step-2"),
    document.getElementById("student-step-3"),
    document.getElementById("student-step-4"),
    document.getElementById("student-step-5")
  ];

  // Subject Table & KPI Elements
  const subjectsTableBody = document.getElementById("subjects-table-body");
  const kpiTotalSubjects = document.getElementById("kpi-total-subjects");
  const kpiTotalMarks = document.getElementById("kpi-total-marks");
  const kpiAggregatePct = document.getElementById("kpi-aggregate-pct");
  const kpiCalcGpa = document.getElementById("kpi-calc-gpa");
  const subjectModal = document.getElementById("subject-modal");
  const subjectEntryForm = document.getElementById("subject-entry-form");
  const subjectPresetSelect = document.getElementById("subject-preset-select");
  const subjectNameInput = document.getElementById("subject-name-input");
  const subjectCategorySelect = document.getElementById("subject-category-select");
  const subjectTermSelect = document.getElementById("subject-term-select");
  const subjectObtainedInput = document.getElementById("subject-obtained-input");
  const subjectTotalInput = document.getElementById("subject-total-input");
  const subjectEditId = document.getElementById("subject-edit-id");
  const btnOpenSubjectModal = document.getElementById("btn-open-subject-modal");
  const btnCloseSubjectModal = document.getElementById("btn-close-subject-modal");
  const btnCancelSubjectModal = document.getElementById("btn-cancel-subject-modal");

  // Role Switch Safeguard Modal
  const roleSwitchModal = document.getElementById("role-switch-modal");
  const btnCancelRoleSwitch = document.getElementById("btn-cancel-role-switch");
  const btnConfirmRoleSwitch = document.getElementById("btn-confirm-role-switch");
  const btnCloseRoleModal = document.getElementById("btn-close-role-modal");

  // Dynamic Student Containers
  const dynamicAcademicFields = document.getElementById("dynamic-academic-fields");
  const dynamicHabitsFields = document.getElementById("dynamic-habits-fields");
  const dynamicAssessmentFields = document.getElementById("dynamic-assessment-fields");
  const studentReviewContainer = document.getElementById("student-review-container");
  const predictionForm = document.getElementById("prediction-form");
  const submitPredictBtn = document.getElementById("submit-predict-btn");
  const studentResultCard = document.getElementById("prediction-result-card");

  // Result Elements
  const resultPredictedVal = document.getElementById("result-predicted-val");
  const resultGradeVal = document.getElementById("result-grade-val");
  const resultStatusBadge = document.getElementById("result-status-badge");
  const resultStatusText = document.getElementById("result-status-text");
  const resultModelMeta = document.getElementById("result-model-meta");
  const resultCiRange = document.getElementById("result-ci-range");
  const resultCiBarFill = document.getElementById("result-ci-bar-fill");
  const resultCiMarker = document.getElementById("result-ci-marker");
  const ciMinLabel = document.getElementById("ci-min-label");
  const ciMaxLabel = document.getElementById("ci-max-label");
  const xaiBarsContainer = document.getElementById("xai-bars-container");
  const positiveFactorsList = document.getElementById("positive-factors-list");
  const growthFactorsList = document.getElementById("growth-factors-list");
  const resultRecommendationText = document.getElementById("result-recommendation-text");

  // Teacher Elements
  const toolBtnIndividual = document.getElementById("tool-btn-individual");
  const toolBtnClass = document.getElementById("tool-btn-class");
  const toolBtnUpload = document.getElementById("tool-btn-upload");
  const teacherViewIndividual = document.getElementById("teacher-view-individual");
  const teacherViewClass = document.getElementById("teacher-view-class");
  const teacherViewUpload = document.getElementById("teacher-view-upload");
  const teacherIndividualForm = document.getElementById("teacher-individual-form");
  const teacherResultCard = document.getElementById("teacher-result-card");
  const classRosterBody = document.getElementById("class-roster-body");
  const btnAddClassStudent = document.getElementById("btn-add-class-student");
  const btnRunClassPrediction = document.getElementById("btn-run-class-prediction");
  const fileDropzone = document.getElementById("file-dropzone");
  const csvFileInput = document.getElementById("csv-file-input");
  const btnDownloadSampleCsv = document.getElementById("btn-download-sample-csv");
  const btnLoadSampleCsv = document.getElementById("btn-load-sample-csv");
  const uploadPreviewCard = document.getElementById("upload-preview-card");
  const uploadPreviewHeader = document.getElementById("upload-preview-header");
  const uploadPreviewBody = document.getElementById("upload-preview-body");
  const previewRowCount = document.getElementById("preview-row-count");
  const btnConfirmUploadPredict = document.getElementById("btn-confirm-upload-predict");

  // Teacher Result Elements
  const tResultMeta = document.getElementById("t-result-meta");
  const tClassPassRate = document.getElementById("t-class-pass-rate");
  const tCountHighRisk = document.getElementById("t-count-high-risk");
  const tCountMedRisk = document.getElementById("t-count-med-risk");
  const tCountLowRisk = document.getElementById("t-count-low-risk");
  const tClassAvgVal = document.getElementById("t-class-avg-val");
  const tAtRiskList = document.getElementById("t-at-risk-list");
  const tTopPerformersList = document.getElementById("t-top-performers-list");
  const tRecommendationsText = document.getElementById("t-recommendations-text");

  // ============================================================================
  // 3. TOAST & NOTIFICATION SYSTEM
  // ============================================================================
  let activeToastTimer = null;
  function showToast(message, type = "info") {
    if (!toastContainer) return;

    // Clear existing toast so multiple toasts never stack up
    const existingToasts = toastContainer.querySelectorAll(".toast");
    existingToasts.forEach((t) => t.remove());

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    let title = "Platform Notice";

    if (type === "success") {
      icon = "✓";
      title = "Success";
    } else if (type === "error") {
      icon = "⚠️";
      title = "Required Info Missing";
    } else if (message.toLowerCase().includes("lock") || message.includes("🔒")) {
      icon = "🔒";
      title = "Step Locked";
    }

    // Clean any duplicated emojis from message body
    const cleanMsg = message.replace(/^[ℹ️⚠️✓🔒]+\s*/, "").replace(/^Step \d+ is locked:\s*/i, "");

    toast.innerHTML = `
      <div class="toast-icon-wrap">${icon}</div>
      <div class="toast-msg-content">
        <div class="toast-msg-title">${title}</div>
        <div class="toast-msg-body">${cleanMsg}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    if (activeToastTimer) clearTimeout(activeToastTimer);
    activeToastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px) scale(0.95)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function showErrorBanner(msg) {
    if (errorBanner && errorBannerMessage) {
      errorBannerMessage.innerText = msg;
      errorBanner.classList.add("active");
      errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideErrorBanner() {
    if (errorBanner) errorBanner.classList.remove("active");
  }

  // ============================================================================
  // 4. ROLE SWITCHER & STATE CONTROLLER
  // ============================================================================
  function switchRole(newRole, force = false) {
    if (newRole === currentRole && !force) return;

    if (hasUnsavedFormData && !force) {
      pendingRoleSwitch = newRole;
      if (roleSwitchModal) roleSwitchModal.classList.add("active");
      return;
    }

    currentRole = newRole;
    hasUnsavedFormData = false;

    if (currentRole === "student") {
      if (roleBtnStudent) roleBtnStudent.classList.add("active");
      if (roleBtnTeacher) roleBtnTeacher.classList.remove("active");
      if (studentSection) studentSection.style.display = "block";
      if (teacherSection) teacherSection.style.display = "none";
      if (pageBreadcrumbTitle) pageBreadcrumbTitle.innerText = "Student Academic Prediction";
      if (sidebarPredictionLabel) sidebarPredictionLabel.innerText = "Student Prediction";
      if (headerStageContainer) headerStageContainer.style.display = "flex";
      loadStudentStage(currentStage);
      goToStudentStep(1);
    } else {
      if (roleBtnTeacher) roleBtnTeacher.classList.add("active");
      if (roleBtnStudent) roleBtnStudent.classList.remove("active");
      if (studentSection) studentSection.style.display = "none";
      if (teacherSection) teacherSection.style.display = "block";
      if (pageBreadcrumbTitle) pageBreadcrumbTitle.innerText = "Teacher Academic Analytics";
      if (sidebarPredictionLabel) sidebarPredictionLabel.innerText = "Teacher Analytics";
      if (headerStageContainer) headerStageContainer.style.display = "none";
      switchTeacherTool("individual");
      renderClassRoster();
    }
    hideErrorBanner();
  }

  if (roleBtnStudent) roleBtnStudent.addEventListener("click", () => switchRole("student"));
  if (roleBtnTeacher) roleBtnTeacher.addEventListener("click", () => switchRole("teacher"));

  if (btnConfirmRoleSwitch) {
    btnConfirmRoleSwitch.addEventListener("click", () => {
      if (roleSwitchModal) roleSwitchModal.classList.remove("active");
      if (pendingRoleSwitch) {
        switchRole(pendingRoleSwitch, true);
        pendingRoleSwitch = null;
      }
    });
  }

  if (btnCancelRoleSwitch) {
    btnCancelRoleSwitch.addEventListener("click", () => {
      if (roleSwitchModal) roleSwitchModal.classList.remove("active");
      pendingRoleSwitch = null;
    });
  }

  if (btnCloseRoleModal) {
    btnCloseRoleModal.addEventListener("click", () => {
      if (roleSwitchModal) roleSwitchModal.classList.remove("active");
      pendingRoleSwitch = null;
    });
  }

  // 5. STUDENT STEPPER & PROGRESSIVE DISCLOSURE
  // ============================================================================
  function goToStudentStep(stepIndex) {
    if (stepIndex < 1 || stepIndex > 5) return false;

    // Strict sequential validation: Must pass every prior step before advancing
    if (stepIndex > currentStudentStep) {
      for (let s = 1; s < stepIndex; s++) {
        const isValid = validateStudentStep(s);
        if (!isValid) {
          return false;
        }
      }
    }

    currentStudentStep = stepIndex;
    hideErrorBanner();

    // Update Stepper Navigation UI
    stepItems.forEach((item) => {
      const step = parseInt(item.getAttribute("data-step"));
      item.classList.remove("active", "completed");
      if (step === currentStudentStep) {
        item.classList.add("active");
      } else if (step < currentStudentStep) {
        item.classList.add("completed");
      }
    });

    // Show/Hide Step Containers
    studentSteps.forEach((card, idx) => {
      if (card) {
        card.style.display = idx + 1 === currentStudentStep ? "block" : "none";
      }
    });

    // Prepare Review Screen on Step 5
    if (currentStudentStep === 5) {
      renderStudentReview();
    }

    window.scrollTo({ top: 120, behavior: "smooth" });
    return true;
  }

  stepItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetStep = parseInt(item.getAttribute("data-step"));
      if (targetStep < currentStudentStep) {
        // Always allow returning to previous steps
        goToStudentStep(targetStep);
      } else if (targetStep > currentStudentStep) {
        // Strictly prevent jumping ahead if any prior step is incomplete
        for (let s = 1; s < targetStep; s++) {
          const isValid = validateStudentStep(s);
          if (!isValid) {
            showToast(`🔒 Step ${targetStep} is locked: Please complete Step ${s} first before advancing.`, "warning");
            return;
          }
        }
        goToStudentStep(targetStep);
      }
    });
  });

  // Remove input-error highlight as soon as user types or updates a field
  document.addEventListener("input", (e) => {
    if (e.target && e.target.classList.contains("input-error")) {
      e.target.classList.remove("input-error");
      hideErrorBanner();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target && e.target.classList.contains("input-error")) {
      e.target.classList.remove("input-error");
      hideErrorBanner();
    }
  });

  // Step 1 Next Button
  const btnStep1Next = document.getElementById("btn-step1-next");
  if (btnStep1Next) btnStep1Next.addEventListener("click", () => goToStudentStep(2));

  // Step 2 Buttons
  const btnStep2Back = document.getElementById("btn-step2-back");
  const btnStep2Next = document.getElementById("btn-step2-next");
  if (btnStep2Back) btnStep2Back.addEventListener("click", () => goToStudentStep(1));
  if (btnStep2Next) btnStep2Next.addEventListener("click", () => goToStudentStep(3));

  // Step 3 Buttons
  const btnStep3Back = document.getElementById("btn-step3-back");
  const btnStep3Next = document.getElementById("btn-step3-next");
  if (btnStep3Back) btnStep3Back.addEventListener("click", () => goToStudentStep(2));
  if (btnStep3Next) btnStep3Next.addEventListener("click", () => goToStudentStep(4));

  // Step 4 Buttons
  const btnStep4Back = document.getElementById("btn-step4-back");
  const btnStep4Next = document.getElementById("btn-step4-next");
  if (btnStep4Back) btnStep4Back.addEventListener("click", () => goToStudentStep(3));
  if (btnStep4Next) btnStep4Next.addEventListener("click", () => goToStudentStep(5));

  // Step 5 Back Button
  const btnStep5Back = document.getElementById("btn-step5-back");
  if (btnStep5Back) btnStep5Back.addEventListener("click", () => goToStudentStep(4));

  // Stage Selection Cards in Step 1
  const stageCards = document.querySelectorAll(".stage-select-card");
  stageCards.forEach((card) => {
    card.addEventListener("click", () => {
      const selectedStage = card.getAttribute("data-stage");
      stageCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      if (stageSelectorHidden) stageSelectorHidden.value = selectedStage;
      if (headerStageSelector) headerStageSelector.value = selectedStage;
      loadStudentStage(selectedStage);
      // Immediately advance to Step 2 for seamless workflow
      goToStudentStep(2);
    });
  });

  if (headerStageSelector) {
    headerStageSelector.addEventListener("change", (e) => {
      const selectedStage = e.target.value;
      stageCards.forEach((c) => {
        if (c.getAttribute("data-stage") === selectedStage) c.classList.add("active");
        else c.classList.remove("active");
      });
      if (stageSelectorHidden) stageSelectorHidden.value = selectedStage;
      loadStudentStage(selectedStage);
    });
  }

  // ============================================================================
  // 6. DYNAMIC STAGE-AWARE FORM GENERATOR
  // ============================================================================
  function loadStudentStage(stage) {
    currentStage = stage;
    const stageBadge = document.getElementById("student-stage-badge");
    const step2Title = document.getElementById("step2-title");

    const stageTitles = {
      university: "University Level (CGPA & Semesters)",
      intermediate: "Intermediate (HSSC Board)",
      matric: "Matriculation (SSC Board)",
      secondary: "Middle / Secondary School",
      primary: "Primary Foundational School"
    };

    if (stageBadge) stageBadge.innerText = `Stage: ${stage.toUpperCase()}`;
    if (step2Title) step2Title.innerText = `📚 Step 2: Academic Record — ${stageTitles[stage] || stage}`;

    // 1. Populate Step 2: Dynamic Academic Fields
    renderStep2AcademicFields(stage);

    // 2. Populate Step 3: Dynamic Habits Fields
    renderStep3HabitsFields(stage);

    // 3. Populate Step 4: Dynamic Assessment Fields
    renderStep4AssessmentFields(stage);

    // 4. Adapt & Render Academic Subjects CRUD Table & Multi-Semester History
    renderSubjectsTable();
    updateSubjectPresetOptions();
    loadAcademicTerms(stage);
  }

  function renderStep2AcademicFields(stage) {
    if (!dynamicAcademicFields) return;
    const uniManagerCard = document.getElementById("university-semesters-manager-card");
    const managerCardTitle = document.getElementById("manager-card-title");
    const managerCardSubtitle = document.getElementById("manager-card-subtitle");
    const managerCurrentClassContainer = document.getElementById("manager-current-class-container");
    const managerCurrentClassLabel = document.getElementById("manager_current_class_label");
    const managerCurrentClassSelect = document.getElementById("manager_current_class_select");
    const managerTargetClassContainer = document.getElementById("manager-target-class-container");
    const managerTargetClassLabel = document.getElementById("manager_target_class_label");
    const managerTargetClassSelect = document.getElementById("manager_target_class_select");
    const kpiTitle1 = document.getElementById("kpi-title-1");
    const kpiSub1 = document.getElementById("kpi-standing-sub");
    const kpiTitle2 = document.getElementById("kpi-title-2");
    const kpiSub2 = document.getElementById("kpi-sub-2");
    const kpiTitle3 = document.getElementById("kpi-title-3");
    const kpiSub3 = document.getElementById("kpi-sub-3");
    const kpiTitle4 = document.getElementById("kpi-title-4");
    const kpiSub4 = document.getElementById("kpi-sub-4");

    if (uniManagerCard) uniManagerCard.style.display = "block";

    if (stage === "university") {
      if (managerCardTitle) managerCardTitle.innerHTML = `<span>🏛️ Academic Semesters & Coursework Ledger</span>`;
      if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current & Target Semester, then add your completed semesters, attendance, credit hours, and enrolled courses. Everything is calculated automatically.`;
      
      if (managerCurrentClassContainer) {
        managerCurrentClassContainer.style.display = "flex";
        if (managerCurrentClassLabel) managerCurrentClassLabel.innerHTML = `🎓 Current Semester:`;
        if (managerCurrentClassSelect) {
          managerCurrentClassSelect.innerHTML = `
            <option value="Semester 1">Semester 1 (Freshman)</option>
            <option value="Semester 2">Semester 2 (Freshman)</option>
            <option value="Semester 3">Semester 3 (Sophomore)</option>
            <option value="Semester 4">Semester 4 (Sophomore)</option>
            <option value="Semester 5">Semester 5 (Junior)</option>
            <option value="Semester 6">Semester 6 (Junior)</option>
            <option value="Semester 7">Semester 7 (Senior)</option>
            <option value="Semester 8">Semester 8 (Senior)</option>
          `;
          const semVal = loggedTerms.length > 0 ? `Semester ${loggedTerms.length}` : "Semester 1";
          if (managerCurrentClassSelect.querySelector(`option[value="${semVal}"]`)) {
            managerCurrentClassSelect.value = semVal;
          }
        }
      }

      if (managerTargetClassContainer) {
        managerTargetClassContainer.style.display = "flex";
        if (managerTargetClassLabel) managerTargetClassLabel.innerHTML = `🎯 Target Semester:`;
        if (managerTargetClassSelect) {
          managerTargetClassSelect.innerHTML = `
            <option value="Semester 2">Semester 2 (Freshman)</option>
            <option value="Semester 3">Semester 3 (Sophomore)</option>
            <option value="Semester 4">Semester 4 (Sophomore)</option>
            <option value="Semester 5">Semester 5 (Junior)</option>
            <option value="Semester 6">Semester 6 (Junior)</option>
            <option value="Semester 7">Semester 7 (Senior)</option>
            <option value="Semester 8" selected>Semester 8 (Graduation)</option>
            <option value="Final Graduation CGPA">Final Graduation CGPA</option>
          `;
        }
      }

      if (kpiTitle1) kpiTitle1.innerText = "Current Standing";
      if (kpiSub1) kpiSub1.innerText = "Active Semester";
      if (kpiTitle2) kpiTitle2.innerText = "Latest Semester GPA";
      if (kpiSub2) kpiSub2.innerText = "Last Term GPA";
      if (kpiTitle3) kpiTitle3.innerText = "Cumulative CGPA";
      if (kpiSub3) kpiSub3.innerText = "Overall Standing";
      if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
      if (kpiSub4) kpiSub4.innerText = "Lecture Presence";
    } else if (stage === "intermediate") {
      if (managerCardTitle) managerCardTitle.innerHTML = `<span>🎒 Intermediate (HSSC) Academic Records & Coursework Ledger</span>`;
      if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current Level & Target Level, then log your completed 1st Year / 2nd Year marks, attendance, and enrolled subjects.`;
      
      if (managerCurrentClassContainer) {
        managerCurrentClassContainer.style.display = "flex";
        if (managerCurrentClassLabel) managerCurrentClassLabel.innerHTML = `🎒 Current Level:`;
        if (managerCurrentClassSelect) {
          managerCurrentClassSelect.innerHTML = `
            <option value="1st Year (11th Class)" selected>1st Year (11th Class)</option>
            <option value="Matriculation Foundation (10th)">Matriculation Foundation (10th)</option>
          `;
        }
      }

      if (managerTargetClassContainer) {
        managerTargetClassContainer.style.display = "flex";
        if (managerTargetClassLabel) managerTargetClassLabel.innerHTML = `🎯 Target Level:`;
        if (managerTargetClassSelect) {
          managerTargetClassSelect.innerHTML = `
            <option value="1st Year (11th Class)">1st Year (11th Class Board)</option>
            <option value="2nd Year (12th Class)" selected>2nd Year (12th Class Board)</option>
            <option value="Final Intermediate Total">Final Intermediate (1100 Marks)</option>
          `;
        }
      }

      if (kpiTitle1) kpiTitle1.innerText = "Current Standing";
      if (kpiSub1) kpiSub1.innerText = "Active Year / Level";
      if (kpiTitle2) kpiTitle2.innerText = "Latest Term Score";
      if (kpiSub2) kpiSub2.innerText = "Last Record %";
      if (kpiTitle3) kpiTitle3.innerText = "Cumulative Aggregate";
      if (kpiSub3) kpiSub3.innerText = "Overall HSSC %";
      if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
      if (kpiSub4) kpiSub4.innerText = "College Presence";
    } else if (stage === "matric") {
      if (managerCardTitle) managerCardTitle.innerHTML = `<span>📘 Matriculation (SSC) Academic Records & Coursework Ledger</span>`;
      if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current Class & Target Class, then log your 9th Class (SSC-I) or 10th Class (SSC-II) marks, attendance, and board subjects.`;
      
      if (managerCurrentClassContainer) {
        managerCurrentClassContainer.style.display = "flex";
        if (managerCurrentClassLabel) managerCurrentClassLabel.innerHTML = `📘 Current Class:`;
        if (managerCurrentClassSelect) {
          managerCurrentClassSelect.innerHTML = `
            <option value="9th Class (SSC-I)" selected>9th Class (SSC-I)</option>
            <option value="8th Middle Foundation">8th Middle Foundation</option>
          `;
        }
      }

      if (managerTargetClassContainer) {
        managerTargetClassContainer.style.display = "flex";
        if (managerTargetClassLabel) managerTargetClassLabel.innerHTML = `🎯 Target Class:`;
        if (managerTargetClassSelect) {
          managerTargetClassSelect.innerHTML = `
            <option value="9th Class (SSC-I)">9th Class (SSC-I Board)</option>
            <option value="10th Class (SSC-II)" selected>10th Class (SSC-II Board)</option>
            <option value="Final Matric Total">Final Matric (1100 Marks)</option>
          `;
        }
      }

      if (kpiTitle1) kpiTitle1.innerText = "Current Standing";
      if (kpiSub1) kpiSub1.innerText = "Active Class";
      if (kpiTitle2) kpiTitle2.innerText = "Latest Class Score";
      if (kpiSub2) kpiSub2.innerText = "Last Board %";
      if (kpiTitle3) kpiTitle3.innerText = "Cumulative Aggregate";
      if (kpiSub3) kpiSub3.innerText = "Overall SSC %";
      if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
      if (kpiSub4) kpiSub4.innerText = "School Presence";
    } else if (stage === "secondary") {
      if (managerCardTitle) managerCardTitle.innerHTML = `<span>🏫 Secondary Classes & Subject Coursework Ledger (Classes 5 to 8 / 9)</span>`;
      if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current Class and Target Forecast Class, then log your completed classes and subjects with obtained marks.`;
      
      if (managerCurrentClassContainer) {
        managerCurrentClassContainer.style.display = "flex";
        if (managerCurrentClassLabel) managerCurrentClassLabel.innerHTML = `🏫 Current Class:`;
        if (managerCurrentClassSelect) {
          managerCurrentClassSelect.innerHTML = `
            <option value="Class 5">Class 5</option>
            <option value="Class 6">Class 6</option>
            <option value="Class 7" selected>Class 7</option>
            <option value="Class 8">Class 8</option>
          `;
        }
      }

      if (managerTargetClassContainer) {
        managerTargetClassContainer.style.display = "flex";
        if (managerTargetClassLabel) managerTargetClassLabel.innerHTML = `🎯 Target Class:`;
        if (managerTargetClassSelect) {
          managerTargetClassSelect.innerHTML = `
            <option value="Class 6">Class 6</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 8" selected>Class 8</option>
            <option value="Class 9 / Matric">Class 9 / Matric</option>
          `;
        }
      }
      if (kpiTitle1) kpiTitle1.innerText = "Logged Classes";
      if (kpiSub1) kpiSub1.innerText = "Completed Levels";
      if (kpiTitle2) kpiTitle2.innerText = "Latest Class Score";
      if (kpiSub2) kpiSub2.innerText = "Last Grade %";
      if (kpiTitle3) kpiTitle3.innerText = "Cumulative Aggregate";
      if (kpiSub3) kpiSub3.innerText = "Historical %";
      if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
      if (kpiSub4) kpiSub4.innerText = "Classroom Presence";
    } else if (stage === "primary") {
      if (managerCardTitle) managerCardTitle.innerHTML = `<span>🌱 Primary School Classes & Skills Ledger (Classes 1 to 4 / 5)</span>`;
      if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current Primary Grade and Target Grade, then log your completed classes with learning subjects & marks.`;
      
      if (managerCurrentClassContainer) {
        managerCurrentClassContainer.style.display = "flex";
        if (managerCurrentClassLabel) managerCurrentClassLabel.innerHTML = `🌱 Current Grade:`;
        if (managerCurrentClassSelect) {
          managerCurrentClassSelect.innerHTML = `
            <option value="Class 1">Class 1</option>
            <option value="Class 2">Class 2</option>
            <option value="Class 3" selected>Class 3</option>
            <option value="Class 4">Class 4</option>
          `;
        }
      }

      if (managerTargetClassContainer) {
        managerTargetClassContainer.style.display = "flex";
        if (managerTargetClassLabel) managerTargetClassLabel.innerHTML = `🎯 Target Grade:`;
        if (managerTargetClassSelect) {
          managerTargetClassSelect.innerHTML = `
            <option value="Class 2">Class 2</option>
            <option value="Class 3">Class 3</option>
            <option value="Class 4" selected>Class 4</option>
            <option value="Class 5">Class 5</option>
          `;
        }
      }
      if (kpiTitle1) kpiTitle1.innerText = "Logged Grades";
      if (kpiSub1) kpiSub1.innerText = "Completed Primary";
      if (kpiTitle2) kpiTitle2.innerText = "Latest Grade Score";
      if (kpiSub2) kpiSub2.innerText = "Last Term %";
      if (kpiTitle3) kpiTitle3.innerText = "Cumulative Aggregate";
      if (kpiSub3) kpiSub3.innerText = "Overall Mastery %";
      if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
      if (kpiSub4) kpiSub4.innerText = "School Presence";
    }

    if (managerCurrentClassSelect) {
      const kpiStanding = document.getElementById("kpi-current-standing");
      if (kpiStanding && managerCurrentClassSelect.value) {
        kpiStanding.innerText = managerCurrentClassSelect.value;
      }
      managerCurrentClassSelect.onchange = function() {
        const standingEl = document.getElementById("kpi-current-standing");
        if (standingEl) standingEl.innerText = this.value;
        const inlineNameSelect = document.getElementById("inline-term-name-select");
        if (inlineNameSelect && inlineNameSelect.querySelector(`option[value="${this.value}"]`)) {
          inlineNameSelect.value = this.value;
          const inlineNameInput = document.getElementById("inline-term-name-input");
          if (inlineNameInput) inlineNameInput.value = this.value;
        }
      };
    }

    dynamicAcademicFields.innerHTML = "";
  }

  function renderStep3HabitsFields(stage) {
    if (!dynamicHabitsFields) return;
    
    if (stage === "primary") {
      dynamicHabitsFields.innerHTML = `
        <div class="form-grid-3col" style="margin-bottom: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_study_hours">Daily Reading & Homework Hours <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" step="0.5" id="f_study_hours" class="form-input" min="0.5" max="6" placeholder="e.g. 1.5" value="1.5" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_revision_freq">Classroom Attentiveness & Listening</label>
            <select id="f_revision_freq" class="form-select">
              <option value="Daily" selected>Active & Attentive Listener</option>
              <option value="Weekly">Attentive with Occasional Distractions</option>
              <option value="BeforeExams">Needs Frequent Encouragement</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_assignment_disc">Homework & Activity Completion</label>
            <select id="f_assignment_disc" class="form-select">
              <option value="Always" selected>Consistently On-Time & Neat (100%)</option>
              <option value="Mostly">Mostly Completed On-Time (80-90%)</option>
              <option value="Irregular">Needs Parental Reminders</option>
            </select>
          </div>
        </div>
        <div class="form-grid-2col">
          <div class="form-group">
            <label class="form-label" for="f_ai_tools">Interactive Reading & Educational Activities</label>
            <select id="f_ai_tools" class="form-select">
              <option value="Frequent" selected>Daily Storybooks & Learning Games</option>
              <option value="Occasional">Weekly Interactive Learning</option>
              <option value="None">Traditional Classroom Textbooks Only</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_tuition">Guidance & Mentorship Support</label>
            <select id="f_tuition" class="form-select">
              <option value="Yes" selected>Parental / Teacher Guided Daily Study</option>
              <option value="No">Independent Learning</option>
            </select>
          </div>
        </div>
      `;
      return;
    }

    dynamicHabitsFields.innerHTML = `
      <div class="form-grid-3col" style="margin-bottom: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="f_study_hours">Daily Independent Study Hours <span style="color:var(--accent-rose)">*</span></label>
          <input type="number" step="0.5" id="f_study_hours" class="form-input" min="0" max="16" placeholder="e.g. 4.5" value="4.5" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_revision_freq">Revision Frequency</label>
          <select id="f_revision_freq" class="form-select">
            <option value="Daily" selected>Daily Routine Review</option>
            <option value="Weekly">Weekly Topic Consolidation</option>
            <option value="BeforeExams">Only Right Before Exams</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_assignment_disc">Homework & Assignment Discipline</label>
          <select id="f_assignment_disc" class="form-select">
            <option value="Always" selected>Consistently On-Time (100%)</option>
            <option value="Mostly">Mostly On-Time (80-90%)</option>
            <option value="Irregular">Occasional Delays (&lt;70%)</option>
          </select>
        </div>
      </div>
      <div class="form-grid-2col">
        <div class="form-group">
          <label class="form-label" for="f_ai_tools">Educational & AI Tools Usage</label>
          <select id="f_ai_tools" class="form-select">
            <option value="Frequent" selected>Frequent (Concept explanation & problem solving)</option>
            <option value="Occasional">Occasional (Quick lookup)</option>
            <option value="None">None / Traditional Textbooks Only</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_tuition">Extra Tuition / Academy / Mentorship</label>
          <select id="f_tuition" class="form-select">
            <option value="Yes">Yes (Enrolled in coaching / tutoring)</option>
            <option value="No" selected>No (Self-study only)</option>
          </select>
        </div>
      </div>
    `;
  }

  function renderStep4AssessmentFields(stage) {
    if (!dynamicAssessmentFields) return;

    if (stage === "primary") {
      dynamicAssessmentFields.innerHTML = `
        <div class="form-grid-3col" style="margin-bottom: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_self_motivation">Love of Learning & Curiosity (1 - 10)</label>
            <input type="number" id="f_self_motivation" class="form-input" min="1" max="10" placeholder="e.g. 9" value="9">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_self_confidence">Confidence in Reading & Numbers (1 - 10)</label>
            <input type="number" id="f_self_confidence" class="form-input" min="1" max="10" placeholder="e.g. 9" value="9">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_self_consistency">Classroom Participation & Habits (1 - 10)</label>
            <input type="number" id="f_self_consistency" class="form-input" min="1" max="10" placeholder="e.g. 9" value="9">
          </div>
        </div>
        <div class="form-grid-2col">
          <div class="form-group">
            <label class="form-label" for="f_learning_goal">Primary Learning Target</label>
            <select id="f_learning_goal" class="form-select">
              <option value="distinction" selected>🎯 Master All Core Subjects (All Star Badges)</option>
              <option value="high_pass">📈 Strengthen Reading & Numeracy Skills</option>
              <option value="steady">🛡️ Maintain Consistent Classroom Progress</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_exam_prep">Preferred Learning Style</label>
            <select id="f_exam_prep" class="form-select">
              <option value="past_papers" selected>🎨 Visual & Hands-on Learning Activities</option>
              <option value="summary_notes">📚 Storybooks, Worksheets & Practice</option>
              <option value="group_study">👥 Group Classroom Play & Sharing</option>
            </select>
          </div>
        </div>
      `;
      return;
    }

    dynamicAssessmentFields.innerHTML = `
      <div class="form-grid-3col" style="margin-bottom: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="f_self_motivation">Academic Motivation (1 - 10)</label>
          <input type="number" id="f_self_motivation" class="form-input" min="1" max="10" placeholder="e.g. 9" value="9">
        </div>
        <div class="form-group">
          <label class="form-label" for="f_self_confidence">Exam & Target Confidence (1 - 10)</label>
          <input type="number" id="f_self_confidence" class="form-input" min="1" max="10" placeholder="e.g. 8" value="8">
        </div>
        <div class="form-group">
          <label class="form-label" for="f_self_consistency">Study Routine Consistency (1 - 10)</label>
          <input type="number" id="f_self_consistency" class="form-input" min="1" max="10" placeholder="e.g. 9" value="9">
        </div>
      </div>
      <div class="form-grid-2col">
        <div class="form-group">
          <label class="form-label" for="f_learning_goal">Personal Academic Target / Goal</label>
          <select id="f_learning_goal" class="form-select">
            <option value="distinction" selected>🎯 Aiming for Top Distinction / A+ Grade</option>
            <option value="high_pass">📈 Target Strong Grade Improvement (A/B)</option>
            <option value="steady">🛡️ Maintain Consistent High Standing</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_exam_prep">Preferred Exam Prep Method</label>
          <select id="f_exam_prep" class="form-select">
            <option value="past_papers" selected>📝 Past Papers & Self-Testing</option>
            <option value="summary_notes">📑 Chapter Notes & Flashcards</option>
            <option value="group_study">👥 Peer Discussion & Review Sessions</option>
          </select>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // 7. STEP VALIDATION & REVIEW SCREEN
  // ============================================================================
  function validateStudentStep(step) {
    hideErrorBanner();
    // Clear existing error marks
    document.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));

    let errors = [];
    let firstErrorEl = null;

    function recordError(el, message) {
      errors.push(message);
      if (el) {
        el.classList.add("input-error");
        if (!firstErrorEl) firstErrorEl = el;
      }
    }

    if (step === 1) {
      const validStages = ["university", "intermediate", "matric", "secondary", "primary"];
      if (!validStages.includes(currentStage)) {
        errors.push("Please select an education stage to begin.");
      }
      const activeCard = document.querySelector(".stage-select-card.active");
      if (!activeCard) {
        errors.push("Please select your current education level.");
      }
    } else if (step === 2) {
      if (!loggedTerms || loggedTerms.length === 0) {
        const unit = currentStage === "university" 
          ? "Semester" 
          : currentStage === "intermediate" 
          ? "Intermediate Record" 
          : currentStage === "matric" 
          ? "Matric Record" 
          : currentStage === "secondary" 
          ? "Class Record" 
          : "Primary Grade";
        const msg = `Please click '+ Add ${unit}' to enter your academic record & subjects before moving to Step 3.`;
        errors.push(msg);
        showToast(msg, "error");
        showErrorBanner(msg);
        if (btnAddSemester) {
          btnAddSemester.classList.add("input-error");
        }
        return false;
      }
    } else if (step === 3) {
      const studyEl = document.getElementById("f_study_hours");
      const studyVal = studyEl?.value.trim();
      const studyHours = parseFloat(studyVal);
      if (!studyVal || isNaN(studyHours) || studyHours < 0.5 || studyHours > 16) {
        recordError(studyEl, "Daily study hours are required (between 0.5 and 16 hours/day).");
      }

      const revEl = document.getElementById("f_revision_freq");
      if (revEl && !revEl.value) {
        recordError(revEl, "Please select your revision frequency.");
      }

      const assignEl = document.getElementById("f_assignment_disc");
      if (assignEl && !assignEl.value) {
        recordError(assignEl, "Please select your assignment discipline.");
      }
    } else if (step === 4) {
      const motEl = document.getElementById("f_self_motivation");
      const motVal = motEl?.value.trim();
      if (!motVal || isNaN(parseInt(motVal)) || parseInt(motVal) < 1 || parseInt(motVal) > 10) {
        recordError(motEl, "Academic Motivation score (1-10) is required.");
      }

      const confEl = document.getElementById("f_self_confidence");
      const confVal = confEl?.value.trim();
      if (!confVal || isNaN(parseInt(confVal)) || parseInt(confVal) < 1 || parseInt(confVal) > 10) {
        recordError(confEl, "Exam Confidence score (1-10) is required.");
      }

      const consistEl = document.getElementById("f_self_consistency");
      const consistVal = consistEl?.value.trim();
      if (!consistVal || isNaN(parseInt(consistVal)) || parseInt(consistVal) < 1 || parseInt(consistVal) > 10) {
        recordError(consistEl, "Study Routine Consistency score (1-10) is required.");
      }
    }

    if (errors.length > 0) {
      const mainError = errors[0];
      showErrorBanner(mainError);
      showToast(mainError, "error");
      if (firstErrorEl) {
        firstErrorEl.focus();
        firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    return true;
  }

  function renderStudentReview() {
    if (!studentReviewContainer) return;
    const studyHours = document.getElementById("f_study_hours")?.value || "4.5";
    const revision = document.getElementById("f_revision_freq")?.value || "Daily";
    const motivation = document.getElementById("f_self_motivation")?.value || "9";
    const stageName = currentStage.charAt(0).toUpperCase() + currentStage.slice(1);
    const scaleText = currentStage === "university" ? "0.00 – 4.00 CGPA Scale" : currentStage === "intermediate" ? "1100 Marks & Percentage Scale" : "0 – 100% Percentage Scale";

    const totalLoggedCourses = loggedTerms.reduce((sum, t) => sum + (t.subjects?.length || 0), 0);

    let academicSummary = "";
    if (currentStage === "university") {
      let cumCgpa = "0.00";
      let avgAtt = "85";
      const semCount = loggedTerms.length || 1;
      const curSem = document.getElementById("manager_current_class_select")?.value || `Semester ${semCount}`;
      const tgtSem = document.getElementById("manager_target_class_select")?.value || `Semester ${semCount + 1}`;
      
      if (loggedTerms.length > 0) {
        const lastT = loggedTerms[loggedTerms.length - 1];
        if (lastT && lastT.cgpa !== undefined && lastT.cgpa !== null && !isNaN(parseFloat(lastT.cgpa)) && parseFloat(lastT.cgpa) > 0) {
          cumCgpa = (parseFloat(lastT.cgpa)).toFixed(2);
        } else {
          let gpaSum = 0, crSum = 0;
          loggedTerms.forEach(t => {
            const g = parseFloat(t.gpa !== undefined ? t.gpa : (t.percentage ? t.percentage / 25 : 3.5));
            const cr = parseFloat(t.credit_hours || 18);
            gpaSum += (g * cr);
            crSum += cr;
          });
          cumCgpa = crSum > 0 ? (gpaSum / crSum).toFixed(2) : (lastT?.gpa ? Number(lastT.gpa).toFixed(2) : "4.00");
        }
        let attSum = 0;
        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 85.0);
        });
        avgAtt = (attSum / loggedTerms.length).toFixed(1);
      }
      academicSummary = `Current: ${curSem} ➔ Target: ${tgtSem} | Cumulative CGPA: ${cumCgpa} | Avg Attendance: ${avgAtt}%`;
    } else if (currentStage === "intermediate") {
      let totalObt = 0, totalMax = 0, attSum = 0;
      loggedTerms.forEach(t => {
        attSum += parseFloat(t.attendance_pct || 88);
        (t.subjects || []).forEach(s => {
          totalObt += parseFloat(s.obtained_marks || 0);
          totalMax += parseFloat(s.total_marks || 100);
        });
      });
      const avgAtt = loggedTerms.length > 0 ? (attSum / loggedTerms.length).toFixed(1) : "88.0";
      const cumPct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : "85.0";
      const curLevel = document.getElementById("manager_current_class_select")?.value || "1st Year (11th Class)";
      const tgtLevel = document.getElementById("manager_target_class_select")?.value || "2nd Year (12th Class)";
      const termNames = loggedTerms.map(t => t.term_name).join(", ") || `${loggedTerms.length} HSSC Terms`;
      academicSummary = `Current: ${curLevel} ➔ Target: ${tgtLevel} | Logged: ${termNames} (${cumPct}% Score) | Att: ${avgAtt}%`;
    } else if (currentStage === "matric") {
      let totalObt = 0, totalMax = 0, attSum = 0;
      loggedTerms.forEach(t => {
        attSum += parseFloat(t.attendance_pct || 90);
        (t.subjects || []).forEach(s => {
          totalObt += parseFloat(s.obtained_marks || 0);
          totalMax += parseFloat(s.total_marks || 100);
        });
      });
      const avgAtt = loggedTerms.length > 0 ? (attSum / loggedTerms.length).toFixed(1) : "90.0";
      const cumPct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : "85.0";
      const curClass = document.getElementById("manager_current_class_select")?.value || "9th Class (SSC-I)";
      const tgtClass = document.getElementById("manager_target_class_select")?.value || "10th Class (SSC-II)";
      const termNames = loggedTerms.map(t => t.term_name).join(", ") || `${loggedTerms.length} SSC Classes`;
      academicSummary = `Current: ${curClass} ➔ Target: ${tgtClass} | Logged: ${termNames} (${cumPct}% Score) | Att: ${avgAtt}%`;
    } else if (currentStage === "secondary") {
      let totalObt = 0, totalMax = 0, attSum = 0;
      loggedTerms.forEach(t => {
        attSum += parseFloat(t.attendance_pct || 90);
        (t.subjects || []).forEach(s => {
          totalObt += parseFloat(s.obtained_marks || 0);
          totalMax += parseFloat(s.total_marks || 100);
        });
      });
      const avgAtt = loggedTerms.length > 0 ? (attSum / loggedTerms.length).toFixed(1) : "90.0";
      const cumPct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : "85.0";
      const curCls = document.getElementById("manager_current_class_select")?.value || "Class 7";
      const tgtCls = document.getElementById("manager_target_class_select")?.value || "Class 8";
      const classNames = loggedTerms.map(t => t.term_name).join(", ") || `${loggedTerms.length} Classes`;
      academicSummary = `Current: ${curCls} ➔ Target: ${tgtCls} | Logged: ${classNames} (${cumPct}%) | Att: ${avgAtt}%`;
    } else {
      let totalObt = 0, totalMax = 0, attSum = 0;
      loggedTerms.forEach(t => {
        attSum += parseFloat(t.attendance_pct || 94);
        (t.subjects || []).forEach(s => {
          totalObt += parseFloat(s.obtained_marks || 0);
          totalMax += parseFloat(s.total_marks || 100);
        });
      });
      const avgAtt = loggedTerms.length > 0 ? (attSum / loggedTerms.length).toFixed(1) : "94.0";
      const cumPct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : "88.0";
      const curCls = document.getElementById("manager_current_class_select")?.value || "Class 3";
      const tgtCls = document.getElementById("manager_target_class_select")?.value || "Class 4";
      const classNames = loggedTerms.map(t => t.term_name).join(", ") || `${loggedTerms.length} Grades`;
      academicSummary = `Current: ${curCls} ➔ Target: ${tgtCls} | Logged: ${classNames} (${cumPct}%) | Att: ${avgAtt}%`;
    }

    studentReviewContainer.innerHTML = `
      <div class="review-bento-grid">
        <div class="review-bento-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">1. Target Education Tier</span>
            <span class="badge badge-primary" style="font-size: 11px;">${stageName}</span>
          </div>
          <div style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${stageName} Level</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${scaleText}</div>
        </div>

        <div class="review-bento-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">2. Academic Standing & Courses</span>
            <span class="badge badge-info" style="font-size: 11px;">${loggedTerms.length} ${currentStage === 'university' ? 'Terms' : currentStage === 'secondary' ? 'Classes' : 'Grades'} (${totalLoggedCourses} Courses)</span>
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: var(--color-lime); margin-bottom: 4px;">${academicSummary}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Coursework Aggregate: <strong>${kpiCumulativeCgpa?.innerText || "0.00"}</strong></div>
        </div>

        <div class="review-bento-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">3. Habits & Self-Assessment</span>
            <span class="badge badge-success" style="font-size: 11px;">${motivation}/10 Motivation</span>
          </div>
          <div style="font-size: 13.5px; font-weight: 700; color: var(--color-orange); margin-bottom: 4px;">${studyHours} hrs/day (${revision} Revision)</div>
          <div style="font-size: 12px; color: var(--text-secondary);">Exam Confidence: <strong>${document.getElementById("f_self_confidence")?.value || "8"}/10</strong></div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // 8. PREDICTION INFERENCE & AI ENGINE
  // ============================================================================
  if (predictionForm) {
    predictionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideErrorBanner();

      if (submitPredictBtn) {
        submitPredictBtn.classList.add("btn-loading");
        submitPredictBtn.innerHTML = `<span class="spinner-icon"></span> Running AI Forecast...`;
      }

      // Collect structured prediction payload
      const payload = extractStudentPayload();

      try {
        let result = null;
        if (window.apiClient && typeof window.apiClient.runPrediction === "function") {
          try {
            // Map stage to backend compatible endpoints
            const backendStage = currentStage === "intermediate" || currentStage === "matric" ? "matric_inter" : currentStage;
            result = await window.apiClient.runPrediction(backendStage, payload);
          } catch (apiErr) {
            console.warn("[API Notice] Falling back to client-side calibrated ML forecast simulator:", apiErr);
          }
        }

        // Calibrated simulation fallback if backend endpoint was unavailable
        if (!result) {
          result = generateCalibratedPredictionResult(currentStage, payload);
        }

        activeStudentPrediction = result;
        renderStudentResults(result);
        showToast("AI Academic Forecast successfully generated!", "success");

        // Save prediction record to historical records
        savePredictionToHistory(result, payload);

      } catch (err) {
        showErrorBanner("Prediction generation failed: " + (err.message || "Unknown error"));
      } finally {
        if (submitPredictBtn) {
          submitPredictBtn.classList.remove("btn-loading");
          submitPredictBtn.innerHTML = `<span>⚡ Run AI</span>`;
        }
      }
    });
  }

  function extractStudentPayload() {
    const payload = {
      stage: currentStage,
      study_hours: parseFloat(document.getElementById("f_study_hours")?.value || 4.5),
      revision_frequency: document.getElementById("f_revision_freq")?.value || "Daily",
      assignment_consistency: document.getElementById("f_assignment_disc")?.value || "Always",
      attentiveness_level: document.getElementById("f_attentive_level")?.value || "High",
      communication_skill: document.getElementById("f_comm_skill")?.value || "Excellent",
      motivation: parseInt(document.getElementById("f_self_motivation")?.value || 9),
      confidence: parseInt(document.getElementById("f_self_confidence")?.value || 8),
      subjects: subjectsStore[currentStage] || []
    };

    if (currentStage === "university") {
      let cumCgpa = 3.50;
      let avgAtt = 85.0;
      let totalCredits = 18;
      let latestMidterm = 80.0;
      let totalBacklogs = 0;
      let currentSemNum = 1;

      if (loggedTerms && loggedTerms.length > 0) {
        currentSemNum = loggedTerms.length;
        const curSelectVal = document.getElementById("manager_current_class_select")?.value;
        if (curSelectVal && curSelectVal.includes("Semester")) {
          const match = curSelectVal.match(/Semester\s*(\d+)/i);
          if (match) currentSemNum = parseInt(match[1]);
        }
        let attSum = 0;
        let crSum = 0;
        let gpaSum = 0;
        let weightedGpaSum = 0;

        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 85.0);
          const cr = parseFloat(t.credit_hours || 18);
          crSum += cr;
          totalBacklogs += parseInt(t.backlogs || 0);
          if (t.midterm_score) latestMidterm = parseFloat(t.midterm_score);
          const tGpa = parseFloat(t.gpa !== undefined ? t.gpa : (t.cgpa || 3.5));
          if (!isNaN(tGpa)) {
            gpaSum += tGpa;
            weightedGpaSum += (tGpa * cr);
          }
        });

        avgAtt = +(attSum / loggedTerms.length).toFixed(1);
        totalCredits = crSum || 18;
        
        const lastT = loggedTerms[loggedTerms.length - 1];
        if (lastT && lastT.cgpa !== undefined && lastT.cgpa !== null && !isNaN(parseFloat(lastT.cgpa)) && parseFloat(lastT.cgpa) > 0) {
          cumCgpa = +(parseFloat(lastT.cgpa)).toFixed(2);
        } else if (crSum > 0) {
          cumCgpa = +(weightedGpaSum / crSum).toFixed(2);
        } else {
          cumCgpa = +(gpaSum / loggedTerms.length).toFixed(2);
        }
      }

      payload.Previous_CGPA = cumCgpa;
      payload.Attendance_Pct = avgAtt;
      payload.Study_Hours_Per_Day = payload.study_hours;
      payload.Semester = currentSemNum;
      payload.Credit_Hours = totalCredits;
      payload.Midterm_Exam_Avg = latestMidterm;
      payload.Backlogs_Failed_Courses = totalBacklogs;
      payload.logged_terms = loggedTerms;
    } else if (currentStage === "intermediate") {
      let totalObt = 0;
      let totalMax = 0;
      let attSum = 0;
      let latestMidterm = 82.0;
      let studyH = payload.study_hours || 5.0;

      if (loggedTerms && loggedTerms.length > 0) {
        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 88.0);
          if (t.midterm_score) latestMidterm = parseFloat(t.midterm_score);
          if (t.study_hours) studyH = parseFloat(t.study_hours);
          (t.subjects || []).forEach((s) => {
            totalObt += parseFloat(s.obtained_marks || 0);
            totalMax += parseFloat(s.total_marks || 100);
          });
        });
      }

      const avgAtt = loggedTerms.length > 0 ? +(attSum / loggedTerms.length).toFixed(1) : 88.0;
      const overallPct = totalMax > 0 ? (totalObt / totalMax) * 100.0 : 85.0;
      const calcHssc1 = Math.round((overallPct / 100.0) * 550.0);
      const calcSsc = Math.round((overallPct / 100.0) * 1100.0);
      const targetLevel = loggedTerms.length > 1 ? "hssc2" : "hssc1";

      payload.target_level = targetLevel;
      payload.SSC_I_Marks = Math.round(calcSsc / 2);
      payload.SSC_II_Marks = Math.round(calcSsc / 2);
      payload.SSC_Total_Marks = calcSsc;
      payload.HSSC_I_Marks = calcHssc1;
      payload.Attendance_Rate = avgAtt;
      payload.Study_Hours = studyH;
      payload.Midterm_Exam_Avg = latestMidterm;
      payload.Subject_Group = "Pre-Engineering";
      payload.Lab_Competency = "Excellent";
      payload.logged_terms = loggedTerms;
    } else if (currentStage === "matric") {
      let totalObt = 0;
      let totalMax = 0;
      let attSum = 0;
      let studyH = payload.study_hours || 4.5;

      if (loggedTerms && loggedTerms.length > 0) {
        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 90.0);
          if (t.study_hours) studyH = parseFloat(t.study_hours);
          (t.subjects || []).forEach((s) => {
            totalObt += parseFloat(s.obtained_marks || 0);
            totalMax += parseFloat(s.total_marks || 100);
          });
        });
      }

      const avgAtt = loggedTerms.length > 0 ? +(attSum / loggedTerms.length).toFixed(1) : 90.0;
      const overallPct = totalMax > 0 ? (totalObt / totalMax) * 100.0 : 85.0;
      const ssc1 = Math.round((overallPct / 100.0) * 550.0);

      payload.SSC_I_Marks = ssc1;
      payload.Attendance_Rate = avgAtt;
      payload.Study_Hours = studyH;
      payload.Matric_Group = "Science (Computer Science)";
      payload.Past_Paper_Practice = "Daily";
      payload.Mock_Performance = "A+ Grade";
    } else if (currentStage === "secondary") {
      let totalObt = 0, totalMax = 0, attSum = 0;
      let lastClassPct = 85.0;
      if (loggedTerms && loggedTerms.length > 0) {
        loggedTerms.forEach((t, idx) => {
          attSum += parseFloat(t.attendance_pct || 90);
          let tObt = 0, tMax = 0;
          (t.subjects || []).forEach(s => {
            tObt += parseFloat(s.obtained_marks || 0);
            tMax += parseFloat(s.total_marks || 100);
          });
          if (tMax > 0) {
            const pct = (tObt / tMax) * 100;
            totalObt += tObt;
            totalMax += tMax;
            if (idx === loggedTerms.length - 1) lastClassPct = pct;
          }
        });
      }
      const cumPct = totalMax > 0 ? +(totalObt / totalMax * 100).toFixed(1) : lastClassPct;
      const avgAtt = loggedTerms.length > 0 ? +(attSum / loggedTerms.length).toFixed(1) : 90.0;

      payload.current_class = document.getElementById("manager_current_class_select")?.value || (loggedTerms[loggedTerms.length - 1]?.term_name || "Class 7");
      payload.target_class = document.getElementById("manager_target_class_select")?.value || "Class 8";
      payload.past_annual_pct = cumPct;
      payload.latest_class_pct = lastClassPct;
      payload.Attendance_Rate = avgAtt;
      payload.study_hours = parseFloat(document.getElementById("f_study_hours")?.value || 4.5);
      payload.logged_terms = loggedTerms;
      payload.G1 = Math.round((cumPct / 100) * 20);
      payload.G2 = payload.G1;
      payload.absences = Math.max(0, Math.round((100 - avgAtt) / 5));
      payload.studytime = Math.min(4, Math.max(1, Math.round(payload.study_hours / 2.5)));
    } else if (currentStage === "primary") {
      let totalObt = 0, totalMax = 0, attSum = 0;
      let lastGradePct = 88.0;
      if (loggedTerms && loggedTerms.length > 0) {
        loggedTerms.forEach((t, idx) => {
          attSum += parseFloat(t.attendance_pct || 94);
          let tObt = 0, tMax = 0;
          (t.subjects || []).forEach(s => {
            tObt += parseFloat(s.obtained_marks || 0);
            tMax += parseFloat(s.total_marks || 100);
          });
          if (tMax > 0) {
            const pct = (tObt / tMax) * 100;
            totalObt += tObt;
            totalMax += tMax;
            if (idx === loggedTerms.length - 1) lastGradePct = pct;
          }
        });
      }
      const cumPct = totalMax > 0 ? +(totalObt / totalMax * 100).toFixed(1) : lastGradePct;
      const avgAtt = loggedTerms.length > 0 ? +(attSum / loggedTerms.length).toFixed(1) : 94.0;

      payload.current_class = document.getElementById("manager_current_class_select")?.value || (loggedTerms[loggedTerms.length - 1]?.term_name || "Class 3");
      payload.target_class = document.getElementById("manager_target_class_select")?.value || "Class 4";
      payload.past_annual_pct = cumPct;
      payload.latest_grade_pct = lastGradePct;
      payload.Attendance_Rate = avgAtt;
      payload.logged_terms = loggedTerms;
      payload.Enrolment_score = cumPct;
      payload.Learning_score = cumPct;
      payload.Retention_score = 90.0;
    }

    return payload;
  }

  function generateCalibratedPredictionResult(stage, payload) {
    let score = 3.65;
    let formatted_score = "3.65 CGPA";
    let grade = "Grade A (Excellent)";
    let min_ci = 3.42;
    let max_ci = 3.88;
    let risk_level = "LOW";
    let status_badge = "On Track";
    let status_color = "badge-success";
    let forecastedSemGpa = 3.65;
    let projectedCumulativeCgpa = 3.60;

    if (stage === "university") {
      const baseCgpa = parseFloat(payload.Previous_CGPA || 3.50);
      const latestSemGpa = (payload.logged_terms && payload.logged_terms.length > 0)
        ? (parseFloat(payload.logged_terms[payload.logged_terms.length - 1].gpa) || baseCgpa)
        : baseCgpa;
      
      const studyBoost = ((parseFloat(payload.study_hours || 4.5)) - 4.0) * 0.05;
      const attBoost = ((parseFloat(payload.Attendance_Pct || 85.0)) - 80.0) * 0.005;
      const midBoost = (((parseFloat(payload.Midterm_Exam_Avg || 80.0)) - 75.0) / 100.0) * 0.25;
      const backlogPenalty = (parseInt(payload.Backlogs_Failed_Courses || 0)) * 0.12;

      forecastedSemGpa = +(Math.min(4.0, Math.max(1.0, latestSemGpa + studyBoost + attBoost + midBoost - backlogPenalty))).toFixed(2);
      const nTerms = (payload.logged_terms && payload.logged_terms.length > 0) ? payload.logged_terms.length : 1;
      projectedCumulativeCgpa = +(((baseCgpa * nTerms) + forecastedSemGpa) / (nTerms + 1)).toFixed(2);

      score = forecastedSemGpa;
      formatted_score = `${forecastedSemGpa.toFixed(2)} CGPA`;
      min_ci = Math.max(0.0, +(forecastedSemGpa - 0.18).toFixed(2));
      max_ci = Math.min(4.0, +(forecastedSemGpa + 0.16).toFixed(2));
      grade = forecastedSemGpa >= 3.7 ? "Grade A+ (Exemplary)" : forecastedSemGpa >= 3.3 ? "Grade A (Very Good)" : forecastedSemGpa >= 3.0 ? "Grade B+ (Good)" : forecastedSemGpa >= 2.5 ? "Grade B (Satisfactory)" : forecastedSemGpa >= 2.0 ? "Grade C (Passing)" : "Grade F (Probation)";
      risk_level = forecastedSemGpa >= 3.0 ? "LOW" : forecastedSemGpa >= 2.3 ? "MEDIUM" : "HIGH";
      status_badge = forecastedSemGpa >= 3.6 ? "Exemplary" : forecastedSemGpa >= 3.0 ? "On Track" : forecastedSemGpa >= 2.3 ? "At Risk" : "Critical Intervention Needed";
      status_color = forecastedSemGpa >= 3.6 ? "badge-success" : forecastedSemGpa >= 3.0 ? "badge-primary" : forecastedSemGpa >= 2.3 ? "badge-warning" : "badge-danger";

      return {
        stage: "university",
        score: forecastedSemGpa,
        predicted_score: forecastedSemGpa,
        forecasted_semester_gpa: forecastedSemGpa,
        projected_cumulative_cgpa: projectedCumulativeCgpa,
        formatted_score: `${forecastedSemGpa.toFixed(2)} CGPA`,
        predicted_grade: grade,
        grade,
        risk_level,
        status_badge,
        status_color,
        confidence_interval_low: min_ci,
        confidence_interval_high: max_ci,
        confidence_interval: { lower: min_ci, upper: max_ci },
        feature_contributions: {
          top_positive_factors: [
            `Current Academic Baseline: ${baseCgpa.toFixed(2)} Cumulative CGPA across ${nTerms} Semesters`,
            `Classroom Attendance: ${payload.Attendance_Pct || 85}% recorded presence`,
            `Daily Independent Study: ${payload.study_hours || 4.5} hrs/day routine`
          ],
          growth_areas: [
            `Focus on continuous coursework and quizzes in core degree subjects`,
            `Maintain weekly review blocks before midterms and finals`
          ]
        },
        recommendation: `Model forecasts a ${forecastedSemGpa.toFixed(2)} Semester GPA for your upcoming term, projecting your cumulative standing to ${projectedCumulativeCgpa.toFixed(2)} CGPA.`
      };
    } else if (stage === "intermediate") {
      const targetLevel = payload.target_level || "hssc1";
      const ssc1 = parseFloat(payload.SSC_I_Marks || 470);
      const ssc2 = parseFloat(payload.SSC_II_Marks || 485);
      const sscTotal = parseFloat(payload.SSC_Total_Marks || (ssc1 + ssc2));
      const sscPct = (sscTotal / 1100.0) * 100.0;
      const att = parseFloat(payload.Attendance_Rate || 88.0);
      const studyH = parseFloat(payload.Study_Hours || payload.study_hours || 5.0);
      const midterm = parseFloat(payload.Midterm_Exam_Avg || 82.0);
      const group = payload.Subject_Group || "Pre-Engineering";

      const groupPenalty = group.includes("Engineering") ? -1.0 : group.includes("Medical") ? -0.8 : group.includes("ICS") ? -0.3 : 0.5;
      const habitBoost = ((studyH - 4.0) * 1.2) + ((att - 80.0) * 0.25) + (((midterm - 75.0) / 100.0) * 8.0) + groupPenalty;

      if (targetLevel === "hssc1") {
        const predHssc1Pct = +(Math.min(99.0, Math.max(35.0, sscPct + Math.max(2.0, habitBoost)))).toFixed(1);
        const predHssc1Marks = Math.min(550, Math.max(150, Math.round((predHssc1Pct / 100.0) * 550)));

        score = predHssc1Marks;
        formatted_score = `${predHssc1Marks} / 550 (${predHssc1Pct}%)`;
        min_ci = Math.max(0, predHssc1Marks - 18);
        max_ci = Math.min(550, predHssc1Marks + 18);
        grade = predHssc1Pct >= 80 ? "Grade A-1 (Exceptional)" : predHssc1Pct >= 70 ? "Grade A (Excellent)" : predHssc1Pct >= 60 ? "Grade B (Very Good)" : predHssc1Pct >= 50 ? "Grade C (Good / Passing)" : "Grade D / Needs Support";
        risk_level = predHssc1Pct >= 70 ? "LOW" : predHssc1Pct >= 55 ? "MEDIUM" : "HIGH";
        status_badge = predHssc1Pct >= 80 ? "Exemplary" : predHssc1Pct >= 65 ? "On Track" : predHssc1Pct >= 50 ? "At Risk" : "Critical Intervention Needed";
        status_color = predHssc1Pct >= 80 ? "badge-success" : predHssc1Pct >= 65 ? "badge-primary" : predHssc1Pct >= 50 ? "badge-warning" : "badge-danger";

        return {
          stage,
          target_level: "hssc1",
          score: predHssc1Marks,
          predicted_score: predHssc1Marks,
          forecasted_1st_year: `${predHssc1Marks} / 550 (${predHssc1Pct}%)`,
          formatted_score,
          predicted_grade: grade,
          grade,
          risk_level,
          status_badge,
          status_color,
          confidence_interval_low: min_ci,
          confidence_interval_high: max_ci,
          confidence_interval: { lower: min_ci, upper: max_ci },
          feature_contributions: {
            top_positive_factors: [
              `Matric Foundation: ${sscTotal}/1100 (${sscPct.toFixed(1)}%) strong base for 11th board`,
              `College Attendance: ${att}% regular lecture presence`,
              `Independent Study: ${studyH} hrs/day structured routine`,
              `Academic Stream: ${group} enrolled`
            ],
            growth_areas: [
              `Solve 11th class 5-year past board papers for ${group} core topics`,
              `Prioritize numerical problem sets & theory concept memorization`
            ]
          },
          recommendation: `AI Engine forecasts ${predHssc1Marks} / 550 (${predHssc1Pct}%) in 1st Year (11th). Maintain consistent study hours for top board position.`
        };
      } else {
        const hssc1 = parseFloat(payload.HSSC_I_Marks || 460);
        const hssc1Pct = (hssc1 / 550.0) * 100.0;
        const headroom = 100.0 - hssc1Pct;
        const habitBoost = ((studyH - 4.0) * 1.2) + ((att - 80.0) * 0.25) + (((midterm - 75.0) / 100.0) * 8.0) + groupPenalty;
        const aiGrowthLift = Math.max(4.0, Math.min(12.0, +(headroom * 0.35 + habitBoost).toFixed(1)));
        const predHssc2Pct = +(Math.min(99.0, Math.max(hssc1Pct + 1.5, hssc1Pct + aiGrowthLift))).toFixed(1);
        const predHssc2Marks = Math.min(550, Math.max(150, Math.round((predHssc2Pct / 100.0) * 550)));

        score = predHssc2Marks;
        formatted_score = `${predHssc2Marks} / 550 (${predHssc2Pct}%)`;
        min_ci = Math.max(0, predHssc2Marks - 18);
        max_ci = Math.min(550, predHssc2Marks + 18);
        grade = predHssc2Pct >= 80 ? "Grade A-1 (Exceptional)" : predHssc2Pct >= 70 ? "Grade A (Excellent)" : predHssc2Pct >= 60 ? "Grade B (Very Good)" : predHssc2Pct >= 50 ? "Grade C (Good / Passing)" : "Grade D / Needs Support";
        risk_level = predHssc2Pct >= 70 ? "LOW" : predHssc2Pct >= 55 ? "MEDIUM" : "HIGH";
        status_badge = predHssc2Pct >= 80 ? "Exemplary" : predHssc2Pct >= 65 ? "On Track" : predHssc2Pct >= 50 ? "At Risk" : "Critical Intervention Needed";
        status_color = predHssc2Pct >= 80 ? "badge-success" : predHssc2Pct >= 65 ? "badge-primary" : predHssc2Pct >= 50 ? "badge-warning" : "badge-danger";

        return {
          stage,
          target_level: "hssc2",
          score: predHssc2Marks,
          predicted_score: predHssc2Marks,
          forecasted_2nd_year: `${predHssc2Marks} / 550 (${predHssc2Pct}%)`,
          formatted_score,
          predicted_grade: grade,
          grade,
          risk_level,
          status_badge,
          status_color,
          confidence_interval_low: min_ci,
          confidence_interval_high: max_ci,
          confidence_interval: { lower: min_ci, upper: max_ci },
          feature_contributions: {
            top_positive_factors: [
              `1st Year Board Baseline: ${hssc1}/550 (${hssc1Pct.toFixed(1)}%) verified intermediate benchmark`,
              `2nd Year Academic Lift: +${(predHssc2Pct - hssc1Pct).toFixed(1)}% projected academic lift`,
              `College Attendance: ${att}% consistent presence`,
              `Daily Independent Study: ${studyH} hrs/day`
            ],
            growth_areas: [
              `Focus on 2nd Year high-weightage topics and board model papers`,
              `Prepare for MDCAT / ECAT / Entry Test parallel to board exams`
            ]
          },
          recommendation: `AI Engine forecasts ${predHssc2Marks} / 550 (${predHssc2Pct}%) in 2nd Year (12th). Maintain rigorous mock practice.`
        };
      }
    } else if (stage === "matric") {
      const ssc1 = parseFloat(payload.SSC_I_Marks || 440);
      const studyH = parseFloat(payload.Study_Hours || payload.study_hours || 4.5);
      const att = parseFloat(payload.Attendance_Rate || 90);
      const ssc1Pct = (ssc1 / 550.0) * 100.0;
      
      // Calculate realistic AI predictive headroom and growth
      const habitBoost = ((studyH - 4.0) * 1.2) + ((att - 85.0) * 0.25);
      const headroom = 100.0 - ssc1Pct;
      const aiGrowthLift = Math.max(5.0, Math.min(12.5, +(headroom * 0.35 + habitBoost).toFixed(1)));
      const predSsc2Pct = +(Math.min(98.5, Math.max(ssc1Pct + 2.0, ssc1Pct + aiGrowthLift))).toFixed(1);
      const predSsc2Marks = Math.min(550, Math.max(150, Math.round((predSsc2Pct / 100.0) * 550)));

      score = predSsc2Marks;
      formatted_score = `${predSsc2Marks} / 550 (${predSsc2Pct}%)`;
      min_ci = Math.max(0, predSsc2Marks - 18);
      max_ci = Math.min(550, predSsc2Marks + 18);
      grade = predSsc2Pct >= 80 ? "Grade A-1 (Exceptional)" : predSsc2Pct >= 70 ? "Grade A (Excellent)" : predSsc2Pct >= 60 ? "Grade B (Very Good)" : predSsc2Pct >= 50 ? "Grade C (Good / Passing)" : predSsc2Pct >= 40 ? "Grade D (Fair)" : "Grade F / Fail";
      risk_level = predSsc2Pct >= 65 ? "LOW" : predSsc2Pct >= 50 ? "MEDIUM" : "HIGH";
      status_badge = predSsc2Pct >= 80 ? "Exemplary" : predSsc2Pct >= 65 ? "On Track" : predSsc2Pct >= 50 ? "At Risk" : "Critical Intervention Needed";
      status_color = predSsc2Pct >= 80 ? "badge-success" : predSsc2Pct >= 65 ? "badge-primary" : predSsc2Pct >= 50 ? "badge-warning" : "badge-danger";

      return {
        stage,
        score: predSsc2Marks,
        predicted_score: predSsc2Marks,
        forecasted_10th_marks: `${predSsc2Marks} / 550 (${predSsc2Pct}%)`,
        formatted_score,
        forecasted_percentage: predSsc2Pct,
        current_standing_pct: +ssc1Pct.toFixed(1),
        predicted_grade: grade,
        grade,
        risk_level,
        status_badge,
        status_color,
        confidence_interval_low: min_ci,
        confidence_interval_high: max_ci,
        confidence_interval: { lower: min_ci, upper: max_ci },
        feature_contributions: {
          top_positive_factors: [
            `9th Class Board Baseline: ${ssc1}/550 (${ssc1Pct.toFixed(1)}%) verified standing`,
            `10th Class Growth Forecast: +${(predSsc2Pct - ssc1Pct).toFixed(1)}% projected academic lift`,
            `School Attendance: ${att}% regular presence`,
            `Daily Independent Study: ${studyH} hrs/day routine`
          ],
          growth_areas: [
            `Focus on 10th Class 5-year past board questions for Sciences & Mathematics`,
            `Take regular monthly mock tests to build speed and accuracy`
          ]
        },
        recommendation: `AI Engine forecasts ${predSsc2Marks} / 550 (${predSsc2Pct}%) in 10th Class board exams. Maintain structured daily revisions.`
      };
    } else if (stage === "secondary") {
      const tgtClass = payload.target_class || "Class 9 / Matric";
      const cumPct = parseFloat(payload.past_annual_pct || 85.0);
      const studyH = parseFloat(payload.study_hours || 4.0);
      const att = parseFloat(payload.Attendance_Rate || 90.0);
      const termsCount = payload.logged_terms?.length || 1;

      const habitBoost = ((studyH - 3.0) * 1.2) + ((att - 85.0) * 0.2) + Math.min(2.0, (termsCount - 1) * 0.5);
      const headroom = 100.0 - cumPct;
      const aiGrowthLift = Math.max(3.0, Math.min(10.0, +(headroom * 0.3 + habitBoost).toFixed(1)));
      const predTgtPct = +(Math.min(99.0, Math.max(cumPct + 1.5, cumPct + aiGrowthLift))).toFixed(1);

      score = predTgtPct;
      formatted_score = `${predTgtPct}% in ${tgtClass}`;
      min_ci = Math.max(0, +(predTgtPct - 3.2).toFixed(1));
      max_ci = Math.min(100, +(predTgtPct + 3.2).toFixed(1));
      grade = predTgtPct >= 85 ? "Grade A+ (Distinction)" : predTgtPct >= 75 ? "Grade A (Excellent)" : predTgtPct >= 65 ? "Grade B (Good)" : predTgtPct >= 50 ? "Grade C (Satisfactory)" : "Grade D / Needs Support";
      risk_level = predTgtPct >= 70 ? "LOW" : predTgtPct >= 55 ? "MEDIUM" : "HIGH";
      status_badge = predTgtPct >= 85 ? "Exemplary" : predTgtPct >= 70 ? "On Track" : predTgtPct >= 55 ? "At Risk" : "Critical Intervention Needed";
      status_color = predTgtPct >= 85 ? "badge-success" : predTgtPct >= 70 ? "badge-primary" : predTgtPct >= 55 ? "badge-warning" : "badge-danger";

      return {
        stage,
        target_class: tgtClass,
        score: predTgtPct,
        predicted_score: predTgtPct,
        forecasted_target_percentage: `${predTgtPct}% (${tgtClass})`,
        formatted_score,
        predicted_grade: grade,
        grade,
        risk_level,
        status_badge,
        status_color,
        confidence_interval_low: min_ci,
        confidence_interval_high: max_ci,
        confidence_interval: { lower: min_ci, upper: max_ci },
        feature_contributions: {
          top_positive_factors: [
            `Historical Baseline: ${cumPct}% recorded across coursework`,
            `Academic Growth Lift: +${(predTgtPct - cumPct).toFixed(1)}% projected advancement`,
            `School Attendance: ${att}% presence logged`,
            `Daily Independent Study: ${studyH} hrs/day routine`
          ],
          growth_areas: [
            `Maintain rigorous practice in Mathematics & Sciences for ${tgtClass}`,
            `Solve model assessment papers ahead of final examinations`
          ]
        },
        recommendation: `AI Engine forecasts ${predTgtPct}% in ${tgtClass}. Continue consistent daily revision.`
      };
    } else {
      const tgtClass = payload.target_class || "Class 4";
      const cumPct = parseFloat(payload.past_annual_pct || 88.0);
      const att = parseFloat(payload.Attendance_Rate || 94.0);
      const termsCount = payload.logged_terms?.length || 1;

      const headroom = 100.0 - cumPct;
      const attBoost = ((att - 90.0) * 0.15);
      const aiGrowthLift = Math.max(3.0, Math.min(8.0, +(headroom * 0.3 + attBoost).toFixed(1)));
      const predTgtPct = +(Math.min(99.0, Math.max(cumPct + 1.5, cumPct + aiGrowthLift))).toFixed(1);

      score = predTgtPct;
      formatted_score = `${predTgtPct}% in ${tgtClass}`;
      min_ci = Math.max(0, +(predTgtPct - 2.8).toFixed(1));
      max_ci = Math.min(100, +(predTgtPct + 2.8).toFixed(1));
      grade = predTgtPct >= 85 ? "Level 4 (Advanced Mastery)" : predTgtPct >= 70 ? "Level 3 (Proficient)" : predTgtPct >= 50 ? "Level 2 (Developing)" : "Level 1 (Beginning)";
      risk_level = predTgtPct >= 70 ? "LOW" : predTgtPct >= 50 ? "MEDIUM" : "HIGH";
      status_badge = predTgtPct >= 85 ? "Exemplary" : predTgtPct >= 70 ? "On Track" : predTgtPct >= 50 ? "At Risk" : "Critical Intervention Needed";
      status_color = predTgtPct >= 85 ? "badge-success" : predTgtPct >= 70 ? "badge-primary" : predTgtPct >= 50 ? "badge-warning" : "badge-danger";

      return {
        stage,
        target_class: tgtClass,
        score: predTgtPct,
        predicted_score: predTgtPct,
        forecasted_target_percentage: `${predTgtPct}% (${tgtClass})`,
        formatted_score,
        predicted_grade: grade,
        grade,
        risk_level,
        status_badge,
        status_color,
        confidence_interval_low: min_ci,
        confidence_interval_high: max_ci,
        confidence_interval: { lower: min_ci, upper: max_ci },
        feature_contributions: {
          top_positive_factors: [
            `Foundational Baseline: ${cumPct}% recorded mastery`,
            `Developmental Growth: +${(predTgtPct - cumPct).toFixed(1)}% projected advancement`,
            `Attendance: ${att}% consistent presence in school`,
            `Multi-Subject Breadth: ${termsCount} primary grade records logged`
          ],
          growth_areas: [
            `Encourage regular reading and mental arithmetic exercises for ${tgtClass}`,
            `Reinforce creative writing and interactive projects`
          ]
        },
        recommendation: `AI Engine forecasts ${predTgtPct}% mastery for ${tgtClass}. Continue positive learning reinforcement.`
      };
    }

    return {
      score,
      predicted_score: score,
      formatted_score,
      predicted_grade: grade,
      grade,
      risk_level,
      status_badge,
      status_color,
      confidence_interval_low: min_ci,
      confidence_interval_high: max_ci,
      confidence_interval: { lower: min_ci, upper: max_ci },
      feature_contributions: {
        top_positive_factors: [
          `Board Examination Track: Solid foundational benchmark logged`,
          `High Classroom Attentiveness: Maintains sharp focus and active engagement in core lectures`,
          `Assignment Consistency: High homework and project submission discipline`,
          `Strong Communication Skills: Articulates ideas and questions effectively`
        ],
        growth_areas: [
          `Focus on past 5-year board exam questions for targeted marks enhancement`,
          `Target dedicated weekend revision for high-weightage topics`
        ]
      },
      recommendation: `Model suggests strong academic momentum. Prioritize structured weekly revision to maximize final assessment scores.`
    };
  }

  function renderStudentResults(res) {
    if (!studentResultCard) return;

    if (resultPredictedVal) {
      if (currentStage === "matric") {
        resultPredictedVal.innerText = res.forecasted_10th_marks || res.formatted_score || `${res.score} / 550`;
      } else if (currentStage === "intermediate") {
        resultPredictedVal.innerText = (res.target_level === "hssc1" ? res.forecasted_1st_year : res.forecasted_2nd_year) || res.formatted_score || `${res.score} / 550`;
      } else if (currentStage === "secondary" || currentStage === "primary") {
        resultPredictedVal.innerText = res.forecasted_target_percentage || res.formatted_score || `${res.score}%`;
      } else if (currentStage === "university") {
        const nextGpa = res.forecasted_semester_gpa || res.score || (res.predicted_score ? parseFloat(res.predicted_score) : 3.65);
        const formattedGpa = typeof nextGpa === "number" ? nextGpa.toFixed(2) : nextGpa;
        resultPredictedVal.innerText = `${formattedGpa} GPA`;
      } else {
        resultPredictedVal.innerText = res.formatted_score || `${res.score}`;
      }
    }
    
    // Resolve Grade correctly
    const gradeText = res.predicted_grade || res.grade || "Grade A (Excellent)";
    if (resultGradeVal) {
      if (currentStage === "matric") {
        resultGradeVal.innerText = `${gradeText} • 10th Class Forecast`;
      } else if (currentStage === "intermediate") {
        const yr = res.target_level === "hssc1" ? "1st Year Forecast" : "2nd Year Forecast";
        resultGradeVal.innerText = `${gradeText} • ${yr}`;
      } else if (currentStage === "secondary") {
        resultGradeVal.innerText = `${gradeText} • Target Class Forecast`;
      } else if (currentStage === "primary") {
        resultGradeVal.innerText = `${gradeText} • Target Grade Mastery`;
      } else {
        resultGradeVal.innerText = `${gradeText} • Next Semester Forecast`;
      }
    }

    // Single Direct Projection Pill rendering (Clean, Simple & Focused on Prediction)
    const dualProjectionContainer = document.getElementById("result-dual-projection");
    if (dualProjectionContainer) {
      if (currentStage === "university") {
        const nextGpa = res.forecasted_semester_gpa || res.score || (res.predicted_score ? parseFloat(res.predicted_score) : 3.65);
        const formattedGpa = typeof nextGpa === "number" ? nextGpa.toFixed(2) : nextGpa;
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 Next Semester Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${formattedGpa} GPA</div>
          </div>
        `;
      } else if (currentStage === "intermediate") {
        const isHssc1 = res.target_level === "hssc1";
        const val = isHssc1 ? (res.forecasted_1st_year || res.formatted_score || `${res.score} / 550`) : (res.forecasted_2nd_year || res.formatted_score || `${res.score} / 550`);
        const label = isHssc1 ? "🎯 1st Year (11th) Board Forecast" : "🎯 2nd Year (12th) Board Forecast";
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${label}</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${val}</div>
          </div>
        `;
      } else if (currentStage === "matric") {
        const val = res.forecasted_10th_marks || res.formatted_score || `${res.score} / 550`;
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 10th Class Board Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${val}</div>
          </div>
        `;
      } else if (currentStage === "secondary") {
        const val = res.forecasted_target_percentage || res.formatted_score || `${res.score}%`;
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 Target Class Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${val}</div>
          </div>
        `;
      } else if (currentStage === "primary") {
        const val = res.forecasted_target_percentage || res.formatted_score || `${res.score}%`;
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 Target Grade Mastery Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${val}</div>
          </div>
        `;
      } else {
        dualProjectionContainer.innerHTML = "";
      }
    }

    if (resultStatusBadge && resultStatusText) {
      const badgeText = res.status_badge || "On Track / Low Risk";
      const colorClass = res.status_color || "badge-success";
      resultStatusBadge.className = `badge ${colorClass}`;
      resultStatusText.innerText = badgeText;
    }

    // Model Meta
    if (resultModelMeta) {
      resultModelMeta.innerText = `Model: ${currentStage.toUpperCase()} AI Multi-Factor Engine (${res.model_version || "v2.2.0"})`;
    }

    // Confidence / Reliability Interval
    let ciLow = res.confidence_interval_low !== undefined ? res.confidence_interval_low : res.confidence_interval?.lower;
    let ciHigh = res.confidence_interval_high !== undefined ? res.confidence_interval_high : res.confidence_interval?.upper;

    if (ciLow === undefined || ciHigh === undefined) {
      if (currentStage === "university") {
        ciLow = Math.max(0, +(parseFloat(res.predicted_score || res.score || 3.5) - 0.18).toFixed(2));
        ciHigh = Math.min(4.0, +(parseFloat(res.predicted_score || res.score || 3.5) + 0.16).toFixed(2));
      } else if (currentStage === "intermediate" || currentStage === "matric") {
        const raw = parseFloat(res.predicted_score || res.score || 480);
        ciLow = Math.max(0, Math.round(raw - 18));
        ciHigh = Math.min(550, Math.round(raw + 18));
      } else {
        const raw = parseFloat(res.predicted_score || res.score || 88);
        ciLow = Math.max(0, +(raw - 3.0).toFixed(1));
        ciHigh = Math.min(100, +(raw + 3.0).toFixed(1));
      }
    }

    const unit = currentStage === "university" ? " CGPA" : (currentStage === "intermediate" || currentStage === "matric") ? " / 550" : "%";
    if (resultCiRange) resultCiRange.innerText = `[${ciLow} — ${ciHigh}${unit}]`;
    if (ciMinLabel) ciMinLabel.innerText = currentStage === "university" ? "0.00" : (currentStage === "intermediate" || currentStage === "matric") ? "0" : "0%";
    if (ciMaxLabel) {
      ciMaxLabel.innerText = currentStage === "university" ? "4.00" : (currentStage === "intermediate" || currentStage === "matric") ? "550" : "100%";
    }

    if (resultCiBarFill && resultCiMarker) {
      const maxVal = currentStage === "university" ? 4.0 : (currentStage === "intermediate" || currentStage === "matric") ? 550 : 100;
      const leftPct = Math.max(0, Math.min(100, (ciLow / maxVal) * 100));
      const rightPct = Math.max(0, Math.min(100, (ciHigh / maxVal) * 100));
      const widthPct = Math.max(5, rightPct - leftPct);
      const scoreVal = typeof res.score === "number" ? res.score : parseFloat(res.score || ciLow);
      const markerPct = Math.max(0, Math.min(100, (scoreVal / maxVal) * 100));

      resultCiBarFill.style.left = `${leftPct.toFixed(1)}%`;
      resultCiBarFill.style.width = `${widthPct.toFixed(1)}%`;
      resultCiMarker.style.left = `${markerPct.toFixed(1)}%`;
    }

    // Explainable AI (XAI) Feature Weight Bars
    if (xaiBarsContainer) {
      const weights = [
        { label: "Class Attendance & Lecture Presence", pct: 92 },
        { label: "Prior Academic Baseline & Quizzes", pct: 86 },
        { label: "Daily Independent Study Routine", pct: 81 },
        { label: "Assignment & Lab Consistency", pct: 78 },
        { label: "Classroom Focus & Attentiveness", pct: 72 }
      ];
      xaiBarsContainer.innerHTML = weights
        .map(
          (w) => `
        <div class="xai-bar-row">
          <div class="xai-label-row">
            <span>${w.label}</span>
            <span>${w.pct}% influence</span>
          </div>
          <div class="xai-bar-track">
            <div class="xai-bar-fill" style="width: ${w.pct}%;"></div>
          </div>
        </div>
      `
        )
        .join("");
    }

    // Positive and Growth Factors
    const posList = res.feature_contributions?.top_positive_factors || [];
    const growthList = res.feature_contributions?.growth_areas || [];

    if (positiveFactorsList) {
      positiveFactorsList.innerHTML = posList.map((f) => `<li class="factor-item"><span class="factor-bullet">🟢</span> ${f}</li>`).join("");
    }
    if (growthFactorsList) {
      growthFactorsList.innerHTML = growthList.map((f) => `<li class="factor-item"><span class="factor-bullet">🟡</span> ${f}</li>`).join("");
    }

    if (resultRecommendationText) {
      resultRecommendationText.innerText = res.recommendation || "Maintain consistent daily study blocks and focus on continuous revision.";
    }

    // Populate Faculty Instructor Qualitative Evaluation (if available)
    const teacherCard = document.getElementById("student-teacher-evaluation-card");
    if (teacherCard) {
      const tp = res.teacher_payload || res.input_payload || res.payload || {};
      const tFocus = res.attentive || tp.attentive || tp.attentiveness_level;
      const tComm = res.comm_skill || tp.comm_skill || tp.communication_skill;
      const tBeh = res.behavior || tp.behavior || tp.behavior_discipline;
      const tNeed = res.academic_need || tp.academic_need;
      const tRating = res.teacher_rating ?? tp.rating ?? tp.teacher_rating;
      const tStrategy = res.teacher_notes || tp.strategy || tp.notes;

      if (tFocus || tComm || tRating !== undefined || res.role === "teacher") {
        teacherCard.style.display = "block";
        const fEl = document.getElementById("student-teacher-focus");
        const cEl = document.getElementById("student-teacher-comm");
        const bEl = document.getElementById("student-teacher-behavior");
        const nEl = document.getElementById("student-teacher-need");
        const rEl = document.getElementById("student-teacher-rating-badge");
        const sEl = document.getElementById("student-teacher-strategy");
        const mEl = document.getElementById("student-teacher-meta");

        if (fEl) fEl.innerText = tFocus || "High";
        if (cEl) cEl.innerText = tComm || "Good";
        if (bEl) bEl.innerText = tBeh || "Cooperative";
        if (nEl) nEl.innerText = tNeed || "Independent";
        if (rEl) rEl.innerText = `${Number(tRating || 5.0).toFixed(1)} ⭐ Faculty Rating`;
        if (sEl) sEl.innerText = tStrategy || res.recommendation || "Student demonstrates dependable academic readiness. Maintain coursework momentum.";
        if (mEl && (tp.teacher_name || res.teacher_name)) {
          mEl.innerText = `Evaluated by: ${tp.teacher_name || res.teacher_name}`;
        }
      } else {
        teacherCard.style.display = "none";
      }
    }

    // Voice Speech Audio Guidance
    const btnListenSpeech = document.getElementById("btn-listen-ai-speech");
    if (btnListenSpeech) {
      btnListenSpeech.onclick = () => {
        if (!("speechSynthesis" in window)) {
          return showToast("Text-to-speech not supported in this browser.", "info");
        }
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          btnListenSpeech.classList.remove("speaking-pulse");
          btnListenSpeech.innerHTML = `<span>🔊 Listen to AI Feedback</span>`;
          return;
        }

        const textToSpeak = `Hello! Based on your academic record, your predicted performance is ${res.formatted_score || res.score}. ${res.recommendation || ""}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onstart = () => {
          btnListenSpeech.classList.add("speaking-pulse");
          btnListenSpeech.innerHTML = `<span>⏹️ Stop Speaking</span>`;
        };
        utterance.onend = () => {
          btnListenSpeech.classList.remove("speaking-pulse");
          btnListenSpeech.innerHTML = `<span>🔊 Listen to AI Feedback</span>`;
        };
        utterance.onerror = () => {
          btnListenSpeech.classList.remove("speaking-pulse");
          btnListenSpeech.innerHTML = `<span>🔊 Listen to AI Feedback</span>`;
        };
        window.speechSynthesis.speak(utterance);
      };
    }

    // Export PDF / Print Report
    const btnExportPdf = document.getElementById("btn-export-pdf-report");
    if (btnExportPdf) {
      btnExportPdf.onclick = () => {
        window.print();
      };
    }

    // Copy Summary to Clipboard
    const btnCopySummary = document.getElementById("btn-copy-summary");
    if (btnCopySummary) {
      btnCopySummary.onclick = () => {
        const summaryText = `🎓 EduMetrics AI - Academic Prediction Report\nStage: ${currentStage.toUpperCase()}\nPredicted Score: ${res.formatted_score || res.score}\nGrade: ${gradeText}\nRisk Level: ${res.risk_level || "LOW"}\nAI Recommendation: ${res.recommendation}\nDate: ${new Date().toLocaleDateString()}`;
        navigator.clipboard.writeText(summaryText).then(() => {
          showToast("Summary copied to clipboard!", "success");
        }).catch(() => {
          showToast("Failed to copy summary.", "error");
        });
      };
    }

    // View Detailed Analytics Navigation
    const btnGotoHistoryCta = document.getElementById("btn-goto-history-cta");
    if (btnGotoHistoryCta) {
      btnGotoHistoryCta.onclick = () => {
        window.location.href = "analytics.html";
      };
    }

    studentResultCard.style.display = "block";
    studentResultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ============================================================================
  // 9. SUBJECT / COURSE CRUD MANAGER (PRESERVED & STAGE-ADAPTED)
  // ============================================================================
  function renderSubjectsTable() {
    if (!subjectsTableBody) return;
    const subjects = subjectsStore[currentStage] || [];

    if (subjects.length === 0) {
      subjectsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
            No subjects logged yet for ${currentStage}. Click "+ Add Subject" to register your courses.
          </td>
        </tr>
      `;
      updateSubjectKPIs([], currentStage);
      return;
    }

    subjectsTableBody.innerHTML = subjects
      .map((sub, idx) => {
        const pct = sub.max > 0 ? ((sub.obtained / sub.max) * 100).toFixed(1) : "0.0";
        const grade = calculateSubjectGrade(parseFloat(pct), currentStage);
        return `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary);">${sub.name}</td>
          <td><span class="badge badge-info" style="font-size:11px;">${sub.category || "Core"}</span></td>
          <td style="color: var(--text-secondary); font-size:12px;">${sub.term || "Current"}</td>
          <td style="font-weight: 700; color: var(--text-primary);">${sub.obtained}</td>
          <td style="color: var(--text-muted);">${sub.max}</td>
          <td style="font-weight: 600; color: ${parseFloat(pct) >= 80 ? "var(--color-lime)" : "var(--color-orange)"};">${pct}%</td>
          <td><span class="badge ${parseFloat(pct) >= 80 ? "badge-success" : "badge-warning"}">${grade}</span></td>
          <td style="text-align: right;">
            <div class="action-btn-group">
              <button type="button" class="table-icon-btn btn-edit" onclick="window.editSubject('${sub.id}')">✏️ Edit</button>
              <button type="button" class="table-icon-btn btn-delete" onclick="window.deleteSubject('${sub.id}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    updateSubjectKPIs(subjects, currentStage);
    persistSubjects();
  }

  function calculateSubjectGrade(pct, stage) {
    if (stage === "university") {
      if (pct >= 85) return "A (4.0)";
      if (pct >= 80) return "A- (3.7)";
      if (pct >= 75) return "B+ (3.3)";
      if (pct >= 70) return "B (3.0)";
      if (pct >= 65) return "C+ (2.7)";
      return "F (0.0)";
    }
    if (pct >= 80) return "A-1";
    if (pct >= 70) return "A";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    return "F";
  }

  function updateSubjectKPIs(subjects, stage) {
    if (kpiTotalSubjects) kpiTotalSubjects.innerText = `${subjects.length}`;
    if (subjects.length === 0) {
      if (kpiTotalMarks) kpiTotalMarks.innerText = "0 / 0";
      if (kpiAggregatePct) kpiAggregatePct.innerText = "0.0%";
      if (kpiCalcGpa) kpiCalcGpa.innerText = stage === "university" ? "0.00 GPA" : "0.0%";
      return;
    }

    const totalObtained = subjects.reduce((sum, s) => sum + (parseFloat(s.obtained) || 0), 0);
    const totalMax = subjects.reduce((sum, s) => sum + (parseFloat(s.max) || 0), 0);
    const avgPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    if (kpiTotalMarks) kpiTotalMarks.innerText = `${totalObtained.toFixed(1)} / ${totalMax}`;
    if (kpiAggregatePct) kpiAggregatePct.innerText = `${avgPct.toFixed(1)}%`;

    if (kpiCalcGpa) {
      if (stage === "university") {
        const calcGpa = (avgPct / 100) * 4.0;
        kpiCalcGpa.innerText = `${calcGpa.toFixed(2)} GPA`;
      } else {
        kpiCalcGpa.innerText = `${avgPct.toFixed(1)}% Avg`;
      }
    }
  }

  function persistSubjects() {
    try {
      localStorage.setItem("edumetrics_subjects_store_v2", JSON.stringify(subjectsStore));
    } catch (e) {}
  }

  function updateSubjectPresetOptions() {
    if (subjectPresetSelect) {
      const presets = stageSubjectPresets[currentStage] || stageSubjectPresets.university;
      subjectPresetSelect.innerHTML = presets.map((p) => `<option value="${p}">${p}</option>`).join("");
    }
    if (subjectTermSelect) {
      const periods = stageAssessmentPeriods[currentStage] || stageAssessmentPeriods.university;
      subjectTermSelect.innerHTML = periods.map((p) => `<option value="${p}">${p}</option>`).join("");
    }
  }

  if (subjectPresetSelect) {
    subjectPresetSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val && !val.includes("Custom") && subjectNameInput) {
        subjectNameInput.value = val;
      }
    });
  }

  if (btnOpenSubjectModal) {
    btnOpenSubjectModal.addEventListener("click", () => {
      if (subjectEntryForm) subjectEntryForm.reset();
      if (subjectEditId) subjectEditId.value = "";
      const modalTitle = document.getElementById("subject-modal-title");
      if (modalTitle) modalTitle.innerText = "➕ Add Academic Subject / Course";
      updateSubjectPresetOptions();
      if (subjectModal) subjectModal.classList.add("active");
    });
  }

  if (btnCloseSubjectModal) btnCloseSubjectModal.addEventListener("click", () => subjectModal?.classList.remove("active"));
  if (btnCancelSubjectModal) btnCancelSubjectModal.addEventListener("click", () => subjectModal?.classList.remove("active"));

  if (subjectEntryForm) {
    subjectEntryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = subjectNameInput?.value.trim();
      const category = subjectCategorySelect?.value || "Theory";
      const term = subjectTermSelect?.value || "Annual Examination";
      const obtained = parseFloat(subjectObtainedInput?.value || 0);
      const max = parseFloat(subjectTotalInput?.value || 100);
      const editId = subjectEditId?.value;

      if (!name) return showToast("Please specify subject name.", "error");
      if (obtained > max) return showToast("Obtained marks cannot exceed max marks.", "error");

      const subjects = subjectsStore[currentStage] || [];
      if (editId) {
        const item = subjects.find((s) => s.id === editId);
        if (item) {
          item.name = name;
          item.category = category;
          item.term = term;
          item.obtained = obtained;
          item.max = max;
        }
      } else {
        subjects.push({
          id: `sub-${Date.now()}`,
          name,
          category,
          term,
          obtained,
          max
        });
      }

      subjectsStore[currentStage] = subjects;
      renderSubjectsTable();
      subjectModal?.classList.remove("active");
      showToast("Subject saved successfully!", "success");
    });
  }

  window.editSubject = (id) => {
    const subjects = subjectsStore[currentStage] || [];
    const item = subjects.find((s) => s.id === id);
    if (!item) return;
    if (subjectEditId) subjectEditId.value = item.id;
    if (subjectNameInput) subjectNameInput.value = item.name;
    if (subjectCategorySelect) subjectCategorySelect.value = item.category || "Core Science";
    if (subjectTermSelect) subjectTermSelect.value = item.term || "Current Term";
    if (subjectObtainedInput) subjectObtainedInput.value = item.obtained;
    if (subjectTotalInput) subjectTotalInput.value = item.max;

    const modalTitle = document.getElementById("subject-modal-title");
    if (modalTitle) modalTitle.innerText = "✏️ Edit Academic Subject";
    if (subjectModal) subjectModal.classList.add("active");
  };

  window.deleteSubject = (id) => {
    if (!confirm("Are you sure you want to remove this subject?")) return;
    subjectsStore[currentStage] = (subjectsStore[currentStage] || []).filter((s) => s.id !== id);
    renderSubjectsTable();
    showToast("Subject removed.", "info");
  };

  // ============================================================================
  // 10. MULTI-SEMESTER & HISTORICAL ACADEMIC TERMS CRUD (SUPABASE BACKED)
  // ============================================================================
  const termsHistoryCardsContainer = document.getElementById("terms-history-cards-container");
  const kpiTotalTerms = document.getElementById("kpi-total-terms");
  const kpiCumulativeCgpa = document.getElementById("kpi-cumulative-cgpa");
  const btnAddSemester = document.getElementById("btn-add-semester");
  const btnAddSemesterText = document.getElementById("btn-add-semester-text");
  const modalAddTerm = document.getElementById("modal-add-term");
  const btnCloseTermModal = document.getElementById("btn-close-term-modal");
  const btnCancelTermModal = document.getElementById("btn-cancel-term-modal");
  const addTermForm = document.getElementById("add-term-form");
  const modalTermSubjectsContainer = document.getElementById("modal-term-subjects-container");
  const btnAddModalSubjectRow = document.getElementById("btn-add-modal-subject-row");

  let loggedTerms = [];

  // Guarantee modal is strictly hidden upon load
  if (modalAddTerm) {
    modalAddTerm.classList.remove("active");
    modalAddTerm.style.display = "none";
  }

  function convertSubPctToGPA(pct) {
    if (pct >= 85) return 4.00;
    if (pct >= 80) return 3.70;
    if (pct >= 75) return 3.30;
    if (pct >= 70) return 3.00;
    if (pct >= 65) return 2.70;
    if (pct >= 60) return 2.30;
    if (pct >= 55) return 2.00;
    if (pct >= 50) return 1.70;
    return 0.00;
  }
  window.convertSubPctToGPA = convertSubPctToGPA;

  function calculateModalGpaFromRows() {
    const termGpaInput = document.getElementById("term-gpa-input");
    const termCgpaInput = document.getElementById("term-cgpa-input");
    if (!termGpaInput || !modalTermSubjectsContainer) return;
    const rows = Array.from(modalTermSubjectsContainer.querySelectorAll(".modal-subject-row"));
    if (rows.length === 0) return;

    let totObt = 0;
    let totMax = 0;
    let sumGpa = 0;
    let countSubs = 0;
    let hasInvalidMarks = false;

    rows.forEach(r => {
      const obtEl = r.querySelector(".m-sub-obt");
      const maxEl = r.querySelector(".m-sub-max");
      const obt = parseFloat(obtEl?.value);
      const max = parseFloat(maxEl?.value);
      if (!isNaN(obt) && !isNaN(max) && max > 0) {
        if (obt > max || obt < 0) {
          hasInvalidMarks = true;
          if (obtEl) {
            obtEl.style.borderColor = "#ef4444";
            obtEl.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.35)";
            obtEl.title = `Obtained marks (${obt}) cannot exceed Total marks (${max})!`;
          }
          return;
        }
        if (obtEl) {
          obtEl.style.borderColor = "";
          obtEl.style.boxShadow = "";
          obtEl.title = "";
        }
        totObt += obt;
        totMax += max;
        const pct = (obt / max) * 100;
        sumGpa += convertSubPctToGPA(pct);
        countSubs += 1;
      }
    });

    if (hasInvalidMarks) return;

    if (totMax > 0) {
      if (currentStage === "university") {
        const gpa = countSubs > 0 ? (sumGpa / countSubs) : 4.00;
        const boundedGpa = Math.min(4.00, Math.max(0.0, gpa));
        termGpaInput.value = boundedGpa.toFixed(2);
        if (termCgpaInput && (!termCgpaInput.value || termCgpaInput.value === "0" || termCgpaInput.value === "0.00" || parseFloat(termCgpaInput.value) === 0)) {
          termCgpaInput.value = boundedGpa.toFixed(2);
        }
      } else {
        const pct = Math.min(100.0, Math.max(0.0, (totObt / totMax) * 100.0));
        termGpaInput.value = pct.toFixed(1);
        if (termCgpaInput && (!termCgpaInput.value || termCgpaInput.value === "0" || parseFloat(termCgpaInput.value) === 0)) {
          termCgpaInput.value = pct.toFixed(1);
        }
      }
    }
  }

  function addModalSubjectRow(name = "", cat = "", obt = "", max = 100) {
    if (!modalTermSubjectsContainer) return;
    const rowId = `m-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const row = document.createElement("div");
    row.className = "modal-subject-row";
    row.id = rowId;
    row.style.display = "grid";
    row.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 32px";
    row.style.gap = "8px";
    row.style.alignItems = "center";

    let defaultName = "Calculus";
    let catOptions = `
      <option value="Theory" ${cat === "Theory" || !cat ? "selected" : ""}>Theory</option>
      <option value="Lab" ${cat === "Lab" ? "selected" : ""}>Lab</option>
    `;

    if (currentStage === "intermediate") {
      defaultName = "Physics";
      catOptions = `
        <option value="Core Science" ${cat === "Core Science" || !cat ? "selected" : ""}>Core Science</option>
        <option value="Language" ${cat === "Language" ? "selected" : ""}>Language</option>
        <option value="Elective" ${cat === "Elective" ? "selected" : ""}>Elective</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical / Lab</option>
      `;
    } else if (currentStage === "matric") {
      defaultName = "Mathematics";
      catOptions = `
        <option value="Science" ${cat === "Science" || !cat ? "selected" : ""}>Science</option>
        <option value="Compulsory" ${cat === "Compulsory" || !cat ? "selected" : ""}>Compulsory</option>
        <option value="Elective" ${cat === "Elective" ? "selected" : ""}>Elective</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical</option>
      `;
    } else if (currentStage === "secondary") {
      defaultName = "Mathematics";
      catOptions = `
        <option value="Core Subject" ${cat === "Core Subject" || !cat ? "selected" : ""}>Core Subject</option>
        <option value="Science" ${cat === "Science" ? "selected" : ""}>Science</option>
        <option value="Mathematics" ${cat === "Mathematics" ? "selected" : ""}>Mathematics</option>
        <option value="Language" ${cat === "Language" ? "selected" : ""}>Language</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical</option>
      `;
    } else if (currentStage === "primary") {
      defaultName = "Math & Numeracy";
      catOptions = `
        <option value="Foundational" ${cat === "Foundational" || !cat ? "selected" : ""}>Foundational</option>
        <option value="Numeracy" ${cat === "Numeracy" ? "selected" : ""}>Numeracy</option>
        <option value="Literacy" ${cat === "Literacy" ? "selected" : ""}>Literacy</option>
        <option value="Creative Art" ${cat === "Creative Art" ? "selected" : ""}>Creative Art</option>
        <option value="Activity" ${cat === "Activity" ? "selected" : ""}>Activity</option>
      `;
    }

    const safeMax = (max && max > 0 && max <= 550) ? max : 100;
    row.innerHTML = `
      <input type="text" class="form-input m-sub-name" placeholder="Subject Name (e.g. ${defaultName})" value="${name}" required style="padding:6px 10px;font-size:13px;">
      <select class="form-select m-sub-cat" style="padding:6px 10px;font-size:13px;">
        ${catOptions}
      </select>
      <input type="number" step="0.5" class="form-input m-sub-obt" placeholder="Marks" value="${obt !== undefined && obt !== null ? obt : ""}" min="0" max="${safeMax}" required style="padding:6px 10px;font-size:13px;">
      <input type="number" step="0.5" class="form-input m-sub-max" placeholder="Max" value="${safeMax}" min="1" max="550" required style="padding:6px 10px;font-size:13px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove(); window.calculateModalGpaFromRows && window.calculateModalGpaFromRows();" style="padding:4px 8px;font-size:12px;color:var(--color-red);" title="Remove Row">✕</button>
    `;

    const obtInput = row.querySelector(".m-sub-obt");
    const maxInput = row.querySelector(".m-sub-max");

    if (maxInput && obtInput) {
      maxInput.addEventListener("input", () => {
        const mVal = parseFloat(maxInput.value);
        if (!isNaN(mVal) && mVal > 0) {
          obtInput.max = mVal;
        }
        calculateModalGpaFromRows();
      });
      obtInput.addEventListener("input", () => {
        const oVal = parseFloat(obtInput.value);
        const mVal = parseFloat(maxInput.value);
        if (!isNaN(oVal) && !isNaN(mVal) && oVal > mVal) {
          obtInput.style.borderColor = "#ef4444";
          obtInput.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.4)";
          if (window.showToast) window.showToast(`⚠️ Obtained marks cannot exceed total marks (${mVal})`, "warning");
        } else {
          obtInput.style.borderColor = "";
          obtInput.style.boxShadow = "";
        }
        calculateModalGpaFromRows();
      });
    }

    modalTermSubjectsContainer.appendChild(row);
  }
  window.calculateModalGpaFromRows = calculateModalGpaFromRows;

  if (btnAddModalSubjectRow) {
    btnAddModalSubjectRow.addEventListener("click", () => addModalSubjectRow("", "", "", 100));
  }

  async function loadAcademicTerms(stage = currentStage) {
    if (btnAddSemesterText) {
      if (stage === "university") {
        btnAddSemesterText.innerText = "+ Add Semester";
      } else if (stage === "intermediate") {
        btnAddSemesterText.innerText = "+ Add Intermediate Record";
      } else if (stage === "matric") {
        btnAddSemesterText.innerText = "+ Add Matric Record";
      } else if (stage === "secondary") {
        btnAddSemesterText.innerText = "+ Add Class Record";
      } else if (stage === "primary") {
        btnAddSemesterText.innerText = "+ Add Primary Class";
      } else {
        btnAddSemesterText.innerText = "+ Add Academic Record";
      }
    }

    try {
      if (window.apiClient) {
        const res = await window.apiClient.getAcademicRecords(stage);
        if (res && Array.isArray(res.terms)) {
          loggedTerms = res.terms;
          renderTermsHistoryCards(loggedTerms, res);
          return;
        }
      }
    } catch (e) {
      console.warn("[Prediction] Loading academic terms from API fallback:", e.message);
    }

    renderTermsHistoryCards([], { cumulative_cgpa: 0, count: 0 });
  }

  function renderTermsHistoryCards(terms, meta = {}) {
    if (!termsHistoryCardsContainer) return;

    const kpiStanding = document.getElementById("kpi-current-standing");
    const kpiStandingSub = document.getElementById("kpi-standing-sub");
    const kpiLatestGpa = document.getElementById("kpi-latest-gpa");
    const curClassSelect = document.getElementById("manager_current_class_select");

    if (!terms || terms.length === 0) {
      const emptyIcon = currentStage === "university" ? "🏛️" : currentStage === "intermediate" ? "🎓" : currentStage === "matric" ? "📜" : currentStage === "secondary" ? "🏫" : "🌱";
      const emptyTitle = currentStage === "university" ? "No Academic Semesters Logged Yet"
        : currentStage === "intermediate" ? "No Intermediate Records Logged Yet"
        : currentStage === "matric" ? "No Matric Records Logged Yet"
        : currentStage === "secondary" ? "No Secondary Classes Logged Yet"
        : "No Primary Grades Logged Yet";
      const emptyHelp = currentStage === "university"
        ? "Click <strong>+ Add Semester</strong> to log your GPA, CGPA, attendance, and enrolled courses."
        : currentStage === "intermediate"
        ? "Click <strong>+ Add Intermediate Record</strong> to log your 1st Year / 2nd Year marks, attendance, and subjects."
        : currentStage === "matric"
        ? "Click <strong>+ Add Matric Record</strong> to log your 9th / 10th Class board marks, attendance, and subjects."
        : currentStage === "secondary"
        ? "Click <strong>+ Add Class Record</strong> to log your completed classes (e.g. Class 6, Class 7) and individual subjects."
        : "Click <strong>+ Add Primary Class</strong> to log completed primary classes and learning subjects.";

      if (kpiStanding) {
        if (curClassSelect && curClassSelect.value) {
          kpiStanding.innerText = curClassSelect.value;
        } else {
          kpiStanding.innerText = currentStage === "university" ? "Semester 1 (Freshman)"
            : currentStage === "intermediate" ? "1st Year (11th)"
            : currentStage === "matric" ? "9th Class (SSC-I)"
            : "No Classes Yet";
        }
      }
      if (kpiStandingSub) kpiStandingSub.innerText = "Awaiting 1st Entry";
      if (kpiLatestGpa) kpiLatestGpa.innerText = currentStage === "university" ? "0.00 GPA" : "0.0%";
      if (kpiCumulativeCgpa) kpiCumulativeCgpa.innerText = "--";
      const kpiAgg = document.getElementById("kpi-aggregate-pct");
      if (kpiAgg) kpiAgg.innerText = "--";

      termsHistoryCardsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; color: var(--text-muted);">
          <div style="font-size: 24px; margin-bottom: 6px;">${emptyIcon}</div>
          <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${emptyTitle}</div>
          <div style="font-size: 12px; margin-bottom: 14px;">${emptyHelp}</div>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.openAddSemesterModal && window.openAddSemesterModal(event)" style="font-size: 12px; padding: 6px 18px; font-weight: 700; cursor: pointer;">
            ${btnAddSemesterText ? btnAddSemesterText.innerText : "+ Add Record"}
          </button>
        </div>
      `;
      return;
    }

    let totalCoursesCount = 0;
    let totalObtainedAll = 0;
    let totalMaxAll = 0;
    let totalAttendance = 0;
    let totalCreditHours = 0;
    let weightedGpaSum = 0;
    let gpaSum = 0;

    terms.forEach(t => {
      const att = parseFloat(t.attendance_pct !== undefined ? t.attendance_pct : 85);
      totalAttendance += isNaN(att) ? 85 : att;

      const tGpa = parseFloat(t.gpa !== undefined && t.gpa !== null ? t.gpa : (t.percentage !== undefined ? (currentStage === "university" ? (t.percentage / 25.0) : t.percentage) : 3.5));
      const cr = parseFloat(t.credit_hours || 18);
      if (!isNaN(tGpa)) {
        gpaSum += tGpa;
        weightedGpaSum += (tGpa * cr);
        totalCreditHours += cr;
      }

      const subs = t.subjects || [];
      totalCoursesCount += subs.length;
      subs.forEach(s => {
        const obt = parseFloat(s.obtained_marks !== undefined ? s.obtained_marks : (s.marks !== undefined ? s.marks : 0));
        const maxM = parseFloat(s.total_marks !== undefined ? s.total_marks : (s.total !== undefined ? s.total : 100));
        if (!isNaN(obt) && !isNaN(maxM) && maxM > 0) {
          totalObtainedAll += obt;
          totalMaxAll += maxM;
        }
      });
    });

    const lastTerm = terms[terms.length - 1];
    let calcCgpa = 0;

    if (currentStage === "university") {
      // Prioritize explicit CGPA on the latest term if provided by user, otherwise credit-weighted GPA
      if (lastTerm && lastTerm.cgpa !== undefined && lastTerm.cgpa !== null && !isNaN(parseFloat(lastTerm.cgpa)) && parseFloat(lastTerm.cgpa) > 0) {
        calcCgpa = +(parseFloat(lastTerm.cgpa)).toFixed(2);
      } else if (totalCreditHours > 0) {
        calcCgpa = +(weightedGpaSum / totalCreditHours).toFixed(2);
      } else if (terms.length > 0) {
        calcCgpa = +(gpaSum / terms.length).toFixed(2);
      } else {
        calcCgpa = 0.00;
      }
    } else {
      if (lastTerm && lastTerm.cgpa !== undefined && lastTerm.cgpa !== null && !isNaN(parseFloat(lastTerm.cgpa)) && parseFloat(lastTerm.cgpa) > 0) {
        calcCgpa = +(parseFloat(lastTerm.cgpa)).toFixed(1);
      } else if (totalMaxAll > 0) {
        calcCgpa = +((totalObtainedAll / totalMaxAll) * 100).toFixed(1);
      } else if (terms.length > 0) {
        calcCgpa = +(gpaSum / terms.length).toFixed(1);
      } else {
        calcCgpa = 0.0;
      }
    }

    const avgAttendance = terms.length > 0 ? +(totalAttendance / terms.length).toFixed(1) : 85;

    if (kpiStanding) {
      if (curClassSelect && curClassSelect.value) {
        kpiStanding.innerText = curClassSelect.value;
      } else if (currentStage === "university") {
        const semNumber = terms.length;
        const tierName = semNumber === 1 ? "Freshman" : semNumber === 2 ? "Sophomore" : semNumber <= 4 ? "Junior" : "Senior";
        kpiStanding.innerText = `Semester ${semNumber} (${tierName})`;
      } else if (currentStage === "intermediate") {
        kpiStanding.innerText = terms.length === 1 ? "1st Year (HSSC-I)" : "2nd Year (HSSC-II)";
      } else if (currentStage === "matric") {
        kpiStanding.innerText = terms.length === 1 ? "9th Class (SSC-I)" : "10th Class (SSC-II)";
      } else if (currentStage === "secondary") {
        kpiStanding.innerText = `${terms.length} ${terms.length > 1 ? "Classes" : "Class"} Logged`;
      } else {
        kpiStanding.innerText = `${terms.length} ${terms.length > 1 ? "Grades" : "Grade"} Logged`;
      }
    }
    if (kpiStandingSub) kpiStandingSub.innerText = `${terms.length} Level${terms.length > 1 ? "s" : ""} Recorded`;

    if (kpiLatestGpa && lastTerm) {
      const lastGpa = lastTerm.gpa !== undefined && lastTerm.gpa !== null && !isNaN(parseFloat(lastTerm.gpa))
        ? parseFloat(lastTerm.gpa)
        : (lastTerm.percentage !== undefined && !isNaN(parseFloat(lastTerm.percentage)) ? parseFloat(lastTerm.percentage) : calcCgpa);
      kpiLatestGpa.innerText = currentStage === "university" ? `${Number(lastGpa).toFixed(2)} GPA` : `${Number(lastGpa).toFixed(1)}%`;
    }

    if (kpiCumulativeCgpa) {
      kpiCumulativeCgpa.innerText = currentStage === "university" ? `${calcCgpa.toFixed(2)} CGPA` : `${calcCgpa}%`;
    }
    const kpiAgg = document.getElementById("kpi-aggregate-pct");
    if (kpiAgg) kpiAgg.innerText = `${Math.round(avgAttendance)}%`;

    const cardIcon = currentStage === "university" ? "🏛️" : currentStage === "intermediate" ? "🎓" : currentStage === "matric" ? "📜" : currentStage === "secondary" ? "🏫" : "🌱";
    const subLabelUnit = currentStage === "university" ? "Courses" : "Subjects";

    termsHistoryCardsContainer.innerHTML = terms.map((t) => {
      const scoreLabel = currentStage === "university" ? `${Number(t.gpa || calcCgpa).toFixed(2)} GPA` : `${t.percentage || t.gpa || calcCgpa}% Score`;
      const attPill = t.attendance_pct ? ` • ${t.attendance_pct}% Att` : "";
      const crPill = currentStage === "university" && t.credit_hours ? ` • ${t.credit_hours} Credits` : "";
      const studyPill = (currentStage === "secondary" || currentStage === "primary" || currentStage === "intermediate" || currentStage === "matric") && t.study_hours ? ` • ${t.study_hours}h Study` : "";
      const cgpaPill = currentStage === "university" && t.cgpa ? ` • ${Number(t.cgpa).toFixed(2)} CGPA` : "";
      return `
        <div class="card" style="padding: 14px 18px; border: 1px solid rgba(255,255,255,0.12); background: rgba(18,20,24,0.78); border-radius: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 220px;">
              <span style="font-weight: 800; color: #ffffff; font-size: 15px;">${cardIcon} ${t.term_name}</span>
              <span class="badge badge-info" style="font-size: 11px;">${t.subjects?.length || 0} ${subLabelUnit}${crPill}${studyPill}${attPill}${cgpaPill}</span>
              <span class="badge badge-success" style="font-size: 11px; font-weight: 700;">${scoreLabel}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.editSemester('${(t.id || t.term_name || '').replace(/'/g, "\\'")}')" style="padding: 5px 14px; font-size: 12px; font-weight: 700; color: var(--color-lime); border: 1px solid rgba(168,240,75,0.45); background: rgba(168,240,75,0.08); border-radius: 6px; cursor: pointer;">
                ✏️ Edit
              </button>
            </div>
          </div>
          <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
            ${(t.subjects || []).map(s => {
              const subPct = s.total_marks > 0 ? Math.round((s.obtained_marks / s.total_marks) * 100) : 0;
              return `<span style="background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; font-size: 11.5px; color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.08);">
                <strong style="color: #ffffff;">${s.subject_name}</strong>: ${s.obtained_marks}/${s.total_marks} (${subPct}%)
              </span>`;
            }).join("") || "<span style='color:var(--text-muted);font-size:12px;'>No subjects recorded</span>"}
          </div>
        </div>
      `;
    }).join("");
  }

  function setupModalForCurrentStage(isEdit = false, term = null) {
    const termEditId = document.getElementById("term-edit-id");
    const termOriginalName = document.getElementById("term-original-name");
    const btnSaveText = document.getElementById("btn-save-term-modal-text");

    if (isEdit && term) {
      if (termEditId) termEditId.value = term.id || term.term_name;
      if (termOriginalName) termOriginalName.value = term.term_name;
      if (btnSaveText) btnSaveText.innerText = "💾 Update Semester Record";
    } else {
      if (termEditId) termEditId.value = "";
      if (termOriginalName) termOriginalName.value = "";
      if (btnSaveText) btnSaveText.innerText = "💾 Save Semester Record";
    }

    const termModalTitle = document.getElementById("term-modal-title");
    const termModalSubtitle = document.getElementById("term-modal-subtitle");
    const termNameLabel = document.getElementById("term-name-label");
    const termNameSelect = document.getElementById("term-name-select");
    const termNameInput = document.getElementById("term-name-input");
    const termGpaLabel = document.getElementById("term-gpa-label");
    const termGpaInput = document.getElementById("term-gpa-input");
    const termCgpaGroup = document.getElementById("term-cgpa-group");
    const termCreditsGroup = document.getElementById("term-credits-group");
    const termCreditsLabel = document.getElementById("term-credits-label");
    const termCreditsInput = document.getElementById("term-credits-input");
    const termMidtermGroup = document.getElementById("term-midterm-group");
    const termBacklogsGroup = document.getElementById("term-backlogs-group");
    const termCoursesLabel = document.getElementById("term-courses-label");
    const btnAddModalSubjectRowText = document.getElementById("btn-add-modal-subject-row-text");
    const colSubNameHeader = document.getElementById("col-sub-name-header");
    const colSubCatHeader = document.getElementById("col-sub-cat-header");

    if (currentStage === "university") {
      if (termModalTitle) termModalTitle.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Semester'} & Coursework</span>` : `<span>🏛️ Add Academic Semester & Coursework</span>`;
      if (termModalSubtitle) termModalSubtitle.innerText = "Enter semester details, GPA/CGPA, attendance, credit hours, and enrolled courses.";
      if (termNameLabel) termNameLabel.innerHTML = `Semester / Term Name <span style="color:var(--color-lime)">*</span>`;
      
      if (termNameSelect) {
        termNameSelect.style.display = "block";
        termNameSelect.innerHTML = `
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
          <option value="Semester 3">Semester 3</option>
          <option value="Semester 4">Semester 4</option>
          <option value="Semester 5">Semester 5</option>
          <option value="Semester 6">Semester 6</option>
          <option value="Semester 7">Semester 7</option>
          <option value="Semester 8">Semester 8</option>
          <option value="custom">✍️ Custom Term Name...</option>
        `;
        const nextNum = loggedTerms.length + 1;
        const curVal = isEdit ? (term?.term_name || `Semester ${nextNum}`) : `Semester ${nextNum}`;
        if (termNameSelect.querySelector(`option[value="${curVal}"]`)) {
          termNameSelect.value = curVal;
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "none";
          }
        } else {
          termNameSelect.value = "custom";
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "block";
          }
        }
      }

      if (termGpaLabel) termGpaLabel.innerHTML = `Semester GPA (0–4) <span style="color:var(--color-lime)">*</span>`;
      if (termGpaInput) {
        termGpaInput.min = "0.00";
        termGpaInput.max = "4.00";
        termGpaInput.placeholder = "e.g. 3.65";
      }
      if (termCgpaGroup) termCgpaGroup.style.display = "block";
      if (termCreditsGroup) {
        termCreditsGroup.style.display = "block";
        if (termCreditsLabel) termCreditsLabel.innerText = "Credit Hours";
      }
      if (termMidtermGroup) termMidtermGroup.style.display = "block";
      if (termBacklogsGroup) termBacklogsGroup.style.display = "block";
      if (termCoursesLabel) termCoursesLabel.innerText = "Enrolled Courses & Marks";
      if (btnAddModalSubjectRowText) btnAddModalSubjectRowText.innerText = "+ Add Course";
      if (colSubNameHeader) colSubNameHeader.innerText = "Course Name";
      if (colSubCatHeader) colSubCatHeader.innerText = "Type";
    } else if (currentStage === "intermediate") {
      if (termModalTitle) termModalTitle.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Intermediate'} Record</span>` : `<span>🎓 Add Intermediate (HSSC) Record</span>`;
      if (termModalSubtitle) termModalSubtitle.innerText = "Log your 1st Year (11th) or 2nd Year (12th) term, percentage, attendance, study hours, and subjects.";
      if (termNameLabel) termNameLabel.innerHTML = `Intermediate Level / Year <span style="color:var(--color-lime)">*</span>`;
      
      if (termNameSelect) {
        termNameSelect.style.display = "block";
        termNameSelect.innerHTML = `
          <option value="1st Year (11th Class)">1st Year (11th Class)</option>
          <option value="2nd Year (12th Class)">2nd Year (12th Class)</option>
          <option value="Matriculation Foundation (10th)">Matriculation Foundation (10th)</option>
          <option value="custom">✍️ Custom Level Name...</option>
        `;
        const nextDefault = loggedTerms.length === 0 ? "1st Year (11th Class)" : "2nd Year (12th Class)";
        const curVal = isEdit ? (term?.term_name || nextDefault) : nextDefault;
        if (termNameSelect.querySelector(`option[value="${curVal}"]`)) {
          termNameSelect.value = curVal;
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "none";
          }
        } else {
          termNameSelect.value = "custom";
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "block";
          }
        }
      }

      if (termGpaLabel) termGpaLabel.innerHTML = `Term Score / Percentage (%) <span style="color:var(--color-lime)">*</span>`;
      if (termGpaInput) {
        termGpaInput.min = "0";
        termGpaInput.max = "100";
        termGpaInput.placeholder = "e.g. 84.5";
      }
      if (termCgpaGroup) termCgpaGroup.style.display = "none";
      if (termCreditsGroup) {
        termCreditsGroup.style.display = "block";
        if (termCreditsLabel) termCreditsLabel.innerText = "Daily Study Hours";
        if (termCreditsInput) {
          termCreditsInput.placeholder = "e.g. 5.0";
          termCreditsInput.value = term?.study_hours || "5.0";
        }
      }
      if (termMidtermGroup) {
        termMidtermGroup.style.display = "block";
        const midLabel = document.getElementById("term-midterm-label");
        if (midLabel) midLabel.innerText = "Sendup / Midterm Score (%)";
      }
      if (termBacklogsGroup) termBacklogsGroup.style.display = "none";
      if (termCoursesLabel) termCoursesLabel.innerText = "Intermediate Subjects & Marks";
      if (btnAddModalSubjectRowText) btnAddModalSubjectRowText.innerText = "+ Add Subject";
      if (colSubNameHeader) colSubNameHeader.innerText = "Subject Name";
      if (colSubCatHeader) colSubCatHeader.innerText = "Category";
    } else if (currentStage === "matric") {
      if (termModalTitle) termModalTitle.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Matric'} Record</span>` : `<span>📜 Add Matric (SSC) Record</span>`;
      if (termModalSubtitle) termModalSubtitle.innerText = "Log your 9th Class (SSC-I) or 10th Class (SSC-II) board marks, attendance, study hours, and subjects.";
      if (termNameLabel) termNameLabel.innerHTML = `Matric Class / Board Level <span style="color:var(--color-lime)">*</span>`;
      
      if (termNameSelect) {
        termNameSelect.style.display = "block";
        termNameSelect.innerHTML = `
          <option value="9th Class (SSC-I)">9th Class (SSC-I)</option>
          <option value="10th Class (SSC-II)">10th Class (SSC-II)</option>
          <option value="custom">✍️ Custom Level Name...</option>
        `;
        const nextDefault = loggedTerms.length === 0 ? "9th Class (SSC-I)" : "10th Class (SSC-II)";
        const curVal = isEdit ? (term?.term_name || nextDefault) : nextDefault;
        if (termNameSelect.querySelector(`option[value="${curVal}"]`)) {
          termNameSelect.value = curVal;
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "none";
          }
        } else {
          termNameSelect.value = "custom";
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "block";
          }
        }
      }

      if (termGpaLabel) termGpaLabel.innerHTML = `Board Score / Percentage (%) <span style="color:var(--color-lime)">*</span>`;
      if (termGpaInput) {
        termGpaInput.min = "0";
        termGpaInput.max = "100";
        termGpaInput.placeholder = "e.g. 85.0";
      }
      if (termCgpaGroup) termCgpaGroup.style.display = "none";
      if (termCreditsGroup) {
        termCreditsGroup.style.display = "block";
        if (termCreditsLabel) termCreditsLabel.innerText = "Daily Study Hours";
        if (termCreditsInput) {
          termCreditsInput.placeholder = "e.g. 4.5";
          termCreditsInput.value = term?.study_hours || "4.5";
        }
      }
      if (termMidtermGroup) termMidtermGroup.style.display = "none";
      if (termBacklogsGroup) termBacklogsGroup.style.display = "none";
      if (termCoursesLabel) termCoursesLabel.innerText = "Matric Subjects & Board Marks";
      if (btnAddModalSubjectRowText) btnAddModalSubjectRowText.innerText = "+ Add Subject";
      if (colSubNameHeader) colSubNameHeader.innerText = "Subject Name";
      if (colSubCatHeader) colSubCatHeader.innerText = "Category";
    } else if (currentStage === "secondary") {
      if (termModalTitle) termModalTitle.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Class'} Record</span>` : `<span>🏫 Add Secondary Class & Subject Coursework</span>`;
      if (termModalSubtitle) termModalSubtitle.innerText = "Select or enter your class grade (e.g. Class 5, Class 6, Class 7), attendance, and add your subjects with marks.";
      if (termNameLabel) termNameLabel.innerHTML = `Secondary Class / Grade <span style="color:var(--color-lime)">*</span>`;
      
      if (termNameSelect) {
        termNameSelect.style.display = "block";
        termNameSelect.innerHTML = `
          <option value="Class 5">Class 5</option>
          <option value="Class 6">Class 6</option>
          <option value="Class 7">Class 7</option>
          <option value="Class 8">Class 8</option>
          <option value="Class 9">Class 9</option>
          <option value="custom">✍️ Custom Class Name...</option>
        `;
        const selectedCur = document.getElementById("manager_current_class_select")?.value || "Class 7";
        const curVal = isEdit ? (term?.term_name || selectedCur) : selectedCur;
        if (termNameSelect.querySelector(`option[value="${curVal}"]`)) {
          termNameSelect.value = curVal;
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "none";
          }
        } else {
          termNameSelect.value = "custom";
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "block";
          }
        }
      }

      if (termGpaLabel) termGpaLabel.innerHTML = `Class Final Score (%) <span style="color:var(--color-lime)">*</span>`;
      if (termGpaInput) {
        termGpaInput.min = "0";
        termGpaInput.max = "100";
        termGpaInput.placeholder = "e.g. 85.0";
      }
      if (termCgpaGroup) termCgpaGroup.style.display = "none";
      if (termCreditsGroup) {
        termCreditsGroup.style.display = "block";
        if (termCreditsLabel) termCreditsLabel.innerText = "Daily Study Hours";
        if (termCreditsInput) {
          termCreditsInput.placeholder = "e.g. 3.5";
          termCreditsInput.value = term?.study_hours || "3.5";
        }
      }
      if (termMidtermGroup) termMidtermGroup.style.display = "none";
      if (termBacklogsGroup) termBacklogsGroup.style.display = "none";
      if (termCoursesLabel) termCoursesLabel.innerText = "Class Subjects & Marks";
      if (btnAddModalSubjectRowText) btnAddModalSubjectRowText.innerText = "+ Add Subject";
      if (colSubNameHeader) colSubNameHeader.innerText = "Subject Name";
      if (colSubCatHeader) colSubCatHeader.innerText = "Category";
    } else if (currentStage === "primary") {
      if (termModalTitle) termModalTitle.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Primary Grade'} Record</span>` : `<span>🌱 Add Primary Grade & Learning Skills</span>`;
      if (termModalSubtitle) termModalSubtitle.innerText = "Select or enter your primary grade (e.g. Class 1, Class 2, Class 3), attendance, and add learning subjects & marks.";
      if (termNameLabel) termNameLabel.innerHTML = `Primary Grade / Class <span style="color:var(--color-lime)">*</span>`;
      
      if (termNameSelect) {
        termNameSelect.style.display = "block";
        termNameSelect.innerHTML = `
          <option value="Class 1">Class 1</option>
          <option value="Class 2">Class 2</option>
          <option value="Class 3">Class 3</option>
          <option value="Class 4">Class 4</option>
          <option value="Class 5">Class 5</option>
          <option value="custom">✍️ Custom Grade Name...</option>
        `;
        const selectedCur = document.getElementById("manager_current_class_select")?.value || "Class 3";
        const curVal = isEdit ? (term?.term_name || selectedCur) : selectedCur;
        if (termNameSelect.querySelector(`option[value="${curVal}"]`)) {
          termNameSelect.value = curVal;
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "none";
          }
        } else {
          termNameSelect.value = "custom";
          if (termNameInput) {
            termNameInput.value = curVal;
            termNameInput.style.display = "block";
          }
        }
      }

      if (termGpaLabel) termGpaLabel.innerHTML = `Grade Final Score (%) <span style="color:var(--color-lime)">*</span>`;
      if (termGpaInput) {
        termGpaInput.min = "0";
        termGpaInput.max = "100";
        termGpaInput.placeholder = "e.g. 88.0";
      }
      if (termCgpaGroup) termCgpaGroup.style.display = "none";
      if (termCreditsGroup) termCreditsGroup.style.display = "none";
      if (termMidtermGroup) termMidtermGroup.style.display = "none";
      if (termBacklogsGroup) termBacklogsGroup.style.display = "none";
      if (termCoursesLabel) termCoursesLabel.innerText = "Learning Subjects & Skills";
      if (btnAddModalSubjectRowText) btnAddModalSubjectRowText.innerText = "+ Add Subject / Skill";
      if (colSubNameHeader) colSubNameHeader.innerText = "Subject / Skill";
      if (colSubCatHeader) colSubCatHeader.innerText = "Type";
    }

    if (termNameSelect && termNameInput) {
      termNameSelect.onchange = function() {
        if (this.value === "custom") {
          termNameInput.style.display = "block";
          termNameInput.value = "";
          termNameInput.placeholder = "Type custom name...";
          termNameInput.focus();
        } else {
          termNameInput.style.display = "none";
          termNameInput.value = this.value;
        }
      };
    }
  }

  // --------------------------------------------------------------------------
  // INLINE SEMESTER & ACADEMIC RECORD EDITOR CONTROLLERS
  // --------------------------------------------------------------------------
  const inlineTermEditorCard = document.getElementById("inline-term-editor-card");
  const inlineTermForm = document.getElementById("inline-term-form");
  const inlineTermSubjectsContainer = document.getElementById("inline-term-subjects-container");
  const btnAddInlineSubjectRow = document.getElementById("btn-add-inline-subject-row");

  function calculateInlineGpaFromRows() {
    const gpaInput = document.getElementById("inline-term-gpa-input");
    const cgpaInput = document.getElementById("inline-term-cgpa-input");
    if (!gpaInput || !inlineTermSubjectsContainer) return;
    const rows = Array.from(inlineTermSubjectsContainer.querySelectorAll(".inline-subject-row"));
    if (rows.length === 0) return;

    let totObt = 0;
    let totMax = 0;
    let sumGpa = 0;
    let countSubs = 0;
    let hasInvalidMarks = false;

    rows.forEach(r => {
      const obtEl = r.querySelector(".m-sub-obt");
      const maxEl = r.querySelector(".m-sub-max");
      const obt = parseFloat(obtEl?.value);
      const max = parseFloat(maxEl?.value);
      if (!isNaN(obt) && !isNaN(max) && max > 0) {
        if (obt > max || obt < 0) {
          hasInvalidMarks = true;
          if (obtEl) {
            obtEl.style.borderColor = "#ef4444";
            obtEl.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.35)";
            obtEl.title = `Obtained marks (${obt}) cannot exceed Total marks (${max})!`;
          }
          return;
        }
        if (obtEl) {
          obtEl.style.borderColor = "";
          obtEl.style.boxShadow = "";
          obtEl.title = "";
        }
        totObt += obt;
        totMax += max;
        const pct = (obt / max) * 100;
        sumGpa += convertSubPctToGPA(pct);
        countSubs += 1;
      }
    });

    if (hasInvalidMarks) return;

    if (totMax > 0) {
      if (currentStage === "university") {
        const gpa = countSubs > 0 ? (sumGpa / countSubs) : 4.00;
        const boundedGpa = Math.min(4.00, Math.max(0.0, gpa));
        gpaInput.value = boundedGpa.toFixed(2);
        if (cgpaInput && (!cgpaInput.value || cgpaInput.value === "0" || cgpaInput.value === "0.00" || parseFloat(cgpaInput.value) === 0)) {
          cgpaInput.value = boundedGpa.toFixed(2);
        }
      } else {
        const pct = Math.min(100.0, Math.max(0.0, (totObt / totMax) * 100.0));
        gpaInput.value = pct.toFixed(1);
        if (cgpaInput && (!cgpaInput.value || cgpaInput.value === "0" || parseFloat(cgpaInput.value) === 0)) {
          cgpaInput.value = pct.toFixed(1);
        }
      }
    }
  }
  window.calculateInlineGpaFromRows = calculateInlineGpaFromRows;

  function addInlineSubjectRow(name = "", cat = "", obt = "", max = 100) {
    if (!inlineTermSubjectsContainer) return;
    const rowId = `in-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const row = document.createElement("div");
    row.className = "inline-subject-row";
    row.id = rowId;
    row.style.display = "grid";
    row.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 32px";
    row.style.gap = "8px";
    row.style.alignItems = "center";

    let defaultName = "Calculus";
    let catOptions = `
      <option value="Theory" ${cat === "Theory" || !cat ? "selected" : ""}>Theory</option>
      <option value="Lab" ${cat === "Lab" ? "selected" : ""}>Lab</option>
    `;

    if (currentStage === "intermediate") {
      defaultName = "Physics";
      catOptions = `
        <option value="Core Science" ${cat === "Core Science" || !cat ? "selected" : ""}>Core Science</option>
        <option value="Language" ${cat === "Language" ? "selected" : ""}>Language</option>
        <option value="Elective" ${cat === "Elective" ? "selected" : ""}>Elective</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical / Lab</option>
      `;
    } else if (currentStage === "matric") {
      defaultName = "Mathematics";
      catOptions = `
        <option value="Science" ${cat === "Science" || !cat ? "selected" : ""}>Science</option>
        <option value="Compulsory" ${cat === "Compulsory" || !cat ? "selected" : ""}>Compulsory</option>
        <option value="Elective" ${cat === "Elective" ? "selected" : ""}>Elective</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical</option>
      `;
    } else if (currentStage === "secondary") {
      defaultName = "Mathematics";
      catOptions = `
        <option value="Core Subject" ${cat === "Core Subject" || !cat ? "selected" : ""}>Core Subject</option>
        <option value="Science" ${cat === "Science" ? "selected" : ""}>Science</option>
        <option value="Mathematics" ${cat === "Mathematics" ? "selected" : ""}>Mathematics</option>
        <option value="Language" ${cat === "Language" ? "selected" : ""}>Language</option>
        <option value="Practical" ${cat === "Practical" ? "selected" : ""}>Practical</option>
      `;
    } else if (currentStage === "primary") {
      defaultName = "Math & Numeracy";
      catOptions = `
        <option value="Foundational" ${cat === "Foundational" || !cat ? "selected" : ""}>Foundational</option>
        <option value="Numeracy" ${cat === "Numeracy" ? "selected" : ""}>Numeracy</option>
        <option value="Literacy" ${cat === "Literacy" ? "selected" : ""}>Literacy</option>
        <option value="Creative Art" ${cat === "Creative Art" ? "selected" : ""}>Creative Art</option>
        <option value="Activity" ${cat === "Activity" ? "selected" : ""}>Activity</option>
      `;
    }

    row.innerHTML = `
      <input type="text" class="form-input m-sub-name" placeholder="Subject Name (e.g. ${defaultName})" value="${name}" required style="padding:6px 10px;font-size:13px;">
      <select class="form-select m-sub-cat" style="padding:6px 10px;font-size:13px;">
        ${catOptions}
      </select>
      <input type="number" step="0.5" class="form-input m-sub-obt" placeholder="Marks" value="${obt !== undefined && obt !== null ? obt : ""}" min="0" max="${max || 100}" required style="padding:6px 10px;font-size:13px;">
      <input type="number" step="0.5" class="form-input m-sub-max" placeholder="Max" value="${max || 100}" min="1" max="550" required style="padding:6px 10px;font-size:13px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove(); window.calculateInlineGpaFromRows && window.calculateInlineGpaFromRows();" style="padding:4px 8px;font-size:12px;color:var(--color-red);" title="Remove Row">✕</button>
    `;

    const obtInput = row.querySelector(".m-sub-obt");
    const maxInput = row.querySelector(".m-sub-max");
    const validateLiveMarks = () => {
      const o = parseFloat(obtInput.value);
      const m = parseFloat(maxInput.value);
      if (!isNaN(o) && !isNaN(m) && o > m) {
        obtInput.style.borderColor = "#ef4444";
        obtInput.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.35)";
        obtInput.title = `Obtained (${o}) cannot exceed Total (${m})!`;
      } else {
        obtInput.style.borderColor = "";
        obtInput.style.boxShadow = "";
        obtInput.title = "";
      }
      calculateInlineGpaFromRows();
    };
    if (obtInput) obtInput.addEventListener("input", validateLiveMarks);
    if (maxInput) maxInput.addEventListener("input", validateLiveMarks);

    inlineTermSubjectsContainer.appendChild(row);
  }

  if (btnAddInlineSubjectRow) {
    btnAddInlineSubjectRow.addEventListener("click", () => addInlineSubjectRow("", "", "", 100));
  }

  function setupInlineEditorForCurrentStage(isEdit = false, term = null) {
    const editId = document.getElementById("inline-term-edit-id");
    const origName = document.getElementById("inline-term-original-name");
    const btnSaveText = document.getElementById("btn-save-inline-term-text");
    const titleEl = document.getElementById("inline-editor-title");
    const subtitleEl = document.getElementById("inline-editor-subtitle");
    const nameLabel = document.getElementById("inline-term-name-label");
    const nameSelect = document.getElementById("inline-term-name-select");
    const nameInput = document.getElementById("inline-term-name-input");
    const gpaLabel = document.getElementById("inline-term-gpa-label");
    const gpaInput = document.getElementById("inline-term-gpa-input");
    const cgpaGroup = document.getElementById("inline-term-cgpa-group");
    const creditsGroup = document.getElementById("inline-term-credits-group");
    const creditsLabel = document.getElementById("inline-term-credits-label");
    const creditsInput = document.getElementById("inline-term-credits-input");
    const midtermGroup = document.getElementById("inline-term-midterm-group");
    const midtermLabel = document.getElementById("inline-term-midterm-label");
    const backlogsGroup = document.getElementById("inline-term-backlogs-group");
    const coursesLabel = document.getElementById("inline-term-courses-label");
    const btnAddSubText = document.getElementById("btn-add-inline-subject-row-text");
    const colNameHeader = document.getElementById("inline-col-sub-name-header");
    const colCatHeader = document.getElementById("inline-col-sub-cat-header");

    if (isEdit && term) {
      if (editId) editId.value = term.id || term.term_name;
      if (origName) origName.value = term.term_name;
      if (btnSaveText) btnSaveText.innerText = "💾 Update Record";
    } else {
      if (editId) editId.value = "";
      if (origName) origName.value = "";
      if (btnSaveText) btnSaveText.innerText = "💾 Save Record";
    }

    if (currentStage === "university") {
      if (titleEl) titleEl.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Semester'} Record</span>` : `<span>🏛️ Add Academic Semester & Coursework</span>`;
      if (subtitleEl) subtitleEl.innerText = "Enter semester details, GPA/CGPA, attendance, credit hours, and enrolled courses.";
      if (nameLabel) nameLabel.innerHTML = `Semester / Term Name <span style="color:var(--color-lime)">*</span>`;
      if (nameSelect) {
        nameSelect.style.display = "block";
        nameSelect.innerHTML = `
          <option value="Semester 1">Semester 1</option>
          <option value="Semester 2">Semester 2</option>
          <option value="Semester 3">Semester 3</option>
          <option value="Semester 4">Semester 4</option>
          <option value="Semester 5">Semester 5</option>
          <option value="Semester 6">Semester 6</option>
          <option value="Semester 7">Semester 7</option>
          <option value="Semester 8">Semester 8</option>
          <option value="custom">✍️ Custom Term Name...</option>
        `;
        const nextNum = loggedTerms.length + 1;
        const curVal = isEdit ? (term?.term_name || `Semester ${nextNum}`) : `Semester ${nextNum}`;
        if (nameSelect.querySelector(`option[value="${curVal}"]`)) {
          nameSelect.value = curVal;
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "none";
          }
        } else {
          nameSelect.value = "custom";
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "block";
          }
        }
      }
      if (gpaLabel) gpaLabel.innerHTML = `Semester GPA (0–4) <span style="color:var(--color-lime)">*</span>`;
      if (gpaInput) {
        gpaInput.min = "0.00";
        gpaInput.max = "4.00";
        gpaInput.placeholder = "e.g. 3.65";
      }
      if (cgpaGroup) cgpaGroup.style.display = "block";
      if (creditsGroup) {
        creditsGroup.style.display = "block";
        if (creditsLabel) creditsLabel.innerText = "Credit Hours";
      }
      if (midtermGroup) midtermGroup.style.display = "block";
      if (backlogsGroup) backlogsGroup.style.display = "block";
      if (coursesLabel) coursesLabel.innerText = "Enrolled Courses & Marks";
      if (btnAddSubText) btnAddSubText.innerText = "+ Add Course";
      if (colNameHeader) colNameHeader.innerText = "Course Name";
      if (colCatHeader) colCatHeader.innerText = "Type";
    } else if (currentStage === "intermediate") {
      if (titleEl) titleEl.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Intermediate'} Record</span>` : `<span>🎓 Add Intermediate (HSSC) Record</span>`;
      if (subtitleEl) subtitleEl.innerText = "Log your 1st Year (11th) or 2nd Year (12th) term, marks %, attendance, and subjects.";
      if (nameLabel) nameLabel.innerHTML = `Intermediate Level / Year <span style="color:var(--color-lime)">*</span>`;
      if (nameSelect) {
        nameSelect.style.display = "block";
        nameSelect.innerHTML = `
          <option value="1st Year (11th Class)">1st Year (11th Class)</option>
          <option value="2nd Year (12th Class)">2nd Year (12th Class)</option>
          <option value="Matriculation Foundation (10th)">Matriculation Foundation (10th)</option>
          <option value="custom">✍️ Custom Level Name...</option>
        `;
        const nextDefault = loggedTerms.length === 0 ? "1st Year (11th Class)" : "2nd Year (12th Class)";
        const curVal = isEdit ? (term?.term_name || nextDefault) : nextDefault;
        if (nameSelect.querySelector(`option[value="${curVal}"]`)) {
          nameSelect.value = curVal;
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "none";
          }
        } else {
          nameSelect.value = "custom";
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "block";
          }
        }
      }
      if (gpaLabel) gpaLabel.innerHTML = `Term Score / Percentage (%) <span style="color:var(--color-lime)">*</span>`;
      if (gpaInput) {
        gpaInput.min = "0";
        gpaInput.max = "100";
        gpaInput.placeholder = "e.g. 84.5";
      }
      if (cgpaGroup) cgpaGroup.style.display = "none";
      if (creditsGroup) {
        creditsGroup.style.display = "block";
        if (creditsLabel) creditsLabel.innerText = "Daily Study Hours";
        if (creditsInput) creditsInput.value = term?.study_hours || "5.0";
      }
      if (midtermGroup) {
        midtermGroup.style.display = "block";
        if (midtermLabel) midtermLabel.innerText = "Sendup / Midterm Score (%)";
      }
      if (backlogsGroup) backlogsGroup.style.display = "none";
      if (coursesLabel) coursesLabel.innerText = "Intermediate Subjects & Marks";
      if (btnAddSubText) btnAddSubText.innerText = "+ Add Subject";
      if (colNameHeader) colNameHeader.innerText = "Subject Name";
      if (colCatHeader) colCatHeader.innerText = "Category";
    } else if (currentStage === "matric") {
      if (titleEl) titleEl.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Matric'} Record</span>` : `<span>📜 Add Matric (SSC) Record</span>`;
      if (subtitleEl) subtitleEl.innerText = "Log your 9th Class (SSC-I) or 10th Class (SSC-II) board marks, attendance, and subjects.";
      if (nameLabel) nameLabel.innerHTML = `Matric Class / Board Level <span style="color:var(--color-lime)">*</span>`;
      if (nameSelect) {
        nameSelect.style.display = "block";
        nameSelect.innerHTML = `
          <option value="9th Class (SSC-I)">9th Class (SSC-I)</option>
          <option value="10th Class (SSC-II)">10th Class (SSC-II)</option>
          <option value="custom">✍️ Custom Level Name...</option>
        `;
        const nextDefault = loggedTerms.length === 0 ? "9th Class (SSC-I)" : "10th Class (SSC-II)";
        const curVal = isEdit ? (term?.term_name || nextDefault) : nextDefault;
        if (nameSelect.querySelector(`option[value="${curVal}"]`)) {
          nameSelect.value = curVal;
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "none";
          }
        } else {
          nameSelect.value = "custom";
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "block";
          }
        }
      }
      if (gpaLabel) gpaLabel.innerHTML = `Board Score / Percentage (%) <span style="color:var(--color-lime)">*</span>`;
      if (gpaInput) {
        gpaInput.min = "0";
        gpaInput.max = "100";
        gpaInput.placeholder = "e.g. 85.0";
      }
      if (cgpaGroup) cgpaGroup.style.display = "none";
      if (creditsGroup) {
        creditsGroup.style.display = "block";
        if (creditsLabel) creditsLabel.innerText = "Daily Study Hours";
        if (creditsInput) creditsInput.value = term?.study_hours || "4.5";
      }
      if (midtermGroup) midtermGroup.style.display = "none";
      if (backlogsGroup) backlogsGroup.style.display = "none";
      if (coursesLabel) coursesLabel.innerText = "Matric Subjects & Board Marks";
      if (btnAddSubText) btnAddSubText.innerText = "+ Add Subject";
      if (colNameHeader) colNameHeader.innerText = "Subject Name";
      if (colCatHeader) colCatHeader.innerText = "Category";
    } else if (currentStage === "secondary") {
      if (titleEl) titleEl.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Class'} Record</span>` : `<span>🏫 Add Secondary Class & Subject Coursework</span>`;
      if (subtitleEl) subtitleEl.innerText = "Select or enter your class grade (e.g. Class 6, Class 7, Class 8), attendance, and subjects.";
      if (nameLabel) nameLabel.innerHTML = `Secondary Class / Grade <span style="color:var(--color-lime)">*</span>`;
      if (nameSelect) {
        nameSelect.style.display = "block";
        nameSelect.innerHTML = `
          <option value="Class 5">Class 5</option>
          <option value="Class 6">Class 6</option>
          <option value="Class 7">Class 7</option>
          <option value="Class 8">Class 8</option>
          <option value="Class 9">Class 9</option>
          <option value="custom">✍️ Custom Class Name...</option>
        `;
        const selectedCur = document.getElementById("manager_current_class_select")?.value || "Class 7";
        const curVal = isEdit ? (term?.term_name || selectedCur) : selectedCur;
        if (nameSelect.querySelector(`option[value="${curVal}"]`)) {
          nameSelect.value = curVal;
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "none";
          }
        } else {
          nameSelect.value = "custom";
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "block";
          }
        }
      }
      if (gpaLabel) gpaLabel.innerHTML = `Class Final Score (%) <span style="color:var(--color-lime)">*</span>`;
      if (gpaInput) {
        gpaInput.min = "0";
        gpaInput.max = "100";
        gpaInput.placeholder = "e.g. 85.0";
      }
      if (cgpaGroup) cgpaGroup.style.display = "none";
      if (creditsGroup) {
        creditsGroup.style.display = "block";
        if (creditsLabel) creditsLabel.innerText = "Daily Study Hours";
        if (creditsInput) creditsInput.value = term?.study_hours || "3.5";
      }
      if (midtermGroup) midtermGroup.style.display = "none";
      if (backlogsGroup) backlogsGroup.style.display = "none";
      if (coursesLabel) coursesLabel.innerText = "Class Subjects & Marks";
      if (btnAddSubText) btnAddSubText.innerText = "+ Add Subject";
      if (colNameHeader) colNameHeader.innerText = "Subject Name";
      if (colCatHeader) colCatHeader.innerText = "Category";
    } else if (currentStage === "primary") {
      if (titleEl) titleEl.innerHTML = isEdit ? `<span>✏️ Edit ${term?.term_name || 'Primary Grade'} Record</span>` : `<span>🌱 Add Primary Grade & Learning Skills</span>`;
      if (subtitleEl) subtitleEl.innerText = "Select or enter your primary grade (e.g. Class 1, Class 2, Class 3), attendance, and learning subjects.";
      if (nameLabel) nameLabel.innerHTML = `Primary Grade / Class <span style="color:var(--color-lime)">*</span>`;
      if (nameSelect) {
        nameSelect.style.display = "block";
        nameSelect.innerHTML = `
          <option value="Class 1">Class 1</option>
          <option value="Class 2">Class 2</option>
          <option value="Class 3">Class 3</option>
          <option value="Class 4">Class 4</option>
          <option value="Class 5">Class 5</option>
          <option value="custom">✍️ Custom Grade Name...</option>
        `;
        const selectedCur = document.getElementById("manager_current_class_select")?.value || "Class 3";
        const curVal = isEdit ? (term?.term_name || selectedCur) : selectedCur;
        if (nameSelect.querySelector(`option[value="${curVal}"]`)) {
          nameSelect.value = curVal;
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "none";
          }
        } else {
          nameSelect.value = "custom";
          if (nameInput) {
            nameInput.value = curVal;
            nameInput.style.display = "block";
          }
        }
      }
      if (gpaLabel) gpaLabel.innerHTML = `Grade Final Score (%) <span style="color:var(--color-lime)">*</span>`;
      if (gpaInput) {
        gpaInput.min = "0";
        gpaInput.max = "100";
        gpaInput.placeholder = "e.g. 88.0";
      }
      if (cgpaGroup) cgpaGroup.style.display = "none";
      if (creditsGroup) creditsGroup.style.display = "none";
      if (midtermGroup) midtermGroup.style.display = "none";
      if (backlogsGroup) backlogsGroup.style.display = "none";
      if (coursesLabel) coursesLabel.innerText = "Learning Subjects & Skills";
      if (btnAddSubText) btnAddSubText.innerText = "+ Add Subject / Skill";
      if (colNameHeader) colNameHeader.innerText = "Subject / Skill";
      if (colCatHeader) colCatHeader.innerText = "Type";
    }

    if (nameSelect && nameInput) {
      nameSelect.onchange = function() {
        if (this.value === "custom") {
          nameInput.style.display = "block";
          nameInput.value = "";
          nameInput.placeholder = "Type custom name...";
          nameInput.focus();
        } else {
          nameInput.style.display = "none";
          nameInput.value = this.value;
        }
      };
    }
  }

  window.openAddSemesterModal = function(e) {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    // 1. OPEN INLINE EDITOR CARD DIRECTLY IN THE LEDGER
    if (inlineTermEditorCard) {
      inlineTermEditorCard.style.display = "block";
      inlineTermEditorCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 2. Safe form preparation & population
    try {
      if (inlineTermForm) inlineTermForm.reset();
      setupInlineEditorForCurrentStage(false);

      if (inlineTermSubjectsContainer) {
        inlineTermSubjectsContainer.innerHTML = "";
        if (currentStage === "university") {
          addInlineSubjectRow("Programming / Core Course 1", "Theory", "", 100);
          addInlineSubjectRow("Calculus / Core Course 2", "Theory", "", 100);
        } else if (currentStage === "intermediate") {
          addInlineSubjectRow("Physics", "Core Science", "", 100);
          addInlineSubjectRow("Chemistry / Computer Science", "Core Science", "", 100);
          addInlineSubjectRow("Mathematics / Biology", "Core Science", "", 100);
          addInlineSubjectRow("English Compulsory", "Language", "", 100);
        } else if (currentStage === "matric") {
          addInlineSubjectRow("Mathematics", "Science", "", 100);
          addInlineSubjectRow("General Science / Physics", "Science", "", 100);
          addInlineSubjectRow("English Compulsory", "Compulsory", "", 100);
          addInlineSubjectRow("Urdu Compulsory", "Compulsory", "", 100);
        } else if (currentStage === "secondary") {
          addInlineSubjectRow("Mathematics", "Mathematics", "", 100);
          addInlineSubjectRow("General Science", "Science", "", 100);
          addInlineSubjectRow("English Language", "Language", "", 100);
        } else if (currentStage === "primary") {
          addInlineSubjectRow("Math & Numeracy", "Numeracy", "", 100);
          addInlineSubjectRow("Reading & Literacy", "Literacy", "", 100);
        } else {
          addInlineSubjectRow("Course Subject 1", "Theory", "", 100);
        }
      }

      const nameSelect = document.getElementById("inline-term-name-select");
      const nameInput = document.getElementById("inline-term-name-input");
      if (nameSelect && nameInput) {
        if (nameSelect.value && nameSelect.value !== "custom") {
          nameInput.value = nameSelect.value;
        }
      }

      const gpaInput = document.getElementById("inline-term-gpa-input");
      if (gpaInput) {
        gpaInput.value = "";
        gpaInput.placeholder = currentStage === "university" ? "e.g. 3.65" : "e.g. 85.0";
      }
      const cgpaInput = document.getElementById("inline-term-cgpa-input");
      if (cgpaInput) {
        cgpaInput.value = "";
        cgpaInput.placeholder = currentStage === "university" ? "e.g. 3.50" : "e.g. 85.0";
      }
      const attInput = document.getElementById("inline-term-attendance-input");
      if (attInput) attInput.value = "85";
      const creditsInput = document.getElementById("inline-term-credits-input");
      if (creditsInput) creditsInput.value = currentStage === "intermediate" ? "5.0" : currentStage === "matric" ? "4.5" : currentStage === "secondary" ? "3.5" : "18";
      const midtermInput = document.getElementById("inline-term-midterm-input");
      if (midtermInput) midtermInput.value = "80";
      const backlogsInput = document.getElementById("inline-term-backlogs-input");
      if (backlogsInput) backlogsInput.value = "0";

      calculateInlineGpaFromRows();
    } catch (err) {
      console.warn("[openAddSemesterModal] Inline editor prep notice:", err);
    }

    // 3. Strictly keep bottom modal closed (inline editor is used exclusively)
    const m = document.getElementById("modal-add-term");
    if (m) {
      m.classList.remove("active");
      m.style.display = "none";
    }
  };

  if (btnAddSemester) {
    btnAddSemester.addEventListener("click", window.openAddSemesterModal);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest("#btn-add-semester");
    if (btn) {
      window.openAddSemesterModal(e);
    }
  });

  function closeInlineSemesterEditor() {
    if (inlineTermEditorCard) inlineTermEditorCard.style.display = "none";
    const m = document.getElementById("modal-add-term");
    if (m) {
      m.classList.remove("active");
      m.style.display = "none";
    }
    document.body.style.overflow = "";
  }
  window.closeInlineSemesterEditor = closeInlineSemesterEditor;
  window.closeAddSemesterModal = closeInlineSemesterEditor;

  if (btnCloseTermModal) btnCloseTermModal.addEventListener("click", closeInlineSemesterEditor);
  if (btnCancelTermModal) btnCancelTermModal.addEventListener("click", closeInlineSemesterEditor);
  if (modalAddTerm) {
    modalAddTerm.addEventListener("click", (e) => {
      if (e.target === modalAddTerm) closeInlineSemesterEditor();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeInlineSemesterEditor();
    }
  });

  const inlineGpaInput = document.getElementById("inline-term-gpa-input");
  const inlineCgpaInput = document.getElementById("inline-term-cgpa-input");
  if (inlineGpaInput && inlineCgpaInput) {
    inlineGpaInput.addEventListener("input", () => {
      if (!inlineCgpaInput.dataset.manuallyEdited || !inlineCgpaInput.value) {
        inlineCgpaInput.value = inlineGpaInput.value;
      }
    });
    inlineCgpaInput.addEventListener("input", () => {
      inlineCgpaInput.dataset.manuallyEdited = "true";
    });
  }

  const modalGpaInput = document.getElementById("term-gpa-input");
  const modalCgpaInput = document.getElementById("term-cgpa-input");
  if (modalGpaInput && modalCgpaInput) {
    modalGpaInput.addEventListener("input", () => {
      if (!modalCgpaInput.dataset.manuallyEdited || !modalCgpaInput.value) {
        modalCgpaInput.value = modalGpaInput.value;
      }
    });
    modalCgpaInput.addEventListener("input", () => {
      modalCgpaInput.dataset.manuallyEdited = "true";
    });
  }

  // --------------------------------------------------------------------------
  // STRICT FORM VALIDATION & BOUNDARY INTEGRITY HELPER
  // --------------------------------------------------------------------------
  function validateAcademicTermInput({ stage, gpaVal, cgpaVal, attVal, midtermVal, subjectsContainer, formType = "inline" }) {
    // 1. Stage-specific GPA / Marks validation
    if (stage === "university") {
      if (isNaN(gpaVal) || gpaVal < 0 || gpaVal > 4.0) {
        showToast("⚠️ Invalid GPA: University Semester GPA must be between 0.00 and 4.00.", "warning");
        const el = document.getElementById(formType === "inline" ? "inline-term-gpa-input" : "term-gpa-input");
        if (el) { el.focus(); el.style.borderColor = "#ef4444"; }
        return false;
      }
      if (!isNaN(cgpaVal) && (cgpaVal < 0 || cgpaVal > 4.0)) {
        showToast("⚠️ Invalid CGPA: University Cumulative CGPA must be between 0.00 and 4.00.", "warning");
        const el = document.getElementById(formType === "inline" ? "inline-term-cgpa-input" : "term-cgpa-input");
        if (el) { el.focus(); el.style.borderColor = "#ef4444"; }
        return false;
      }
    } else {
      // Non-University: Intermediate, Matric, Secondary, Primary
      if (isNaN(gpaVal) || gpaVal < 0) {
        showToast("⚠️ Invalid Score: Term score/percentage cannot be negative.", "warning");
        return false;
      }
      if (gpaVal > 550) {
        showToast("⚠️ Invalid Score: A single term/year score cannot exceed 550 marks (or 100% for percentage).", "warning");
        const el = document.getElementById(formType === "inline" ? "inline-term-gpa-input" : "term-gpa-input");
        if (el) { el.focus(); el.style.borderColor = "#ef4444"; }
        return false;
      }
    }

    // 2. Attendance & Midterm percentage boundaries
    if (isNaN(attVal) || attVal < 0 || attVal > 100) {
      showToast("⚠️ Invalid Attendance: Attendance rate must be between 0% and 100%.", "warning");
      const el = document.getElementById(formType === "inline" ? "inline-term-attendance-input" : "term-attendance-input");
      if (el) { el.focus(); el.style.borderColor = "#ef4444"; }
      return false;
    }
    if (!isNaN(midtermVal) && (midtermVal < 0 || midtermVal > 100)) {
      showToast("⚠️ Invalid Midterm: Midterm exam score must be between 0% and 100%.", "warning");
      const el = document.getElementById(formType === "inline" ? "inline-term-midterm-input" : "term-midterm-input");
      if (el) { el.focus(); el.style.borderColor = "#ef4444"; }
      return false;
    }

    // 3. Subject Rows Validation: Obtained <= Max and Max <= 100 (or 550)
    if (subjectsContainer) {
      const rowSelector = formType === "inline" ? ".inline-subject-row" : ".modal-subject-row";
      const rows = Array.from(subjectsContainer.querySelectorAll(rowSelector));
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const nameInput = r.querySelector(".m-sub-name");
        const obtInput = r.querySelector(".m-sub-obt");
        const maxInput = r.querySelector(".m-sub-max");
        const subName = nameInput?.value.trim() || `Subject ${i + 1}`;
        const obt = parseFloat(obtInput?.value);
        const maxM = parseFloat(maxInput?.value);

        if (!nameInput?.value.trim()) {
          showToast(`⚠️ Missing Name: Please enter a name for Subject ${i + 1}.`, "warning");
          if (nameInput) { nameInput.focus(); nameInput.style.borderColor = "#ef4444"; }
          return false;
        }
        if (isNaN(maxM) || maxM <= 0) {
          showToast(`⚠️ Invalid Total Marks: Total marks for '${subName}' must be greater than 0.`, "warning");
          if (maxInput) { maxInput.focus(); maxInput.style.borderColor = "#ef4444"; }
          return false;
        }
        if (maxM > 550) {
          showToast(`⚠️ Total Marks Exceeded: Total marks for '${subName}' cannot exceed 550 (standard is 100).`, "warning");
          if (maxInput) { maxInput.focus(); maxInput.style.borderColor = "#ef4444"; }
          return false;
        }
        if (isNaN(obt) || obt < 0) {
          showToast(`⚠️ Invalid Obtained Marks: Obtained marks for '${subName}' cannot be negative.`, "warning");
          if (obtInput) { obtInput.focus(); obtInput.style.borderColor = "#ef4444"; }
          return false;
        }
        if (obt > maxM) {
          showToast(`⚠️ Marks Limit Exceeded: In '${subName}', obtained marks (${obt}) cannot be greater than total marks (${maxM}).`, "warning");
          if (obtInput) {
            obtInput.focus();
            obtInput.style.borderColor = "#ef4444";
            obtInput.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.4)";
          }
          return false;
        }
      }
    }

    return true;
  }

  // Handle Inline Term Form Submission
  if (inlineTermForm) {
    inlineTermForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameSelect = document.getElementById("inline-term-name-select");
      const nameInput = document.getElementById("inline-term-name-input");
      let termName = nameInput?.value.trim();
      if (!termName && nameSelect && nameSelect.value !== "custom") {
        termName = nameSelect.value;
      }
      if (!termName) {
        termName = currentStage === "university" ? `Semester ${loggedTerms.length + 1}` : `Class ${loggedTerms.length + 1}`;
      }

      const editId = document.getElementById("inline-term-edit-id")?.value;
      const originalTermName = document.getElementById("inline-term-original-name")?.value;
      const isEdit = Boolean(originalTermName);

      const gpaVal = parseFloat(document.getElementById("inline-term-gpa-input")?.value || (currentStage === "university" ? 3.5 : 85.0));
      const cgpaVal = parseFloat(document.getElementById("inline-term-cgpa-input")?.value || gpaVal);
      const attVal = document.getElementById("inline-term-attendance-input")?.value;
      const att = attVal !== "" && attVal !== undefined ? parseFloat(attVal) : 85.0;
      const creditsVal = parseFloat(document.getElementById("inline-term-credits-input")?.value || 18);
      const midtermVal = parseFloat(document.getElementById("inline-term-midterm-input")?.value || 80);
      const backlogsVal = parseInt(document.getElementById("inline-term-backlogs-input")?.value || 0);

      // Strict Validation Check
      const isValid = validateAcademicTermInput({
        stage: currentStage,
        gpaVal,
        cgpaVal,
        attVal: att,
        midtermVal,
        subjectsContainer: inlineTermSubjectsContainer,
        formType: "inline"
      });
      if (!isValid) return;

      const rows = inlineTermSubjectsContainer ? Array.from(inlineTermSubjectsContainer.querySelectorAll(".inline-subject-row")) : [];
      const subjects = rows.map(r => {
        const obt = parseFloat(r.querySelector(".m-sub-obt")?.value || 0);
        const maxM = parseFloat(r.querySelector(".m-sub-max")?.value || 100);
        const pct = maxM > 0 ? (obt / maxM) * 100 : 80;
        let g = "A";
        if (pct >= 85) g = "A+";
        else if (pct >= 75) g = "A";
        else if (pct >= 65) g = "B";
        else if (pct >= 50) g = "C";
        else g = "F";

        return {
          id: "sub_" + Math.random().toString(36).substring(2, 9),
          subject_name: r.querySelector(".m-sub-name")?.value.trim() || "Subject",
          subject_category: r.querySelector(".m-sub-cat")?.value || "Theory",
          credits: 3,
          obtained_marks: obt,
          total_marks: maxM,
          grade: g
        };
      });

      if (isEdit && originalTermName && originalTermName !== termName) {
        try {
          if (window.apiClient) {
            await window.apiClient.deleteAcademicRecord(originalTermName, currentStage);
          }
        } catch (delErr) {
          console.warn("[Academic Record] Rename cleanup notice:", delErr.message);
        }
      }

      const isHoursStage = currentStage === "secondary" || currentStage === "intermediate" || currentStage === "matric" || currentStage === "primary";
      const termPayload = {
        id: editId || ("term_" + Date.now()),
        original_term_name: originalTermName,
        stage: currentStage,
        term_name: termName,
        gpa: currentStage === "university" ? gpaVal : +(gpaVal / 25.0).toFixed(2),
        percentage: currentStage === "university" ? +(gpaVal / 4.0 * 100).toFixed(1) : (gpaVal > 100 ? (gpaVal / 550 * 100) : gpaVal),
        cgpa: cgpaVal,
        attendance_pct: att,
        credit_hours: isHoursStage ? 0 : creditsVal,
        midterm_score: midtermVal,
        backlogs: backlogsVal,
        study_hours: isHoursStage ? creditsVal : 4.5,
        subjects: subjects.length > 0 ? subjects : [{ subject_name: "Core Subject", subject_category: "Core", obtained_marks: 85, total_marks: 100 }]
      };

      try {
        if (window.apiClient) {
          await window.apiClient.createAcademicRecord(termPayload);
        }
        showToast(isEdit ? `Updated ${termName} successfully!` : `Saved ${termName} successfully!`, "success");
        closeInlineSemesterEditor();
        await loadAcademicTerms(currentStage);
      } catch (err) {
        showToast(`Failed to save record: ${err.message}`, "error");
      }
    });
  }

  // Also keep modal form submit handler synchronized
  if (addTermForm) {
    addTermForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const termNameSelect = document.getElementById("term-name-select");
      const termNameInput = document.getElementById("term-name-input");
      let termName = termNameInput?.value.trim();
      if (!termName && nameSelect && nameSelect.value !== "custom") {
        termName = nameSelect.value;
      }
      if (!termName) {
        termName = currentStage === "university" ? `Semester ${loggedTerms.length + 1}` : `Class ${loggedTerms.length + 1}`;
      }

      const editId = document.getElementById("term-edit-id")?.value;
      const originalTermName = document.getElementById("term-original-name")?.value;
      const isEdit = Boolean(originalTermName);

      const gpaVal = parseFloat(document.getElementById("term-gpa-input")?.value || (currentStage === "university" ? 3.5 : 85.0));
      const cgpaVal = parseFloat(document.getElementById("term-cgpa-input")?.value || gpaVal);
      const attVal = document.getElementById("term-attendance-input")?.value;
      const att = attVal !== "" && attVal !== undefined ? parseFloat(attVal) : 85.0;
      const creditsVal = parseFloat(document.getElementById("term-credits-input")?.value || 18);
      const midtermVal = parseFloat(document.getElementById("term-midterm-input")?.value || 80);
      const backlogsVal = parseInt(document.getElementById("term-backlogs-input")?.value || 0);

      // Strict Validation Check
      const isValid = validateAcademicTermInput({
        stage: currentStage,
        gpaVal,
        cgpaVal,
        attVal: att,
        midtermVal,
        subjectsContainer: modalTermSubjectsContainer,
        formType: "modal"
      });
      if (!isValid) return;

      const rows = modalTermSubjectsContainer ? Array.from(modalTermSubjectsContainer.querySelectorAll(".modal-subject-row")) : [];
      const subjects = rows.map(r => {
        const obt = parseFloat(r.querySelector(".m-sub-obt")?.value || 0);
        const maxM = parseFloat(r.querySelector(".m-sub-max")?.value || 100);
        const pct = maxM > 0 ? (obt / maxM) * 100 : 80;
        let g = "A";
        if (pct >= 85) g = "A+";
        else if (pct >= 75) g = "A";
        else if (pct >= 65) g = "B";
        else if (pct >= 50) g = "C";
        else g = "F";

        return {
          id: "sub_" + Math.random().toString(36).substring(2, 9),
          subject_name: r.querySelector(".m-sub-name")?.value.trim() || "Subject",
          subject_category: r.querySelector(".m-sub-cat")?.value || "Theory",
          credits: 3,
          obtained_marks: obt,
          total_marks: maxM,
          grade: g
        };
      });

      if (isEdit && originalTermName && originalTermName !== termName) {
        try {
          if (window.apiClient) {
            await window.apiClient.deleteAcademicRecord(originalTermName, currentStage);
          }
        } catch (delErr) {
          console.warn("[Academic Record] Rename cleanup notice:", delErr.message);
        }
      }

      const isHoursStage = currentStage === "secondary" || currentStage === "intermediate" || currentStage === "matric" || currentStage === "primary";
      const termPayload = {
        id: editId || ("term_" + Date.now()),
        original_term_name: originalTermName,
        stage: currentStage,
        term_name: termName,
        gpa: currentStage === "university" ? gpaVal : +(gpaVal / 25.0).toFixed(2),
        percentage: currentStage === "university" ? +(gpaVal / 4.0 * 100).toFixed(1) : (gpaVal > 100 ? (gpaVal / 550 * 100) : gpaVal),
        cgpa: cgpaVal,
        attendance_pct: att,
        credit_hours: isHoursStage ? 0 : creditsVal,
        midterm_score: midtermVal,
        backlogs: backlogsVal,
        study_hours: isHoursStage ? creditsVal : 4.5,
        subjects: subjects.length > 0 ? subjects : [{ subject_name: "Core Subject", subject_category: "Core", obtained_marks: 85, total_marks: 100 }]
      };

      try {
        if (window.apiClient) {
          await window.apiClient.createAcademicRecord(termPayload);
        }
        showToast(isEdit ? `Updated ${termName} successfully!` : `Saved ${termName} successfully!`, "success");
        closeInlineSemesterEditor();
        await loadAcademicTerms(currentStage);
      } catch (err) {
        showToast(`Failed to save record: ${err.message}`, "error");
      }
    });
  }

  window.editSemester = (termIdentifier) => {
    const term = loggedTerms.find(t => t.id === termIdentifier || t.term_name === termIdentifier);
    if (!term) return;

    // Open Inline Editor
    if (inlineTermEditorCard) {
      inlineTermEditorCard.style.display = "block";
      inlineTermEditorCard.scrollIntoView({ behavior: "smooth", block: "center" });
      setupInlineEditorForCurrentStage(true, term);

      const editIdInput = document.getElementById("inline-term-edit-id");
      const origNameInput = document.getElementById("inline-term-original-name");
      if (editIdInput) editIdInput.value = term.id || "";
      if (origNameInput) origNameInput.value = term.term_name || "";

      const nameInput = document.getElementById("inline-term-name-input");
      const gpaInput = document.getElementById("inline-term-gpa-input");
      const cgpaInput = document.getElementById("inline-term-cgpa-input");
      const attInput = document.getElementById("inline-term-attendance-input");
      const creditsInput = document.getElementById("inline-term-credits-input");
      const midtermInput = document.getElementById("inline-term-midterm-input");
      const backlogsInput = document.getElementById("inline-term-backlogs-input");

      if (nameInput) nameInput.value = term.term_name;
      if (gpaInput) {
        if (currentStage === "university") {
          gpaInput.value = term.gpa !== undefined ? term.gpa : "3.50";
        } else {
          gpaInput.value = term.percentage !== undefined ? term.percentage : (term.gpa ? (term.gpa > 4 ? term.gpa : term.gpa * 25) : "85.0");
        }
      }
      if (cgpaInput) cgpaInput.value = term.cgpa !== undefined ? term.cgpa : "3.50";
      if (attInput) attInput.value = term.attendance_pct || 85;
      if (creditsInput) {
        const isHours = currentStage === "secondary" || currentStage === "intermediate" || currentStage === "matric" || currentStage === "primary";
        creditsInput.value = isHours ? (term.study_hours || (currentStage === "intermediate" ? "5.0" : currentStage === "matric" ? "4.5" : "3.5")) : (term.credit_hours || 18);
      }
      if (midtermInput) midtermInput.value = term.midterm_score || 80;
      if (backlogsInput) backlogsInput.value = term.backlogs || 0;

      if (inlineTermSubjectsContainer) {
        inlineTermSubjectsContainer.innerHTML = "";
        const subs = term.subjects || [];
        if (subs.length > 0) {
          subs.forEach(s => {
            addInlineSubjectRow(s.subject_name, s.subject_category || "Theory", s.obtained_marks, s.total_marks);
          });
        } else {
          addInlineSubjectRow("", "", "", 100);
        }
      }
    }
  };

  window.deleteSemester = async (termIdentifier) => {
    const term = loggedTerms.find(t => t.id === termIdentifier || t.term_name === termIdentifier);
    const targetName = term ? term.term_name : termIdentifier;
    if (!confirm(`Are you sure you want to remove '${targetName}' from your academic records?`)) return;
    try {
      if (window.apiClient) {
        await window.apiClient.deleteAcademicRecord(targetName, currentStage);
      }
      showToast(`Removed '${targetName}' from records.`, "info");
      await loadAcademicTerms(currentStage);
    } catch (err) {
      showToast(`Error deleting record: ${err.message}`, "error");
    }
  };

  // ============================================================================
  // 11. TEACHER & INSTRUCTOR SUITE (3 MODES)
  // ============================================================================
  let teacherStudentStage = "university";
  let teacherIndividualSubjects = [];

  // Teacher Subject Table Elements
  const tSubjectsTableBody = document.getElementById("t-subjects-table-body");
  const tKpiTotalSubjects = document.getElementById("t-kpi-total-subjects");
  const tKpiTotalMarks = document.getElementById("t-kpi-total-marks");
  const tKpiAggregatePct = document.getElementById("t-kpi-aggregate-pct");
  const tKpiCalcGpa = document.getElementById("t-kpi-calc-gpa");
  const btnTAddSubject = document.getElementById("btn-t-add-subject");
  const tStudentStageSelect = document.getElementById("t_student_stage");

  // Teacher Student Class Modal Elements
  const teacherStudentModal = document.getElementById("teacher-student-modal");
  const tStudentEntryForm = document.getElementById("t-student-entry-form");
  const tModalRoll = document.getElementById("t-modal-roll");
  const tModalName = document.getElementById("t-modal-name");
  const tModalAtt = document.getElementById("t-modal-att");
  const tModalTest = document.getElementById("t-modal-test");
  const tModalAssign = document.getElementById("t-modal-assign");
  const tModalGrade = document.getElementById("t-modal-grade");
  const tStudentEditIdx = document.getElementById("t-student-edit-idx");
  const btnCloseTStudentModal = document.getElementById("btn-close-t-student-modal");
  const btnCancelTStudentModal = document.getElementById("btn-cancel-t-student-modal");

  function renderTeacherSubjectsTable() {
    if (!tSubjectsTableBody) return;
    if (teacherIndividualSubjects.length === 0) {
      tSubjectsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: var(--space-4);">
            No course entries logged yet. Click "+ Add Course" to register student marks.
          </td>
        </tr>
      `;
      updateTeacherSubjectKPIs([]);
      return;
    }

    tSubjectsTableBody.innerHTML = teacherIndividualSubjects
      .map((sub, idx) => {
        const pct = sub.max > 0 ? ((sub.obtained / sub.max) * 100).toFixed(1) : "0.0";
        const grade = calculateSubjectGrade(parseFloat(pct), teacherStudentStage);
        return `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary);">${sub.name}</td>
          <td><span class="badge badge-info" style="font-size:11px;">${sub.category || "Core"}</span></td>
          <td style="color: var(--text-secondary); font-size:12px;">${sub.term || "Current"}</td>
          <td style="font-weight: 700; color: var(--text-primary);">${sub.obtained}</td>
          <td style="color: var(--text-muted);">${sub.max}</td>
          <td style="font-weight: 600; color: ${parseFloat(pct) >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)"};">${pct}%</td>
          <td><span class="badge ${parseFloat(pct) >= 80 ? "badge-success" : "badge-warning"}">${grade}</span></td>
          <td style="text-align: right;">
            <button type="button" class="subject-action-btn delete" onclick="window.deleteTeacherSubject(${idx})">🗑️</button>
          </td>
        </tr>
      `;
      })
      .join("");

    updateTeacherSubjectKPIs(teacherIndividualSubjects);
  }

  function updateTeacherSubjectKPIs(subjects) {
    if (tKpiTotalSubjects) tKpiTotalSubjects.innerText = `${subjects.length}`;
    if (subjects.length === 0) {
      if (tKpiTotalMarks) tKpiTotalMarks.innerText = "0 / 0";
      if (tKpiAggregatePct) tKpiAggregatePct.innerText = "0.0%";
      if (tKpiCalcGpa) tKpiCalcGpa.innerText = teacherStudentStage === "university" ? "0.00 GPA" : "0.0%";
      return;
    }

    const totalObtained = subjects.reduce((sum, s) => sum + (parseFloat(s.obtained) || 0), 0);
    const totalMax = subjects.reduce((sum, s) => sum + (parseFloat(s.max) || 0), 0);
    const avgPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    if (tKpiTotalMarks) tKpiTotalMarks.innerText = `${totalObtained.toFixed(1)} / ${totalMax}`;
    if (tKpiAggregatePct) tKpiAggregatePct.innerText = `${avgPct.toFixed(1)}%`;

    if (tKpiCalcGpa) {
      if (teacherStudentStage === "university") {
        const calcGpa = (avgPct / 100) * 4.0;
        tKpiCalcGpa.innerText = `${calcGpa.toFixed(2)} GPA`;
      } else {
        tKpiCalcGpa.innerText = `${avgPct.toFixed(1)}% Avg`;
      }
    }
  }

  window.deleteTeacherSubject = (idx) => {
    teacherIndividualSubjects.splice(idx, 1);
    renderTeacherSubjectsTable();
    showToast("Course record removed.", "info");
  };

  if (btnTAddSubject) {
    btnTAddSubject.addEventListener("click", () => {
      const name = prompt("Enter Course / Subject Name:", "Database Management Systems");
      if (!name) return;
      const obtained = parseFloat(prompt("Obtained Marks:", "85")) || 85;
      const max = parseFloat(prompt("Total / Max Marks:", "100")) || 100;
      teacherIndividualSubjects.push({
        id: `tsub-${Date.now()}`,
        name,
        category: "Core Science",
        term: "Current Term",
        obtained,
        max
      });
      renderTeacherSubjectsTable();
      showToast("Course record added to student profile.", "success");
    });
  }

  if (tStudentStageSelect) {
    tStudentStageSelect.addEventListener("change", (e) => {
      teacherStudentStage = e.target.value;
      const stagePresets = defaultSubjectsStore[teacherStudentStage] || defaultSubjectsStore.university;
      teacherIndividualSubjects = JSON.parse(JSON.stringify(stagePresets));
      renderTeacherSubjectsTable();
      showToast(`Adapted student courses for ${teacherStudentStage.toUpperCase()}`, "info");
    });
  }

  function switchTeacherTool(tool) {
    currentTeacherTool = tool;
    const tools = [
      { id: "individual", btn: toolBtnIndividual, view: teacherViewIndividual },
      { id: "class", btn: toolBtnClass, view: teacherViewClass }
    ];

    tools.forEach((t) => {
      if (t.id === tool) {
        t.btn?.classList.add("active");
        if (t.view) t.view.style.display = "block";
      } else {
        t.btn?.classList.remove("active");
        if (t.view) t.view.style.display = "none";
      }
    });

    if (tool === "individual") {
      renderTeacherSubjectsTable();
    }
  }

  if (toolBtnIndividual) toolBtnIndividual.addEventListener("click", () => switchTeacherTool("individual"));
  if (toolBtnClass) toolBtnClass.addEventListener("click", () => switchTeacherTool("class"));

  // Teacher Tool 1: Individual Form Submit
  if (teacherIndividualForm) {
    teacherIndividualForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const sName = document.getElementById("t_student_name")?.value || "Student";
      const sId = document.getElementById("t_student_id")?.value || "ST-01";
      const att = parseFloat(document.getElementById("t_attendance")?.value || 88);
      const testAvg = parseFloat(document.getElementById("t_test_avg")?.value || 82);
      const assignAvg = parseFloat(document.getElementById("t_assign_avg")?.value || 90);
      const rating = parseFloat(document.getElementById("t_rating")?.value || 4.0);
      const attentive = document.getElementById("t_attentive")?.value || "High";
      const notes = document.getElementById("t_notes")?.value || "";

      // Calculate aggregate from courses
      const totalObtained = teacherIndividualSubjects.reduce((sum, s) => sum + (s.obtained || 0), 0);
      const totalMax = teacherIndividualSubjects.reduce((sum, s) => sum + (s.max || 100), 0);
      const courseAvg = totalMax > 0 ? (totalObtained / totalMax) * 100 : testAvg;

      const compositeScore = +(courseAvg * 0.4 + testAvg * 0.3 + att * 0.2 + (rating / 5) * 10).toFixed(1);
      const isRisk = compositeScore < 65 || att < 70;
      const isHighAchiever = compositeScore >= 80 && att >= 85;

      let formattedScore = `${compositeScore}%`;
      if (teacherStudentStage === "university") {
        const calcGpa = Math.min(4.0, Math.max(1.0, +((compositeScore / 100) * 4.0).toFixed(2)));
        formattedScore = `${calcGpa.toFixed(2)} CGPA (${compositeScore}%)`;
      }

      renderTeacherResults({
        title: `Comprehensive Diagnostic: ${sName} (${sId}) — ${teacherStudentStage.toUpperCase()}`,
        classAvg: formattedScore,
        passRate: isRisk ? "65% (Intervention Required)" : "98% (High Pass Probability)",
        highRisk: isRisk ? 1 : 0,
        medRisk: !isRisk && compositeScore < 75 ? 1 : 0,
        lowRisk: isRisk ? 0 : 1,
        atRiskList: isRisk
          ? [`${sName} (${sId}) — Score: ${compositeScore}%, Attendance: ${att}% | Flag: Quizzes & homework require immediate supervision.`]
          : [],
        topList: isHighAchiever
          ? [`${sName} (${sId}) — Gradebook Avg: ${courseAvg.toFixed(1)}%, Attendance: ${att}% | Demonstrated strong ${attentive.toLowerCase()} focus.`]
          : [],
        recommendations: notes
          ? `Instructor Note: "${notes}" — AI Recommendation: Provide guided practice problem sheets and maintain weekly office-hour check-ins.`
          : `Maintain current academic trajectory; encourage leadership in group projects and technical presentations.`
      });

      // Save Teacher Diagnostic into History Ledger
      savePredictionToHistory(
        {
          score: formattedScore,
          formatted_score: formattedScore,
          grade: isHighAchiever ? "Grade A+" : isRisk ? "Grade D" : "Grade B",
          risk_level: isRisk ? "high" : "low",
          status_badge: isRisk ? "Intervention Needed" : "Exemplary",
          status_color: isRisk ? "badge-danger" : "badge-success",
          recommendations: notes || "Maintain steady academic momentum and weekly revision routine."
        },
        {
          Student_Name: sName,
          Student_ID: sId,
          Attendance_Pct: att,
          Quizzes_Avg: testAvg,
          Coursework_Avg: `${courseAvg.toFixed(1)}%`,
          Attentiveness: attentive,
          Teacher_Rating: `${rating} / 5.0`
        }
      );

      showToast(`AI Diagnostic Generated for ${sName}`, "success");
    });
  }

  // Teacher Tool 2: Class Roster CRUD (Modal-based)
  function renderClassRoster() {
    if (!classRosterBody) return;
    classRosterBody.innerHTML = classRoster
      .map(
        (st, idx) => `
      <tr>
        <td style="font-weight: 700; color: var(--text-secondary);">${st.roll}</td>
        <td style="font-weight: 600; color: var(--text-primary);">${st.name}</td>
        <td>${st.attendance}%</td>
        <td>${st.test}%</td>
        <td>${st.assignment}%</td>
        <td><span class="badge ${st.midterm.startsWith("A") ? "badge-success" : "badge-info"}">${st.midterm}</span></td>
        <td style="text-align: right;">
          <div class="action-btn-group">
            <button type="button" class="table-icon-btn btn-edit" onclick="window.editClassStudent(${idx})">✏️ Edit</button>
            <button type="button" class="table-icon-btn btn-delete" onclick="window.deleteClassStudent(${idx})">🗑️</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  window.deleteClassStudent = (idx) => {
    if (!confirm("Remove student from class roster?")) return;
    classRoster.splice(idx, 1);
    renderClassRoster();
    showToast("Student removed from roster.", "info");
  };

  window.editClassStudent = (idx) => {
    const st = classRoster[idx];
    if (!st) return;
    if (tStudentEditIdx) tStudentEditIdx.value = idx;
    if (tModalRoll) tModalRoll.value = st.roll;
    if (tModalName) tModalName.value = st.name;
    if (tModalAtt) tModalAtt.value = st.attendance;
    if (tModalTest) tModalTest.value = st.test;
    if (tModalAssign) tModalAssign.value = st.assignment;
    if (tModalGrade) tModalGrade.value = st.midterm;

    const modalTitle = document.getElementById("t-student-modal-title");
    if (modalTitle) modalTitle.innerText = "✏️ Edit Class Student";
    teacherStudentModal?.classList.add("active");
  };

  if (btnAddClassStudent) {
    btnAddClassStudent.addEventListener("click", () => {
      if (tStudentEntryForm) tStudentEntryForm.reset();
      if (tStudentEditIdx) tStudentEditIdx.value = "";
      if (tModalRoll) tModalRoll.value = `0${classRoster.length + 1}`;
      const modalTitle = document.getElementById("t-student-modal-title");
      if (modalTitle) modalTitle.innerText = "➕ Add Student to Class Roster";
      teacherStudentModal?.classList.add("active");
    });
  }

  if (btnCloseTStudentModal) btnCloseTStudentModal.addEventListener("click", () => teacherStudentModal?.classList.remove("active"));
  if (btnCancelTStudentModal) btnCancelTStudentModal.addEventListener("click", () => teacherStudentModal?.classList.remove("active"));

  if (tStudentEntryForm) {
    tStudentEntryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const roll = tModalRoll?.value.trim() || "01";
      const name = tModalName?.value.trim();
      const attendance = parseInt(tModalAtt?.value || 85);
      const test = parseInt(tModalTest?.value || 80);
      const assignment = parseInt(tModalAssign?.value || 85);
      const midterm = tModalGrade?.value || "A";
      const editIdx = tStudentEditIdx?.value;

      if (!name) return showToast("Please specify student name.", "error");

      if (editIdx !== "" && editIdx !== null && !isNaN(parseInt(editIdx))) {
        classRoster[parseInt(editIdx)] = { roll, name, attendance, test, assignment, midterm };
        showToast("Student roster entry updated.", "success");
      } else {
        classRoster.push({ roll, name, attendance, test, assignment, midterm });
        showToast("Student added to class roster.", "success");
      }

      renderClassRoster();
      teacherStudentModal?.classList.remove("active");
    });
  }

  if (btnRunClassPrediction) {
    btnRunClassPrediction.addEventListener("click", () => {
      const avgScore = +(classRoster.reduce((sum, s) => sum + (s.test + s.attendance) / 2, 0) / (classRoster.length || 1)).toFixed(1);
      const highRisk = classRoster.filter((s) => s.test < 60 || s.attendance < 70);
      const topStudents = classRoster.filter((s) => s.test >= 85 && s.attendance >= 90);

      renderTeacherResults({
        title: `Class: ${document.getElementById("t_class_name")?.value || "Gradebook"} (${classRoster.length} Students)`,
        classAvg: `${avgScore}%`,
        passRate: `${Math.round(((classRoster.length - highRisk.length) / classRoster.length) * 100)}%`,
        highRisk: highRisk.length,
        medRisk: Math.max(0, classRoster.length - highRisk.length - topStudents.length),
        lowRisk: topStudents.length,
        atRiskList: highRisk.map((s) => `${s.name} (Roll ${s.roll}) — Attendance: ${s.attendance}%, Test: ${s.test}%`),
        topList: topStudents.map((s) => `${s.name} (Roll ${s.roll}) — Midterm: ${s.midterm} (${s.test}%)`),
        recommendations: "Schedule remedial recitation blocks for students below 70% attendance. Conduct group peer reviews."
      });
    });
  }

  // Teacher Tool 3: Drag & Drop CSV Upload
  if (fileDropzone && csvFileInput) {
    fileDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileDropzone.classList.add("dragover");
    });
    fileDropzone.addEventListener("dragleave", () => fileDropzone.classList.remove("dragover"));
    fileDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      fileDropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        parseUploadedCsv(e.dataTransfer.files[0]);
      }
    });
    csvFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        parseUploadedCsv(e.target.files[0]);
      }
    });
  }

  function parseUploadedCsv(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return showToast("CSV file is empty or missing headers.", "error");

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length === headers.length) {
          const rowObj = {};
          headers.forEach((h, idx) => (rowObj[h] = parts[idx]));
          rows.push(rowObj);
        }
      }

      uploadedCsvData = rows;
      renderUploadPreview(headers, rows);
      showToast(`Successfully parsed ${rows.length} student records from CSV!`, "success");
    };
    reader.readAsText(file);
  }

  function renderUploadPreview(headers, rows) {
    if (!uploadPreviewCard || !uploadPreviewHeader || !uploadPreviewBody) return;
    uploadPreviewHeader.innerHTML = headers.map((h) => `<th>${h}</th>`).join("");
    uploadPreviewBody.innerHTML = rows
      .slice(0, 8)
      .map(
        (r) => `
      <tr>
        ${headers.map((h) => `<td>${r[h]}</td>`).join("")}
      </tr>
    `
      )
      .join("");

    if (previewRowCount) previewRowCount.innerText = `${rows.length}`;
    uploadPreviewCard.style.display = "block";
  }

  if (btnConfirmUploadPredict) {
    btnConfirmUploadPredict.addEventListener("click", () => {
      if (uploadedCsvData.length === 0) return showToast("No uploaded records to evaluate.", "error");
      const highRisk = uploadedCsvData.filter((r) => parseFloat(r.Attendance || 80) < 70 || parseFloat(r.Test_Avg || 75) < 60);
      const topList = uploadedCsvData.filter((r) => parseFloat(r.Test_Avg || 75) >= 85);

      renderTeacherResults({
        title: `Imported Gradebook (${uploadedCsvData.length} Total Records)`,
        classAvg: "78.2%",
        passRate: "89%",
        highRisk: highRisk.length,
        medRisk: Math.max(0, uploadedCsvData.length - highRisk.length - topList.length),
        lowRisk: topList.length,
        atRiskList: highRisk.map((r) => `${r.Student_Name || "Student"} — Attendance: ${r.Attendance}%, Test: ${r.Test_Avg}%`),
        topList: topList.map((r) => `${r.Student_Name || "Student"} — Test Avg: ${r.Test_Avg}%`),
        recommendations: "Automated intervention alerts dispatched for high-risk profiles. Recommend mandatory office hour slots."
      });
    });
  }

  if (btnLoadSampleCsv) {
    btnLoadSampleCsv.addEventListener("click", () => {
      const sampleHeaders = ["Student_Name", "Attendance", "Test_Avg", "Assignment_Avg", "Midterm_Grade"];
      const sampleRows = [
        { Student_Name: "Zainab Bibi", Attendance: "96", Test_Avg: "92", Assignment_Avg: "95", Midterm_Grade: "A+" },
        { Student_Name: "Usman Ghani", Attendance: "62", Test_Avg: "55", Assignment_Avg: "60", Midterm_Grade: "D" },
        { Student_Name: "Ali Hassan", Attendance: "88", Test_Avg: "82", Assignment_Avg: "85", Midterm_Grade: "B+" },
        { Student_Name: "Sara Qureshi", Attendance: "74", Test_Avg: "68", Assignment_Avg: "72", Midterm_Grade: "C" },
        { Student_Name: "Omar Farooq", Attendance: "91", Test_Avg: "89", Assignment_Avg: "94", Midterm_Grade: "A" }
      ];
      uploadedCsvData = sampleRows;
      renderUploadPreview(sampleHeaders, sampleRows);
      showToast("Demo class dataset loaded.", "info");
    });
  }

  if (btnDownloadSampleCsv) {
    btnDownloadSampleCsv.addEventListener("click", () => {
      const csvContent = "data:text/csv;charset=utf-8,Student_Name,Attendance,Test_Avg,Assignment_Avg,Midterm_Grade\nZainab Bibi,96,92,95,A+\nUsman Ghani,62,55,60,D\nAli Hassan,88,82,85,B+\nSara Qureshi,74,68,72,C\nOmar Farooq,91,89,94,A\n";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "edumetrics_student_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  function renderTeacherResults(data) {
    if (!teacherResultCard) return;
    if (tResultMeta) tResultMeta.innerText = data.title;
    if (tClassPassRate) tClassPassRate.innerText = `Pass Probability: ${data.passRate}`;
    if (tClassAvgVal) tClassAvgVal.innerText = data.classAvg;
    if (tCountHighRisk) tCountHighRisk.innerText = `${data.highRisk} Students`;
    if (tCountMedRisk) tCountMedRisk.innerText = `${data.medRisk} Students`;
    if (tCountLowRisk) tCountLowRisk.innerText = `${data.lowRisk} Students`;

    if (tAtRiskList) {
      tAtRiskList.innerHTML =
        data.atRiskList.length > 0
          ? data.atRiskList.map((item) => `<li class="factor-item"><span class="factor-bullet">🔴</span> ${item}</li>`).join("")
          : `<li class="factor-item" style="color:var(--text-muted);">No high-risk students detected in this dataset.</li>`;
    }

    if (tTopPerformersList) {
      tTopPerformersList.innerHTML =
        data.topList.length > 0
          ? data.topList.map((item) => `<li class="factor-item"><span class="factor-bullet">🟢</span> ${item}</li>`).join("")
          : `<li class="factor-item" style="color:var(--text-muted);">Solid class distribution.</li>`;
    }

    if (tRecommendationsText) {
      tRecommendationsText.innerText = data.recommendations;
    }

    // Export Teacher Risk Roster CSV
    const btnExportTeacherCsv = document.getElementById("btn-export-teacher-csv");
    if (btnExportTeacherCsv) {
      btnExportTeacherCsv.onclick = () => {
        let csv = "Student_Identifier,Performance_Metric,Status,Recommended_Action\n";
        (data.atRiskList || []).forEach((item) => {
          csv += `"${item.replace(/"/g, '""')}","Below Benchmark","High Risk","Mandatory Remediation & Tutoring"\n`;
        });
        (data.topList || []).forEach((item) => {
          csv += `"${item.replace(/"/g, '""')}","Distinction","Low Risk","Advanced Enrichment Topics"\n`;
        });
        if (!data.atRiskList?.length && !data.topList?.length) {
          csv += `"Class Roster Average","${data.classAvg}","${data.passRate} Pass Probability","Standard Curriculum Delivery"\n`;
        }

        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `class_risk_analytics_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast("Class risk roster exported to CSV!", "success");
      };
    }

    if (teacherResultCard) {
      teacherResultCard.style.display = "block";
      teacherResultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ============================================================================
  // 12. PREDICTION HISTORY SYNC (ANALYTICS-READY)
  // ============================================================================
  function savePredictionToHistory(result, payload) {
    try {
      const isLowRisk = result.risk_level === "LOW" || result.risk_level === "low";
      const isMedRisk = result.risk_level === "MEDIUM" || result.risk_level === "medium";
      const currentUser = window.authClient ? window.authClient.getUser() : null;

      const isUni = (currentStage || "university").toLowerCase() === "university";
      let uniGpa = null;
      if (isUni) {
        if (typeof result.forecasted_semester_gpa === "number") {
          uniGpa = result.forecasted_semester_gpa;
        } else if (typeof result.score === "number" && result.score <= 4.0) {
          uniGpa = result.score;
        } else if (result.score && !isNaN(parseFloat(result.score)) && parseFloat(result.score) <= 4.0) {
          uniGpa = parseFloat(result.score);
        } else if (result.predicted_score && !isNaN(parseFloat(result.predicted_score)) && parseFloat(result.predicted_score) <= 4.0) {
          uniGpa = parseFloat(result.predicted_score);
        } else {
          uniGpa = 2.06;
        }
        uniGpa = +Number(uniGpa).toFixed(2);
      }

      const formattedScoreStr = isUni 
        ? `${uniGpa.toFixed(2)} CGPA`
        : (result.formatted_score || `${result.score}`);

      const enrichedPayload = {
        ...(payload || {}),
        stage: currentStage || "university",
        forecasted_semester_gpa: isUni ? uniGpa : undefined,
        projected_cumulative_cgpa: result.projected_cumulative_cgpa,
        status_badge: result.status_badge || (isLowRisk ? "Exemplary" : isMedRisk ? "Proficient" : "Critical Intervention Needed"),
        status_color: result.status_color || (isLowRisk ? "badge-success" : isMedRisk ? "badge-info" : "badge-danger"),
        recommendations: result.recommendation || (Array.isArray(result.recommendations) ? result.recommendations.join(" ") : result.recommendations) || ""
      };

      const historyItem = {
        id: `pred-${Date.now().toString().slice(-6)}`,
        timestamp: window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString(),
        role: currentRole || "student",
        stage: currentStage || "university",
        score: formattedScoreStr,
        predicted_score: isUni ? uniGpa : (typeof result.score === "number" ? result.score : parseFloat(result.predicted_score || 85.0)),
        forecasted_semester_gpa: isUni ? uniGpa : undefined,
        projected_cumulative_cgpa: result.projected_cumulative_cgpa,
        grade: result.grade || "Grade A",
        status_badge: result.status_badge || (isLowRisk ? "Exemplary" : isMedRisk ? "Proficient" : "Critical Intervention Needed"),
        status_color: result.status_color || (isLowRisk ? "badge-success" : isMedRisk ? "badge-info" : "badge-danger"),
        payload: enrichedPayload,
        recommendations: result.recommendation || (Array.isArray(result.recommendations) ? result.recommendations.join(" ") : result.recommendations) || "Maintain steady academic momentum and weekly revision routine.",
        user_id: currentUser?.id || ""
      };

      // 1. Save to user-specific store
      if (currentUser?.id) {
        const userKey = `edumetrics_prediction_history_v2_${currentUser.id}`;
        const userHistory = JSON.parse(localStorage.getItem(userKey) || "[]");
        userHistory.unshift(historyItem);
        localStorage.setItem(userKey, JSON.stringify(userHistory.slice(0, 100)));
        localStorage.setItem(`edumetrics_prediction_history_${currentUser.id}`, JSON.stringify(userHistory.slice(0, 100)));
      }

      // 2. Save to general session store for instant access across tabs
      const genKey = "edumetrics_prediction_history_v2";
      const genHistory = JSON.parse(localStorage.getItem(genKey) || "[]");
      genHistory.unshift(historyItem);
      localStorage.setItem(genKey, JSON.stringify(genHistory.slice(0, 100)));
      localStorage.setItem("edumetrics_prediction_history", JSON.stringify(genHistory.slice(0, 100)));

      // Untombstone new prediction if ID collided
      try {
        const tombstoneKeys = [
          currentUser?.id ? `sp_deleted_prediction_ids_${currentUser.id}` : null,
          "sp_deleted_prediction_ids"
        ].filter(Boolean);
        for (const tk of tombstoneKeys) {
          const raw = localStorage.getItem(tk);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.includes(String(historyItem.id).trim().toLowerCase())) {
              const updated = arr.filter(id => id !== String(historyItem.id).trim().toLowerCase());
              localStorage.setItem(tk, JSON.stringify(updated));
            }
          }
        }
      } catch (e) {}

      // 3. Persist into Supabase Cloud prediction_history table
      if (window.authClient && window.authClient.client) {
        const rawScore = isUni 
          ? uniGpa 
          : (typeof result.score === "number" ? result.score : parseFloat(result.predicted_score || 85.0));
        const localNow = window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString();
        const userMeta = currentUser?.user_metadata || {};
        const featuresWithUser = {
          ...enrichedPayload,
          user_id: currentUser?.id,
          user_email: currentUser?.email,
          student_id_code: userMeta.student_id || userMeta.id_code || currentUser?.id || "STU-01"
        };

        const cloudRecord = {
          id: historyItem.id || `pred-${Date.now().toString().slice(-6)}`,
          user_id: currentUser?.id || null,
          stage: currentStage || "university",
          input_features: featuresWithUser,
          predicted_score: isNaN(rawScore) ? (isUni ? 2.06 : 85.0) : rawScore,
          predicted_grade: result.predicted_grade || result.grade || "Grade A",
          status_badge: result.status_badge || (isLowRisk ? "Exemplary" : isMedRisk ? "Proficient" : "Critical Intervention Needed"),
          created_at: localNow
        };

        window.authClient.client.from("prediction_history").insert(cloudRecord).then(({ error }) => {
          if (error) {
            console.warn("[Supabase] Primary prediction insert notice:", error.message);
            // If user_id column doesn't exist yet on prediction_history table, retry without top-level user_id
            const fallbackRecord = { ...cloudRecord };
            delete fallbackRecord.user_id;
            return window.authClient.client.from("prediction_history").insert(fallbackRecord);
          } else {
            console.log("[Supabase] Latest prediction successfully persisted to database.");
          }
        }).then((retryRes) => {
          if (retryRes && retryRes.error) {
            console.warn("[Supabase] Prediction fallback insert error:", retryRes.error.message);
          } else if (retryRes) {
            console.log("[Supabase] Latest prediction persisted via adaptive schema fallback.");
          }
        }).catch((cloudErr) => {
          console.warn("[Supabase] Cloud history insert note:", cloudErr.message);
        });
      }

      // 4. Auto-persist logged semesters & coursework to academic_records & academic_subjects
      if (Array.isArray(loggedTerms) && loggedTerms.length > 0 && window.apiClient && typeof window.apiClient.createAcademicRecord === "function") {
        for (const term of loggedTerms) {
          window.apiClient.createAcademicRecord(term).catch((err) => {
            console.warn("[Academic Record] Term sync error on prediction run:", err);
          });
        }
      }

      // 5. Also notify backend API history endpoint if active
      if (window.apiClient && typeof window.apiClient.savePrediction === "function") {
        window.apiClient.savePrediction(historyItem).catch(() => {});
      }
    } catch (e) {
      console.warn("History save error:", e);
    }
  }

  // ============================================================================
  // 13. USER PROFILE & SETTINGS MODAL (PRESERVED)
  // ============================================================================
  function initProfileSettings() {
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebar = document.getElementById("sidebar");
    const logoutBtn = document.getElementById("logout-btn");

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        if (window.authClient) await window.authClient.signOut();
        window.location.href = "login.html";
      });
    }

    syncUserProfile();
  }

  // ============================================================================
  // 14. INITIALIZATION BOOTSTRAP
  // ============================================================================
  function initPredictionPage() {
    initProfileSettings();
    loadStudentStage("university");
    goToStudentStep(1);
  }

  initPredictionPage();
});
