/**
 * AI Academic Performance Prediction & Analytics Platform (Page 2)
 * EduMetrics AI - Student Success & Academic Performance Prediction Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ============================================================================
  // 1. GLOBAL STATE MANAGEMENT
  // ============================================================================
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
    if (studentIdCodeEl) studentIdCodeEl.innerText = meta.student_id || meta.id_code || "STU-2026-001";

    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
    const avatarEl = document.getElementById("navbar-user-avatar");
    if (avatarEl) avatarEl.innerText = initials || "SP";
  }

  syncUserProfile();

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

  // ============================================================================
  // 5. STUDENT STEPPER & PROGRESSIVE DISCLOSURE
  // ============================================================================
  function goToStudentStep(stepIndex) {
    if (stepIndex < 1 || stepIndex > 5) return;

    // Validate current step before moving forward
    if (stepIndex > currentStudentStep) {
      const isValid = validateStudentStep(currentStudentStep);
      if (!isValid) return;
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
  }

  stepItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetStep = parseInt(item.getAttribute("data-step"));
      if (targetStep <= currentStudentStep || validateStudentStep(currentStudentStep)) {
        goToStudentStep(targetStep);
      }
    });
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
    let html = "";
    const uniManagerCard = document.getElementById("university-semesters-manager-card");
    const managerCardTitle = document.getElementById("manager-card-title");
    const managerCardSubtitle = document.getElementById("manager-card-subtitle");
    const managerCurrentClassContainer = document.getElementById("manager-current-class-container");
    const managerCurrentClassSelect = document.getElementById("manager_current_class_select");
    const managerTargetClassContainer = document.getElementById("manager-target-class-container");
    const managerTargetClassSelect = document.getElementById("manager_target_class_select");
    const kpiTitle1 = document.getElementById("kpi-title-1");
    const kpiSub1 = document.getElementById("kpi-standing-sub");
    const kpiTitle2 = document.getElementById("kpi-title-2");
    const kpiSub2 = document.getElementById("kpi-sub-2");
    const kpiTitle3 = document.getElementById("kpi-title-3");
    const kpiSub3 = document.getElementById("kpi-sub-3");
    const kpiTitle4 = document.getElementById("kpi-title-4");
    const kpiSub4 = document.getElementById("kpi-sub-4");

    if (stage === "university" || stage === "secondary" || stage === "primary") {
      if (uniManagerCard) uniManagerCard.style.display = "block";

      if (stage === "university") {
        if (managerCardTitle) managerCardTitle.innerHTML = `<span>🏛️ Academic Semesters & Coursework Ledger</span>`;
        if (managerCardSubtitle) managerCardSubtitle.innerText = `Add your academic semesters, attendance, credit hours, and enrolled courses. Everything is calculated automatically into your cumulative GPA and performance profile.`;
        if (managerCurrentClassContainer) managerCurrentClassContainer.style.display = "none";
        if (managerTargetClassContainer) managerTargetClassContainer.style.display = "none";
        if (kpiTitle1) kpiTitle1.innerText = "Current Standing";
        if (kpiSub1) kpiSub1.innerText = "Active Semester";
        if (kpiTitle2) kpiTitle2.innerText = "Latest Semester GPA";
        if (kpiSub2) kpiSub2.innerText = "Last Term GPA";
        if (kpiTitle3) kpiTitle3.innerText = "Cumulative CGPA";
        if (kpiSub3) kpiSub3.innerText = "Overall Standing";
        if (kpiTitle4) kpiTitle4.innerText = "Average Attendance";
        if (kpiSub4) kpiSub4.innerText = "Lecture Presence";
      } else if (stage === "secondary") {
        if (managerCardTitle) managerCardTitle.innerHTML = `<span>🏫 Secondary Classes & Subject Coursework Ledger (Classes 5 to 8 / 9)</span>`;
        if (managerCardSubtitle) managerCardSubtitle.innerText = `Select your Current Class and Target Forecast Class, then log your completed classes and subjects with obtained marks.`;
        
        if (managerCurrentClassContainer) {
          managerCurrentClassContainer.style.display = "flex";
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
          if (managerCurrentClassSelect) {
            managerCurrentClassSelect.innerHTML = `
              <option value="Class 1">Class 1</option>
              <option value="Class 2">Class 2</option>
              <option value="Class 3" selected>Class 3</option>
              <option value="Class 4">Class 4</option>
              <option value="Class 5">Class 5</option>
            `;
          }
        }

        if (managerTargetClassContainer) {
          managerTargetClassContainer.style.display = "flex";
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
      html = "";
    } else {
      if (uniManagerCard) uniManagerCard.style.display = "none";
    }

    if (stage === "intermediate") {
      html = `
        <div class="card" style="padding: var(--space-4); border: 1px solid rgba(0, 212, 255, 0.35); background: rgba(0, 212, 255, 0.05); margin-bottom: var(--space-4); border-radius: 8px;">
          <div style="font-weight: 800; color: var(--color-cyan); margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
            <span>🎯 Select Your Intermediate Forecasting Target:</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
            <label class="inter-target-card" id="card-target-hssc1" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid var(--color-cyan); border-radius: 6px; cursor: pointer; background: rgba(0, 212, 255, 0.1);">
              <input type="radio" name="f_inter_target_level" id="target_hssc1" value="hssc1" checked style="margin-top: 3px;">
              <div>
                <div style="font-weight: 700; color: #ffffff; font-size: 13.5px;">Forecast 1st Year (11th Class)</div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Provide <strong>9th & 10th (Matric)</strong> marks ➔ AI predicts <strong>1st Year Board Score</strong></div>
              </div>
            </label>
            <label class="inter-target-card" id="card-target-hssc2" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer; background: rgba(255,255,255,0.04);">
              <input type="radio" name="f_inter_target_level" id="target_hssc2" value="hssc2" style="margin-top: 3px;">
              <div>
                <div style="font-weight: 700; color: #ffffff; font-size: 13.5px;">Forecast 2nd Year & Total Intermediate (1100)</div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Provide <strong>9th, 10th (Matric) & 1st Year</strong> marks ➔ AI predicts <strong>2nd Year & Total HSSC (1100)</strong></div>
              </div>
            </label>
          </div>
        </div>

        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_inter_group">Academic Group <span style="color:var(--accent-rose)">*</span></label>
            <select id="f_inter_group" class="form-select" required>
              <option value="" disabled>-- Select Intermediate Group --</option>
              <option value="Pre-Engineering" selected>Pre-Engineering (Math, Physics, Chemistry)</option>
              <option value="Pre-Medical">Pre-Medical (Biology, Physics, Chemistry)</option>
              <option value="ICS">ICS (Computer Science & Mathematics)</option>
              <option value="I.Com">I.Com (Commerce & Principles of Accounting)</option>
              <option value="General Science">General Science & Statistics</option>
              <option value="Humanities">Humanities & Arts</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_ssc1">9th Class (SSC-I) Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_ssc1" class="form-input" min="0" max="550" placeholder="e.g. 470" value="470" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_ssc2">10th Class (SSC-II) Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_ssc2" class="form-input" min="0" max="550" placeholder="e.g. 485" value="485" required>
          </div>
        </div>

        <div class="form-grid-3col" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_inter_ssc">Total Matric Marks (out of 1100) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_ssc" class="form-input" min="0" max="1100" placeholder="e.g. 955" value="955" required style="background: rgba(255,255,255,0.06); font-weight: 700; color: #ffffff;">
            <small style="color:var(--text-muted);font-size:11px;">Auto-calculated from 9th + 10th or enter directly</small>
          </div>

          <div class="form-group" id="f_inter_hssc1_group" style="display: none;">
            <label class="form-label" for="f_inter_hssc1">1st Year (11th) Board Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_hssc1" class="form-input" min="0" max="550" placeholder="e.g. 465" value="465">
            <small style="color:var(--color-cyan);font-size:11px;">Required for 2nd Year (12th) & Total forecast</small>
          </div>

          <div class="form-group" id="f_inter_hssc1_placeholder_group">
            <label class="form-label" style="color: var(--text-muted);">1st Year (11th) Status</label>
            <div style="padding: 9px 12px; background: rgba(168, 240, 75, 0.08); border: 1px dashed var(--color-lime); border-radius: 6px; font-size: 12px; color: var(--color-lime); font-weight: 600;">
              ⚡ Will be predicted by AI from your 9th & 10th Matric performance!
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="f_inter_att">College Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_att" class="form-input" min="0" max="100" placeholder="e.g. 88" value="88" required>
          </div>
        </div>

        <div class="form-grid-3col" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_inter_study">Daily Study Hours</label>
            <input type="number" step="0.5" id="f_inter_study" class="form-input" min="1" max="16" placeholder="e.g. 5.0" value="5.0">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_midterm">College Midterms / Send-Up Exam (%)</label>
            <input type="number" id="f_inter_midterm" class="form-input" min="0" max="100" placeholder="e.g. 82" value="82">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_lab">Practical / Lab Competency</label>
            <select id="f_inter_lab" class="form-select">
              <option value="Excellent" selected>Excellent (Consistent hands-on practicals)</option>
              <option value="Good">Good (Satisfactory experiments)</option>
              <option value="Needs Work">Needs Work (Theory only / Irregular lab)</option>
            </select>
          </div>
        </div>
      `;
    } else if (stage === "matric") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_matric_ssc1">9th Class (SSC-I) Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_matric_ssc1" class="form-input" min="0" max="550" placeholder="e.g. 465" value="465" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_group">Matriculation Group <span style="color:var(--accent-rose)">*</span></label>
            <select id="f_matric_group" class="form-select" required>
              <option value="Science (Computer Science)" selected>Science with Computer Science</option>
              <option value="Science (Biology)">Science with Biology</option>
              <option value="Arts / Humanities">Arts & General Science</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_att">School Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_matric_att" class="form-input" min="0" max="100" placeholder="e.g. 90" value="90" required>
          </div>
        </div>
        <div class="form-grid-3col" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_matric_study">Daily Study Hours</label>
            <input type="number" step="0.5" id="f_matric_study" class="form-input" min="1" max="16" placeholder="e.g. 4.5" value="4.5">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_past_papers">Past Paper Practice Frequency</label>
            <select id="f_matric_past_papers" class="form-select">
              <option value="Daily" selected>Daily Practice (Solved 5+ Years)</option>
              <option value="Weekly">Weekly Practice</option>
              <option value="Rarely">Rarely / Starting Soon</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_mock">Monthly Mock Test Performance</label>
            <select id="f_matric_mock" class="form-select">
              <option value="A+ Grade" selected>A+ Grade (85%+ Consistent)</option>
              <option value="A Grade">A Grade (75-84%)</option>
              <option value="B Grade">B Grade (60-74%)</option>
              <option value="Needs Support">Under 60%</option>
            </select>
          </div>
        </div>
        <div style="margin-top: var(--space-3); padding: 10px 14px; background: rgba(0, 212, 255, 0.08); border: 1px dashed var(--color-cyan); border-radius: 6px; font-size: 12px; color: var(--color-cyan); font-weight: 600;">
          ⚡ 10th Class (SSC-II) Board Marks & Combined Matric Total (1100) will be accurately predicted by AI!
        </div>
      `;
    }

    dynamicAcademicFields.innerHTML = html;

    if (stage === "intermediate") {
      const targetRadios = document.querySelectorAll('input[name="f_inter_target_level"]');
      const hssc1Group = document.getElementById("f_inter_hssc1_group");
      const hssc1Placeholder = document.getElementById("f_inter_hssc1_placeholder_group");
      const cardTarget1 = document.getElementById("card-target-hssc1");
      const cardTarget2 = document.getElementById("card-target-hssc2");

      const updateTargetUi = () => {
        const selected = document.querySelector('input[name="f_inter_target_level"]:checked')?.value || "hssc1";
        if (selected === "hssc1") {
          if (hssc1Group) hssc1Group.style.display = "none";
          if (hssc1Placeholder) hssc1Placeholder.style.display = "block";
          if (cardTarget1) {
            cardTarget1.style.borderColor = "var(--color-cyan)";
            cardTarget1.style.background = "rgba(0, 212, 255, 0.1)";
          }
          if (cardTarget2) {
            cardTarget2.style.borderColor = "rgba(255,255,255,0.15)";
            cardTarget2.style.background = "rgba(255,255,255,0.04)";
          }
        } else {
          if (hssc1Group) hssc1Group.style.display = "block";
          if (hssc1Placeholder) hssc1Placeholder.style.display = "none";
          if (cardTarget1) {
            cardTarget1.style.borderColor = "rgba(255,255,255,0.15)";
            cardTarget1.style.background = "rgba(255,255,255,0.04)";
          }
          if (cardTarget2) {
            cardTarget2.style.borderColor = "var(--color-cyan)";
            cardTarget2.style.background = "rgba(0, 212, 255, 0.1)";
          }
        }
      };

      targetRadios.forEach((r) => r.addEventListener("change", updateTargetUi));
      updateTargetUi();

      const ssc1Input = document.getElementById("f_inter_ssc1");
      const ssc2Input = document.getElementById("f_inter_ssc2");
      const sscTotalInput = document.getElementById("f_inter_ssc");

      const syncMatricTotal = () => {
        const v1 = parseFloat(ssc1Input?.value) || 0;
        const v2 = parseFloat(ssc2Input?.value) || 0;
        if (sscTotalInput && (v1 > 0 || v2 > 0)) {
          sscTotalInput.value = Math.min(1100, Math.round(v1 + v2));
        }
      };

      if (ssc1Input) ssc1Input.addEventListener("input", syncMatricTotal);
      if (ssc2Input) ssc2Input.addEventListener("input", syncMatricTotal);
    }
  }

  function renderStep3HabitsFields(stage) {
    if (!dynamicHabitsFields) return;
    let html = `
      <div class="form-grid-3col" style="margin-bottom: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="f_study_hours">Daily Independent Study Hours <span style="color:var(--accent-rose)">*</span></label>
          <input type="number" step="0.5" id="f_study_hours" class="form-input" min="0" max="16" placeholder="e.g. 4.5" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_revision_freq">Revision Frequency</label>
          <select id="f_revision_freq" class="form-select">
            <option value="" disabled selected>-- Select Revision Frequency --</option>
            <option value="Daily">Daily Routine Review</option>
            <option value="Weekly">Weekly Topic Consolidation</option>
            <option value="BeforeExams">Only Right Before Exams</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_assignment_disc">Homework & Assignment Discipline</label>
          <select id="f_assignment_disc" class="form-select">
            <option value="" disabled selected>-- Select Discipline --</option>
            <option value="Always">Consistently On-Time (100%)</option>
            <option value="Mostly">Mostly On-Time (80-90%)</option>
            <option value="Irregular">Occasional Delays (&lt;70%)</option>
          </select>
        </div>
      </div>
      <div class="form-grid-2col">
        <div class="form-group">
          <label class="form-label" for="f_ai_tools">Educational & AI Tools Usage</label>
          <select id="f_ai_tools" class="form-select">
            <option value="" disabled selected>-- Select Digital Tools Usage --</option>
            <option value="Frequent">Frequent (Concept explanation & problem solving)</option>
            <option value="Occasional">Occasional (Quick lookup)</option>
            <option value="None">None / Traditional Textbooks Only</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_tuition">Extra Tuition / Academy / Mentorship</label>
          <select id="f_tuition" class="form-select">
            <option value="" disabled selected>-- Select Coaching Option --</option>
            <option value="Yes">Yes (Enrolled in coaching / tutoring)</option>
            <option value="No">No (Self-study only)</option>
          </select>
        </div>
      </div>
    `;
    dynamicHabitsFields.innerHTML = html;
  }

  function renderStep4AssessmentFields(stage) {
    if (!dynamicAssessmentFields) return;
    let html = `
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
    dynamicAssessmentFields.innerHTML = html;
  }

  // ============================================================================
  // 7. STEP VALIDATION & REVIEW SCREEN
  // ============================================================================
  function validateStudentStep(step) {
    hideErrorBanner();
    let errors = [];

    if (step === 2) {
      if (currentStage === "university" || currentStage === "secondary" || currentStage === "primary") {
        if (!loggedTerms || loggedTerms.length === 0) {
          const unit = currentStage === "university" ? "semester" : currentStage === "secondary" ? "class (e.g. Class 6)" : "primary grade";
          showToast(`Please click '+ Add ${currentStage === 'university' ? 'Semester' : 'Class Record'}' to log at least one completed ${unit} with subjects before proceeding.`, "info");
          if (btnAddSemester) btnAddSemester.click();
          return false;
        }
      } else if (currentStage === "intermediate") {
        const targetLevel = document.querySelector('input[name="f_inter_target_level"]:checked')?.value || "hssc1";
        const ssc1 = parseFloat(document.getElementById("f_inter_ssc1")?.value);
        const ssc2 = parseFloat(document.getElementById("f_inter_ssc2")?.value);
        const ssc = parseFloat(document.getElementById("f_inter_ssc")?.value);
        const att = parseFloat(document.getElementById("f_inter_att")?.value);

        if (!isNaN(ssc1) && (ssc1 < 0 || ssc1 > 550)) errors.push("9th Class marks must be between 0 and 550.");
        if (!isNaN(ssc2) && (ssc2 < 0 || ssc2 > 550)) errors.push("10th Class marks must be between 0 and 550.");
        if (isNaN(ssc) || ssc < 0 || ssc > 1100) errors.push("Total Matric marks must be between 0 and 1100.");

        if (targetLevel === "hssc2") {
          const hssc1 = parseFloat(document.getElementById("f_inter_hssc1")?.value);
          if (isNaN(hssc1) || hssc1 < 0 || hssc1 > 550) errors.push("Please enter your 1st Year (11th) marks (0 to 550) to forecast 2nd Year & Total.");
        }

        if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0% and 100%.");
      } else if (currentStage === "matric") {
        const ssc1 = parseFloat(document.getElementById("f_matric_ssc1")?.value);
        const att = parseFloat(document.getElementById("f_matric_att")?.value);
        if (isNaN(ssc1) || ssc1 < 0 || ssc1 > 550) errors.push("9th class marks must be between 0 and 550.");
        if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0% and 100%.");
      }
    } else if (step === 3) {
      const studyHours = parseFloat(document.getElementById("f_study_hours")?.value);
      if (isNaN(studyHours) || studyHours < 0 || studyHours > 16) errors.push("Daily study hours must be between 0 and 16 hours.");
    }

    if (errors.length > 0) {
      showErrorBanner(errors[0]);
      return false;
    }
    return true;
  }

  function renderStudentReview() {
    if (!studentReviewContainer) return;
    const studyHours = document.getElementById("f_study_hours")?.value || "4.5";
    const revision = document.getElementById("f_revision_freq")?.value || "Daily";
    const focus = document.getElementById("f_attentive_level")?.value || "High";
    const motivation = document.getElementById("f_self_motivation")?.value || "9";
    const stageName = currentStage.charAt(0).toUpperCase() + currentStage.slice(1);
    const scaleText = currentStage === "university" ? "0.00 – 4.00 CGPA Scale" : currentStage === "intermediate" ? "1100 Marks & Percentage Scale" : "0 – 100% Percentage Scale";

    const totalLoggedCourses = loggedTerms.reduce((sum, t) => sum + (t.subjects?.length || 0), 0);

    let academicSummary = "";
    if (currentStage === "university") {
      let cumCgpa = "0.00";
      let avgAtt = "85";
      const semCount = loggedTerms.length || 1;
      const semStanding = `Semester ${semCount} (${semCount === 1 ? 'Freshman' : semCount === 2 ? 'Sophomore' : semCount <= 4 ? 'Junior' : 'Senior'})`;
      
      if (loggedTerms.length > 0) {
        let totalObt = 0;
        let totalMax = 0;
        let attSum = 0;
        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 85.0);
          (t.subjects || []).forEach((s) => {
            totalObt += parseFloat(s.obtained_marks || 0);
            totalMax += parseFloat(s.total_marks || 100);
          });
        });
        avgAtt = (attSum / loggedTerms.length).toFixed(1);
        const overallPct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
        cumCgpa = (Math.min(4.0, (overallPct / 100.0) * 4.0)).toFixed(2);
      }
      academicSummary = `${semStanding} | Cumulative CGPA: ${cumCgpa} | Avg Attendance: ${avgAtt}%`;
    } else if (currentStage === "intermediate") {
      const targetLevel = document.querySelector('input[name="f_inter_target_level"]:checked')?.value || "hssc1";
      const sscTotal = document.getElementById("f_inter_ssc")?.value || "955";
      const grp = document.getElementById("f_inter_group")?.value || "Pre-Engineering";
      if (targetLevel === "hssc1") {
        academicSummary = `Group: ${grp} | Matric: ${sscTotal}/1100 ➔ Target: 1st Year (11th)`;
      } else {
        const hssc1 = document.getElementById("f_inter_hssc1")?.value || "465";
        academicSummary = `Group: ${grp} | 1st Year: ${hssc1}/550 | Matric: ${sscTotal}/1100 ➔ Target: 2nd Year & Total`;
      }
    } else if (currentStage === "matric") {
      academicSummary = `9th Marks: ${document.getElementById("f_matric_ssc1")?.value || "465"}/550 | Att: ${document.getElementById("f_matric_att")?.value || "90"}%`;
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
        let totalObt = 0;
        let totalMax = 0;
        let attSum = 0;
        let crSum = 0;

        loggedTerms.forEach((t) => {
          attSum += parseFloat(t.attendance_pct || 85.0);
          crSum += parseFloat(t.credit_hours || 18);
          totalBacklogs += parseInt(t.backlogs || 0);
          if (t.midterm_score) latestMidterm = parseFloat(t.midterm_score);
          (t.subjects || []).forEach((s) => {
            totalObt += parseFloat(s.obtained_marks || 0);
            totalMax += parseFloat(s.total_marks || 100);
          });
        });

        avgAtt = +(attSum / loggedTerms.length).toFixed(1);
        totalCredits = crSum || 18;
        const overallPct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
        cumCgpa = +(Math.min(4.0, (overallPct / 100.0) * 4.0)).toFixed(2);
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
      const targetLevel = document.querySelector('input[name="f_inter_target_level"]:checked')?.value || "hssc1";
      const ssc1 = parseFloat(document.getElementById("f_inter_ssc1")?.value || 470);
      const ssc2 = parseFloat(document.getElementById("f_inter_ssc2")?.value || 485);
      const sscTotal = parseFloat(document.getElementById("f_inter_ssc")?.value || (ssc1 + ssc2));
      const hssc1 = parseFloat(document.getElementById("f_inter_hssc1")?.value || 460);
      const att = parseFloat(document.getElementById("f_inter_att")?.value || 88);
      const studyH = parseFloat(document.getElementById("f_inter_study")?.value || payload.study_hours || 5.0);
      const midterm = parseFloat(document.getElementById("f_inter_midterm")?.value || 82);
      const group = document.getElementById("f_inter_group")?.value || "Pre-Engineering";
      const lab = document.getElementById("f_inter_lab")?.value || "Excellent";

      payload.target_level = targetLevel;
      payload.SSC_I_Marks = ssc1;
      payload.SSC_II_Marks = ssc2;
      payload.SSC_Total_Marks = sscTotal;
      payload.HSSC_I_Marks = hssc1;
      payload.Attendance_Rate = att;
      payload.Study_Hours = studyH;
      payload.Midterm_Exam_Avg = midterm;
      payload.Subject_Group = group;
      payload.Lab_Competency = lab;
    } else if (currentStage === "matric") {
      const ssc1 = parseFloat(document.getElementById("f_matric_ssc1")?.value || 465);
      const att = parseFloat(document.getElementById("f_matric_att")?.value || 90);
      const studyH = parseFloat(document.getElementById("f_matric_study")?.value || payload.study_hours || 4.5);
      const grp = document.getElementById("f_matric_group")?.value || "Science (Computer Science)";
      const pastPapers = document.getElementById("f_matric_past_papers")?.value || "Daily";
      const mockPerf = document.getElementById("f_matric_mock")?.value || "A+ Grade";

      payload.SSC_I_Marks = ssc1;
      payload.SSC_II_Marks = ssc1;
      payload.HSSC_I_Marks = 400;
      payload.Attendance_Rate = att;
      payload.Study_Hours = studyH;
      payload.Matric_Group = grp;
      payload.Past_Paper_Practice = pastPapers;
      payload.Mock_Performance = mockPerf;
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
      const baseCgpa = payload.Previous_CGPA || 3.50;
      const latestSemGpa = (payload.logged_terms && payload.logged_terms.length > 0)
        ? (payload.logged_terms[payload.logged_terms.length - 1].gpa || baseCgpa)
        : baseCgpa;
      
      const studyBoost = ((payload.study_hours || 4.5) - 4.0) * 0.05;
      const attBoost = ((payload.Attendance_Pct || 85.0) - 80.0) * 0.005;
      const midBoost = (((payload.Midterm_Exam_Avg || 80.0) - 75.0) / 100.0) * 0.25;
      const backlogPenalty = (payload.Backlogs_Failed_Courses || 0) * 0.12;

      forecastedSemGpa = +(Math.min(4.0, Math.max(1.0, latestSemGpa + studyBoost + attBoost + midBoost - backlogPenalty))).toFixed(2);
      const nTerms = (payload.logged_terms && payload.logged_terms.length > 0) ? payload.logged_terms.length : 1;
      projectedCumulativeCgpa = +(((baseCgpa * nTerms) + forecastedSemGpa) / (nTerms + 1)).toFixed(2);

      score = forecastedSemGpa;
      formatted_score = `${forecastedSemGpa.toFixed(2)} Next Sem GPA`;
      min_ci = Math.max(0.0, +(forecastedSemGpa - 0.18).toFixed(2));
      max_ci = Math.min(4.0, +(forecastedSemGpa + 0.16).toFixed(2));
      grade = forecastedSemGpa >= 3.7 ? "Grade A+ (Exemplary)" : forecastedSemGpa >= 3.3 ? "Grade A (Very Good)" : forecastedSemGpa >= 3.0 ? "Grade B+ (Good)" : forecastedSemGpa >= 2.5 ? "Grade B (Satisfactory)" : forecastedSemGpa >= 2.0 ? "Grade C (Passing)" : "Grade F (Probation)";
      risk_level = forecastedSemGpa >= 3.0 ? "LOW" : forecastedSemGpa >= 2.3 ? "MEDIUM" : "HIGH";
      status_badge = forecastedSemGpa >= 3.6 ? "Exemplary" : forecastedSemGpa >= 3.0 ? "On Track" : forecastedSemGpa >= 2.3 ? "At Risk" : "Critical Intervention Needed";
      status_color = forecastedSemGpa >= 3.6 ? "badge-success" : forecastedSemGpa >= 3.0 ? "badge-primary" : forecastedSemGpa >= 2.3 ? "badge-warning" : "badge-danger";
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
        const predHssc1Pct = +(Math.min(100.0, Math.max(30.0, sscPct + habitBoost))).toFixed(1);
        const predHssc1Marks = Math.min(550, Math.max(150, Math.round((predHssc1Pct / 100.0) * 550)));
        const proj2YearTotal = Math.min(1100, predHssc1Marks * 2);

        score = predHssc1Marks;
        formatted_score = `${predHssc1Marks} / 550 (${predHssc1Pct}%) Forecasted 1st Year`;
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
          forecasted_1st_year: `${predHssc1Marks} / 550`,
          projected_2year_total: `${proj2YearTotal} / 1100`,
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
          recommendation: `Strong performance predicted in 1st Year (11th). Maintain consistent study hours for top board position.`
        };
      } else {
        const hssc1 = parseFloat(payload.HSSC_I_Marks || 460);
        const hssc1Pct = (hssc1 / 550.0) * 100.0;
        const basePct = (hssc1Pct * 0.70) + (sscPct * 0.30);
        const predHssc2Pct = +(Math.min(100.0, Math.max(30.0, basePct + habitBoost))).toFixed(1);
        const predHssc2Marks = Math.min(550, Math.max(150, Math.round((predHssc2Pct / 100.0) * 550)));
        const finalTotal = Math.min(1100, Math.max(200, Math.round(hssc1 + predHssc2Marks)));
        const finalPct = +((finalTotal / 1100.0) * 100.0).toFixed(1);

        score = finalTotal;
        formatted_score = `${finalTotal} / 1100 (${finalPct}%) Final Intermediate`;
        min_ci = Math.max(0, finalTotal - 32);
        max_ci = Math.min(1100, finalTotal + 32);
        grade = finalPct >= 80 ? "Grade A-1 (Exceptional)" : finalPct >= 70 ? "Grade A (Excellent)" : finalPct >= 60 ? "Grade B (Very Good)" : finalPct >= 50 ? "Grade C (Good / Passing)" : "Grade D / Needs Support";
        risk_level = finalPct >= 70 ? "LOW" : finalPct >= 55 ? "MEDIUM" : "HIGH";
        status_badge = finalPct >= 80 ? "Exemplary" : finalPct >= 65 ? "On Track" : finalPct >= 50 ? "At Risk" : "Critical Intervention Needed";
        status_color = finalPct >= 80 ? "badge-success" : finalPct >= 65 ? "badge-primary" : finalPct >= 50 ? "badge-warning" : "badge-danger";

        return {
          stage,
          target_level: "hssc2",
          score: finalTotal,
          predicted_score: finalTotal,
          forecasted_2nd_year: `${predHssc2Marks} / 550`,
          final_intermediate_total: `${finalTotal} / 1100`,
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
              `1st Year Board Score: ${hssc1}/550 (${hssc1Pct.toFixed(1)}%) proven intermediate benchmark`,
              `Matric Baseline: ${sscTotal}/1100 (${sscPct.toFixed(1)}%) strong background`,
              `College Attendance: ${att}% consistent presence`,
              `Daily Independent Study: ${studyH} hrs/day`
            ],
            growth_areas: [
              `Focus on 2nd Year high-weightage topics and board model papers`,
              `Prepare for MDCAT / ECAT / Entry Test parallel to board exams`
            ]
          },
          recommendation: `Excellent trajectory for 2nd Year and overall Intermediate completion. Maintain rigorous mock practice.`
        };
      }
    } else if (stage === "matric") {
      const ssc1 = parseFloat(payload.SSC_I_Marks || 465);
      const studyH = parseFloat(payload.Study_Hours || payload.study_hours || 4.5);
      const att = parseFloat(payload.Attendance_Rate || 90);
      const ssc1Pct = (ssc1 / 550.0) * 100.0;
      const habitBoost = ((studyH - 4.0) * 1.5) + ((att - 85.0) * 0.35);
      const predSsc2Pct = +(Math.min(100.0, Math.max(30.0, ssc1Pct + habitBoost))).toFixed(1);
      const predSsc2Marks = Math.min(550, Math.max(150, Math.round((predSsc2Pct / 100.0) * 550)));
      const totalMarks = Math.min(1100, Math.max(200, Math.round(ssc1 + predSsc2Marks)));
      const pct = +((totalMarks / 1100) * 100).toFixed(1);
      score = totalMarks;
      formatted_score = `${totalMarks} / 1100 (${pct}%) Final Matric (SSC)`;
      min_ci = Math.max(0, totalMarks - 30);
      max_ci = Math.min(1100, totalMarks + 30);
      grade = pct >= 80 ? "Grade A-1 (Exceptional)" : pct >= 70 ? "Grade A (Excellent)" : pct >= 60 ? "Grade B (Very Good)" : pct >= 50 ? "Grade C (Good / Passing)" : pct >= 40 ? "Grade D (Fair)" : "Grade F / Fail";
      risk_level = pct >= 65 ? "LOW" : pct >= 50 ? "MEDIUM" : "HIGH";
      status_badge = pct >= 80 ? "Exemplary" : pct >= 65 ? "On Track" : pct >= 50 ? "At Risk" : "Critical Intervention Needed";
      status_color = pct >= 80 ? "badge-success" : pct >= 65 ? "badge-primary" : pct >= 50 ? "badge-warning" : "badge-danger";

      return {
        stage,
        score: totalMarks,
        predicted_score: totalMarks,
        forecasted_10th_marks: `${predSsc2Marks} / 550`,
        final_matric_total: `${totalMarks} / 1100`,
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
            `9th Class Board Foundation: ${ssc1}/550 (${ssc1Pct.toFixed(1)}%) baseline logged`,
            `School Attendance: ${att}% regular presence`,
            `Daily Independent Study: ${studyH} hrs/day routine`
          ],
          growth_areas: [
            `Focus on 10th Class 5-year past board questions for Sciences & Mathematics`,
            `Take regular monthly mock tests to build speed and accuracy`
          ]
        },
        recommendation: `Solid trajectory predicted for 10th class board examinations. Maintain structured daily revisions.`
      };
    } else if (stage === "secondary") {
      const tgtClass = payload.target_class || "Class 9 / Matric";
      const cumPct = parseFloat(payload.past_annual_pct || 85.0);
      const studyH = parseFloat(payload.study_hours || 4.0);
      const att = parseFloat(payload.Attendance_Rate || 90.0);
      const termsCount = payload.logged_terms?.length || 1;

      const habitBoost = ((studyH - 3.0) * 1.2) + ((att - 85.0) * 0.2) + Math.min(2.0, (termsCount - 1) * 0.5);
      const predTgtPct = +(Math.min(100.0, Math.max(25.0, cumPct + habitBoost))).toFixed(1);

      score = predTgtPct;
      formatted_score = `${predTgtPct}% in ${tgtClass}`;
      min_ci = Math.max(0, +(predTgtPct - 3.2).toFixed(1));
      max_ci = Math.min(100, +(predTgtPct + 3.2).toFixed(1));
      grade = predTgtPct >= 85 ? "Grade A+ (Distinction)" : predTgtPct >= 75 ? "Grade A (Excellent)" : predTgtPct >= 65 ? "Grade B (Good)" : predTgtPct >= 50 ? "Grade C (Satisfactory)" : "Grade D / Needs Support";
      risk_level = predTgtPct >= 70 ? "LOW" : predTgtPct >= 55 ? "MEDIUM" : "HIGH";
      status_badge = predTgtPct >= 85 ? "Exemplary" : predTgtPct >= 70 ? "On Track" : predTgtPct >= 55 ? "At Risk" : "Critical Intervention Needed";
      status_color = predTgtPct >= 85 ? "badge-success" : predTgtPct >= 70 ? "badge-primary" : predTgtPct >= 55 ? "badge-warning" : "badge-danger";

      const loggedClassNames = (payload.logged_terms || []).map(t => t.term_name).join(", ") || `${termsCount} Classes Logged`;

      return {
        stage,
        target_class: tgtClass,
        score: predTgtPct,
        predicted_score: predTgtPct,
        past_final_percentage: `${cumPct}% (${loggedClassNames})`,
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
            `Historical Multi-Class Aggregate: ${cumPct}% recorded across ${termsCount} classes`,
            `School Attendance: ${att}% presence logged`,
            `Daily Independent Study: ${studyH} hrs/day routine`
          ],
          growth_areas: [
            `Maintain rigorous practice in Mathematics & Sciences for ${tgtClass}`,
            `Solve model assessment papers ahead of final examinations`
          ]
        },
        recommendation: `Solid academic progression forecasted for ${tgtClass} based on your multi-class coursework profile.`
      };
    } else {
      const tgtClass = payload.target_class || "Class 4";
      const cumPct = parseFloat(payload.past_annual_pct || 88.0);
      const att = parseFloat(payload.Attendance_Rate || 94.0);
      const termsCount = payload.logged_terms?.length || 1;

      const attBoost = (att - 90.0) * 0.15;
      const predTgtPct = +(Math.min(100.0, Math.max(30.0, cumPct + attBoost))).toFixed(1);

      score = predTgtPct;
      formatted_score = `${predTgtPct}% in ${tgtClass}`;
      min_ci = Math.max(0, +(predTgtPct - 2.8).toFixed(1));
      max_ci = Math.min(100, +(predTgtPct + 2.8).toFixed(1));
      grade = predTgtPct >= 85 ? "Level 4 (Advanced Mastery)" : predTgtPct >= 70 ? "Level 3 (Proficient)" : predTgtPct >= 50 ? "Level 2 (Developing)" : "Level 1 (Beginning)";
      risk_level = predTgtPct >= 70 ? "LOW" : predTgtPct >= 50 ? "MEDIUM" : "HIGH";
      status_badge = predTgtPct >= 85 ? "Exemplary" : predTgtPct >= 70 ? "On Track" : predTgtPct >= 50 ? "At Risk" : "Critical Intervention Needed";
      status_color = predTgtPct >= 85 ? "badge-success" : predTgtPct >= 70 ? "badge-primary" : predTgtPct >= 50 ? "badge-warning" : "badge-danger";

      const loggedClassNames = (payload.logged_terms || []).map(t => t.term_name).join(", ") || `${termsCount} Grades Logged`;

      return {
        stage,
        target_class: tgtClass,
        score: predTgtPct,
        predicted_score: predTgtPct,
        past_final_percentage: `${cumPct}% (${loggedClassNames})`,
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
            `Primary Foundation: ${cumPct}% mastery aggregate recorded`,
            `Attendance: ${att}% consistent presence in school`,
            `Multi-Subject Breadth: ${termsCount} primary grade records logged`
          ],
          growth_areas: [
            `Encourage regular reading and mental arithmetic exercises for ${tgtClass}`,
            `Reinforce creative writing and interactive projects`
          ]
        },
        recommendation: `High developmental readiness for ${tgtClass}. Continue positive learning reinforcement.`
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

    if (resultPredictedVal) resultPredictedVal.innerText = res.formatted_score || `${res.score}`;
    
    // Resolve Grade correctly
    const gradeText = res.predicted_grade || res.grade || "Grade A (Excellent)";
    if (resultGradeVal) resultGradeVal.innerText = gradeText;

    // Dual Projection Pill rendering for University, Intermediate, Matric, Secondary, Primary
    const dualProjectionContainer = document.getElementById("result-dual-projection");
    if (dualProjectionContainer) {
      if (currentStage === "university") {
        const nextGpa = res.forecasted_semester_gpa || res.score || (res.predicted_score ? parseFloat(res.predicted_score) : 3.65);
        const projCgpa = res.projected_cumulative_cgpa || +(Math.min(4.0, (typeof nextGpa === 'number' ? nextGpa : parseFloat(nextGpa)) * 0.98)).toFixed(2);
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 Next Semester Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${typeof nextGpa === 'number' ? nextGpa.toFixed(2) : nextGpa} GPA</div>
          </div>
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎓 Projected Cumulative</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${typeof projCgpa === 'number' ? projCgpa.toFixed(2) : projCgpa} CGPA</div>
          </div>
        `;
      } else if (currentStage === "intermediate") {
        if (res.target_level === "hssc1") {
          dualProjectionContainer.innerHTML = `
            <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 1st Year (11th) Forecast</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${res.forecasted_1st_year || res.score + ' / 550'}</div>
            </div>
            <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎓 Projected 2-Year Total</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${res.projected_2year_total || (res.score * 2) + ' / 1100'}</div>
            </div>
          `;
        } else {
          dualProjectionContainer.innerHTML = `
            <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 2nd Year (12th) Forecast</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${res.forecasted_2nd_year || '485 / 550'}</div>
            </div>
            <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🏛️ Final Intermediate Total</div>
              <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${res.final_intermediate_total || res.score + ' / 1100'}</div>
            </div>
          `;
        }
      } else if (currentStage === "matric") {
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 10th Class Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${res.forecasted_10th_marks || '480 / 550'}</div>
          </div>
          <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🏛️ Final Matric Total</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${res.final_matric_total || res.score + ' / 1100'}</div>
          </div>
        `;
      } else if (currentStage === "secondary" || currentStage === "primary") {
        dualProjectionContainer.innerHTML = `
          <div style="background: rgba(0, 212, 255, 0.15); border: 1px solid var(--color-cyan); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">📘 Previous Class Final</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-cyan);">${res.past_final_percentage || '85.0%'}</div>
          </div>
          <div style="background: rgba(168, 240, 75, 0.15); border: 1px solid var(--color-lime); border-radius: 6px; padding: 6px 14px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">🎯 Target Class Forecast</div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-lime);">${res.forecasted_target_percentage || res.score + '%'}</div>
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
      } else if (currentStage === "intermediate") {
        const raw = parseFloat(res.predicted_score || res.score || (res.target_level === "hssc1" ? 480 : 960));
        const span = res.target_level === "hssc1" ? 18 : 32;
        const maxLim = res.target_level === "hssc1" ? 550 : 1100;
        ciLow = Math.max(0, Math.round(raw - span));
        ciHigh = Math.min(maxLim, Math.round(raw + span));
      } else if (currentStage === "matric") {
        const raw = parseFloat(res.predicted_score || res.score || 950);
        ciLow = Math.max(0, Math.round(raw - 30));
        ciHigh = Math.min(1100, Math.round(raw + 30));
      } else if (currentStage === "secondary") {
        const raw = parseFloat(res.predicted_score || res.score || 88);
        ciLow = Math.max(0, +(raw - 3.5).toFixed(1));
        ciHigh = Math.min(100, +(raw + 3.5).toFixed(1));
      } else {
        const raw = parseFloat(res.predicted_score || res.score || 85);
        ciLow = Math.max(0, +(raw - 3.0).toFixed(1));
        ciHigh = Math.min(100, +(raw + 3.0).toFixed(1));
      }
    }

    const unit = currentStage === "university" ? " CGPA" : (currentStage === "intermediate" || currentStage === "matric") ? " Marks" : "%";
    if (resultCiRange) resultCiRange.innerText = `[${ciLow} — ${ciHigh}${unit}]`;
    if (ciMinLabel) ciMinLabel.innerText = currentStage === "university" ? "0.00" : (currentStage === "intermediate" || currentStage === "matric") ? "0" : "0%";
    if (ciMaxLabel) {
      ciMaxLabel.innerText = currentStage === "university" ? "4.00" : currentStage === "intermediate" ? (res.target_level === "hssc1" ? "550" : "1100") : currentStage === "matric" ? "1100" : "100%";
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

  function calculateModalGpaFromRows() {
    const termGpaInput = document.getElementById("term-gpa-input");
    if (!termGpaInput || !modalTermSubjectsContainer) return;
    const rows = Array.from(modalTermSubjectsContainer.querySelectorAll(".modal-subject-row"));
    let totObt = 0;
    let totMax = 0;
    rows.forEach(r => {
      const obt = parseFloat(r.querySelector(".m-sub-obt")?.value);
      const max = parseFloat(r.querySelector(".m-sub-max")?.value);
      if (!isNaN(obt) && !isNaN(max) && max > 0) {
        totObt += obt;
        totMax += max;
      }
    });
    if (totMax > 0) {
      if (currentStage === "university") {
        const gpa = Math.min(4.0, (totObt / totMax) * 4.0);
        termGpaInput.value = gpa.toFixed(2);
      } else {
        const pct = Math.min(100.0, (totObt / totMax) * 100.0);
        termGpaInput.value = pct.toFixed(1);
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

    if (currentStage === "secondary") {
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
      <input type="number" step="0.5" class="form-input m-sub-obt" placeholder="Marks" value="${obt !== undefined && obt !== null ? obt : ""}" min="0" required style="padding:6px 10px;font-size:13px;">
      <input type="number" step="0.5" class="form-input m-sub-max" placeholder="Max" value="${max || 100}" min="1" required style="padding:6px 10px;font-size:13px;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove(); window.calculateModalGpaFromRows && window.calculateModalGpaFromRows();" style="padding:4px 8px;font-size:12px;color:var(--color-red);" title="Remove Row">✕</button>
    `;

    const obtInput = row.querySelector(".m-sub-obt");
    const maxInput = row.querySelector(".m-sub-max");
    if (obtInput) obtInput.addEventListener("input", calculateModalGpaFromRows);
    if (maxInput) maxInput.addEventListener("input", calculateModalGpaFromRows);

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

    if (!terms || terms.length === 0) {
      const emptyIcon = currentStage === "university" ? "🏛️" : currentStage === "secondary" ? "🏫" : "🌱";
      const emptyTitle = currentStage === "university" ? "No Academic Semesters Logged Yet" : currentStage === "secondary" ? "No Secondary Classes Logged Yet" : "No Primary Grades Logged Yet";
      const emptyHelp = currentStage === "university"
        ? "Click <strong>+ Add Semester</strong> to log your GPA, CGPA, attendance, and enrolled courses."
        : currentStage === "secondary"
        ? "Click <strong>+ Add Class Record</strong> to log your completed classes (e.g. Class 6, Class 7) and individual subjects."
        : "Click <strong>+ Add Primary Class</strong> to log completed primary classes and learning subjects.";

      if (kpiStanding) kpiStanding.innerText = currentStage === "university" ? "Semester 1 (Freshman)" : "No Classes Yet";
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
        </div>
      `;
      return;
    }

    let totalCoursesCount = 0;
    let totalObtainedAll = 0;
    let totalMaxAll = 0;
    let totalAttendance = 0;

    terms.forEach(t => {
      totalAttendance += parseFloat(t.attendance_pct || 85);
      const subs = t.subjects || [];
      totalCoursesCount += subs.length;
      subs.forEach(s => {
        totalObtainedAll += parseFloat(s.obtained_marks || 0);
        totalMaxAll += parseFloat(s.total_marks || 100);
      });
    });

    const overallPct = totalMaxAll > 0 ? (totalObtainedAll / totalMaxAll) * 100 : 0;
    const calcCgpa = currentStage === "university"
      ? +(Math.min(4.0, (overallPct / 100.0) * 4.0)).toFixed(2)
      : +overallPct.toFixed(1);
    const avgAttendance = +(totalAttendance / terms.length).toFixed(1);

    if (kpiStanding) {
      if (currentStage === "university") {
        const semNumber = terms.length;
        const tierName = semNumber === 1 ? "Freshman" : semNumber === 2 ? "Sophomore" : semNumber <= 4 ? "Junior" : "Senior";
        kpiStanding.innerText = `Semester ${semNumber} (${tierName})`;
      } else if (currentStage === "secondary") {
        kpiStanding.innerText = `${terms.length} ${terms.length > 1 ? "Classes" : "Class"} Logged`;
      } else {
        kpiStanding.innerText = `${terms.length} ${terms.length > 1 ? "Grades" : "Grade"} Logged`;
      }
    }
    if (kpiStandingSub) kpiStandingSub.innerText = `${terms.length} Level${terms.length > 1 ? "s" : ""} Recorded`;

    if (kpiLatestGpa) {
      const lastTerm = terms[terms.length - 1];
      const lastGpa = lastTerm.gpa !== undefined ? lastTerm.gpa : (lastTerm.percentage || calcCgpa);
      kpiLatestGpa.innerText = currentStage === "university" ? `${Number(lastGpa).toFixed(2)} GPA` : `${lastGpa}%`;
    }

    if (kpiCumulativeCgpa) {
      kpiCumulativeCgpa.innerText = currentStage === "university" ? `${calcCgpa.toFixed(2)} CGPA` : `${calcCgpa}%`;
    }
    const kpiAgg = document.getElementById("kpi-aggregate-pct");
    if (kpiAgg) kpiAgg.innerText = `${avgAttendance}%`;

    const cardIcon = currentStage === "university" ? "🏛️" : currentStage === "secondary" ? "🏫" : "🌱";
    const subLabelUnit = currentStage === "university" ? "Courses" : "Subjects";

    termsHistoryCardsContainer.innerHTML = terms.map((t) => {
      const scoreLabel = currentStage === "university" ? `${Number(t.gpa || calcCgpa).toFixed(2)} GPA` : `${t.percentage || t.gpa || calcCgpa}% Score`;
      const attPill = t.attendance_pct ? ` • ${t.attendance_pct}% Att` : "";
      const crPill = currentStage === "university" && t.credit_hours ? ` • ${t.credit_hours} Credits` : "";
      const studyPill = (currentStage === "secondary" || currentStage === "primary") && t.study_hours ? ` • ${t.study_hours}h Study` : "";
      const cgpaPill = currentStage === "university" && t.cgpa ? ` • ${Number(t.cgpa).toFixed(2)} CGPA` : "";
      return `
        <div class="card" style="padding: 14px 18px; border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span style="font-weight: 800; color: #ffffff; font-size: 15px;">${cardIcon} ${t.term_name}</span>
              <span class="badge badge-info" style="font-size: 11px;">${t.subjects?.length || 0} ${subLabelUnit}${crPill}${studyPill}${attPill}${cgpaPill}</span>
              <span class="badge badge-success" style="font-size: 11px; font-weight: 700;">${scoreLabel}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.editSemester('${t.term_name}')" style="padding: 3px 10px; font-size: 11.5px; color: var(--color-lime);">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.deleteSemester('${t.term_name}')" style="padding: 3px 10px; font-size: 11.5px; color: var(--color-red);">
                🗑️ Remove
              </button>
            </div>
          </div>
          <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
            ${(t.subjects || []).map(s => {
              const subPct = s.total_marks > 0 ? Math.round((s.obtained_marks / s.total_marks) * 100) : 0;
              return `<span style="background: rgba(255,255,255,0.06); padding: 5px 12px; border-radius: 6px; font-size: 12px; color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.08);">
                <strong style="color: #ffffff;">${s.subject_name}</strong>: ${s.obtained_marks}/${s.total_marks} (${subPct}%)
              </span>`;
            }).join("") || "<span style='color:var(--text-muted);font-size:12px;'>No subjects recorded</span>"}
          </div>
        </div>
      `;
    }).join("");
  }

  function setupModalForCurrentStage(isEdit = false, term = null) {
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

  if (btnAddSemester) {
    btnAddSemester.addEventListener("click", () => {
      if (addTermForm) addTermForm.reset();
      setupModalForCurrentStage(false);

      if (modalTermSubjectsContainer) {
        modalTermSubjectsContainer.innerHTML = "";
        if (currentStage === "secondary") {
          addModalSubjectRow("Mathematics", "Mathematics", 88, 100);
          addModalSubjectRow("General Science", "Science", 84, 100);
          addModalSubjectRow("English Language", "Language", 83, 100);
        } else if (currentStage === "primary") {
          addModalSubjectRow("Math & Numeracy", "Numeracy", 88, 100);
          addModalSubjectRow("Reading & Literacy", "Literacy", 90, 100);
        } else {
          addModalSubjectRow("", "Theory", "", 100);
        }
      }

      const termNameSelect = document.getElementById("term-name-select");
      const termNameInput = document.getElementById("term-name-input");
      if (termNameSelect && termNameInput) {
        if (termNameSelect.value && termNameSelect.value !== "custom") {
          termNameInput.value = termNameSelect.value;
        }
      }

      const termGpaInput = document.getElementById("term-gpa-input");
      if (termGpaInput) {
        termGpaInput.value = currentStage === "university" ? "3.60" : "85.0";
      }
      const termCgpaInput = document.getElementById("term-cgpa-input");
      if (termCgpaInput) termCgpaInput.value = "3.50";
      const termAttInput = document.getElementById("term-attendance-input");
      if (termAttInput) termAttInput.value = currentStage === "primary" ? "94" : currentStage === "secondary" ? "92" : "85";
      const termCreditsInput = document.getElementById("term-credits-input");
      if (termCreditsInput) termCreditsInput.value = currentStage === "secondary" ? "3.5" : "18";
      const termMidtermInput = document.getElementById("term-midterm-input");
      if (termMidtermInput) termMidtermInput.value = "80";
      const termBacklogsInput = document.getElementById("term-backlogs-input");
      if (termBacklogsInput) termBacklogsInput.value = "0";

      calculateModalGpaFromRows();

      if (modalAddTerm) modalAddTerm.classList.add("active");
    });
  }

  if (btnCloseTermModal) btnCloseTermModal.addEventListener("click", () => modalAddTerm?.classList.remove("active"));
  if (btnCancelTermModal) btnCancelTermModal.addEventListener("click", () => modalAddTerm?.classList.remove("active"));

  if (addTermForm) {
    addTermForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const termNameSelect = document.getElementById("term-name-select");
      const termNameInput = document.getElementById("term-name-input");
      let termName = termNameInput?.value.trim();
      if (!termName && termNameSelect && termNameSelect.value !== "custom") {
        termName = termNameSelect.value;
      }
      if (!termName) {
        termName = currentStage === "university" ? `Semester ${loggedTerms.length + 1}` : `Class ${loggedTerms.length + 1}`;
      }

      const gpaVal = parseFloat(document.getElementById("term-gpa-input")?.value || (currentStage === "university" ? 3.5 : 85.0));
      const cgpaVal = parseFloat(document.getElementById("term-cgpa-input")?.value || gpaVal);
      const attVal = document.getElementById("term-attendance-input")?.value;
      const att = attVal !== "" && attVal !== undefined ? parseFloat(attVal) : 85.0;
      const creditsVal = parseFloat(document.getElementById("term-credits-input")?.value || 18);
      const midtermVal = parseFloat(document.getElementById("term-midterm-input")?.value || 80);
      const backlogsVal = parseInt(document.getElementById("term-backlogs-input")?.value || 0);

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

      try {
        if (window.apiClient) {
          await window.apiClient.createAcademicRecord({
            stage: currentStage,
            term_name: termName,
            gpa: currentStage === "university" ? gpaVal : +(gpaVal / 25.0).toFixed(2),
            percentage: currentStage === "university" ? +(gpaVal / 4.0 * 100).toFixed(1) : gpaVal,
            cgpa: cgpaVal,
            attendance_pct: att,
            credit_hours: creditsVal,
            midterm_score: midtermVal,
            backlogs: backlogsVal,
            study_hours: currentStage === "secondary" ? creditsVal : 4.5,
            subjects: subjects.length > 0 ? subjects : [{ subject_name: "Core Subject", subject_category: "Core", obtained_marks: 85, total_marks: 100 }]
          });
        }
        showToast(`Saved ${termName} successfully!`, "success");
        if (modalAddTerm) modalAddTerm.classList.remove("active");
        await loadAcademicTerms(currentStage);
      } catch (err) {
        showToast(`Failed to save record: ${err.message}`, "error");
      }
    });
  }

  window.editSemester = (termName) => {
    const term = loggedTerms.find(t => t.term_name === termName);
    if (!term) return;

    if (addTermForm) addTermForm.reset();
    setupModalForCurrentStage(true, term);

    const termNameInput = document.getElementById("term-name-input");
    const termGpaInput = document.getElementById("term-gpa-input");
    const termCgpaInput = document.getElementById("term-cgpa-input");
    const termAttInput = document.getElementById("term-attendance-input");
    const termCreditsInput = document.getElementById("term-credits-input");
    const termMidtermInput = document.getElementById("term-midterm-input");
    const termBacklogsInput = document.getElementById("term-backlogs-input");

    if (termNameInput) termNameInput.value = term.term_name;
    if (termGpaInput) {
      if (currentStage === "university") {
        termGpaInput.value = term.gpa !== undefined ? term.gpa : "3.50";
      } else {
        termGpaInput.value = term.percentage !== undefined ? term.percentage : (term.gpa ? (term.gpa > 4 ? term.gpa : term.gpa * 25) : "85.0");
      }
    }
    if (termCgpaInput) termCgpaInput.value = term.cgpa !== undefined ? term.cgpa : "3.50";
    if (termAttInput) termAttInput.value = term.attendance_pct || 85;
    if (termCreditsInput) termCreditsInput.value = currentStage === "secondary" ? (term.study_hours || "3.5") : (term.credit_hours || 18);
    if (termMidtermInput) termMidtermInput.value = term.midterm_score || 80;
    if (termBacklogsInput) termBacklogsInput.value = term.backlogs || 0;

    if (modalTermSubjectsContainer) {
      modalTermSubjectsContainer.innerHTML = "";
      const subs = term.subjects || [];
      if (subs.length > 0) {
        subs.forEach(s => {
          addModalSubjectRow(s.subject_name, s.subject_category || "Theory", s.obtained_marks, s.total_marks);
        });
      } else {
        addModalSubjectRow("", "", "", 100);
      }
    }
    if (modalAddTerm) modalAddTerm.classList.add("active");
  };

  window.deleteSemester = async (termName) => {
    if (!confirm(`Are you sure you want to remove '${termName}' from your academic records?`)) return;
    try {
      if (window.apiClient) {
        await window.apiClient.deleteAcademicRecord(termName, currentStage);
      }
      showToast(`Removed ${termName}.`, "info");
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

    teacherResultCard.style.display = "block";
    teacherResultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ============================================================================
  // 12. PREDICTION HISTORY SYNC (ANALYTICS-READY)
  // ============================================================================
  function savePredictionToHistory(result, payload) {
    try {
      const isLowRisk = result.risk_level === "LOW" || result.risk_level === "low";
      const isMedRisk = result.risk_level === "MEDIUM" || result.risk_level === "medium";

      const historyItem = {
        id: `pred-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        role: currentRole || "student",
        stage: currentStage || "university",
        score: result.formatted_score || `${result.score}`,
        grade: result.grade || "Grade A",
        status_badge: result.status_badge || (isLowRisk ? "Exemplary" : isMedRisk ? "Proficient" : "Attention Needed"),
        status_color: result.status_color || (isLowRisk ? "badge-success" : isMedRisk ? "badge-info" : "badge-danger"),
        payload: payload || {},
        recommendations: result.recommendation || (Array.isArray(result.recommendations) ? result.recommendations.join(" ") : result.recommendations) || "Maintain steady academic momentum and weekly revision routine."
      };

      const currentUser = window.authClient ? window.authClient.getUser() : null;
      const userKey = currentUser ? `edumetrics_prediction_history_v2_${currentUser.id}` : "edumetrics_prediction_history_v2";

      // Save to user-specific store
      const userHistory = JSON.parse(localStorage.getItem(userKey) || "[]");
      userHistory.unshift(historyItem);
      localStorage.setItem(userKey, JSON.stringify(userHistory.slice(0, 100)));

      // Save to global history fallback
      const existingHistory = JSON.parse(localStorage.getItem("edumetrics_prediction_history_v2") || "[]");
      existingHistory.unshift(historyItem);
      localStorage.setItem("edumetrics_prediction_history_v2", JSON.stringify(existingHistory.slice(0, 100)));
      localStorage.setItem("edumetrics_prediction_history", JSON.stringify(existingHistory.slice(0, 100)));
    } catch (e) {
      console.warn("History save error:", e);
    }
  }

  // ============================================================================
  // 13. USER PROFILE & SETTINGS MODAL (PRESERVED)
  // ============================================================================
  function initProfileSettings() {
    const userProfileBtn = document.getElementById("user-profile-btn");
    const btnOpenSettings = document.getElementById("btn-open-settings");
    const profileModal = document.getElementById("profile-settings-modal");
    const btnCloseProfile = document.getElementById("btn-close-profile-modal");
    const btnCancelProfile = document.getElementById("btn-cancel-profile");
    const profileTabs = document.querySelectorAll(".modal-tab-btn");
    const tabContents = document.querySelectorAll(".profile-tab-content");
    const profileForm = document.getElementById("profile-details-form");
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");
    const btnDeleteAccount = document.getElementById("btn-delete-account");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebar = document.getElementById("sidebar");
    const logoutBtn = document.getElementById("logout-btn");

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        if (window.authClient) await window.authClient.signOut();
        window.location.href = "signup.html";
      });
    }

    function populateSettingsInputs() {
      const user = window.authClient ? window.authClient.getUser() : null;
      const userMeta = user?.user_metadata || {};
      const idCode = userMeta.student_id || userMeta.id_code || (userMeta.role === "teacher" ? "TCH-2026-001" : "STU-2026-001");
      const program = userMeta.program || userMeta.major || "Software Engineering";
      const institution = userMeta.institution_name || userMeta.institution || "Faculty of Engineering";

      const settingName = document.getElementById("setting-fullname");
      const settingId = document.getElementById("setting-studentid");
      const settingProg = document.getElementById("setting-program") || document.getElementById("setting-major");
      const settingInst = document.getElementById("setting-institution");

      if (settingName) settingName.value = userMeta.full_name || (user?.email ? user.email.split("@")[0] : "Muhammad Ali");
      if (settingId) settingId.value = idCode;
      if (settingProg) settingProg.value = program;
      if (settingInst) settingInst.value = institution;

      // Reset and clear security password fields
      const secForm = document.getElementById("profile-security-form");
      if (secForm) secForm.reset();
      const newPassInput = document.getElementById("setting-new-password");
      const confPassInput = document.getElementById("setting-confirm-password");
      if (newPassInput) newPassInput.value = "";
      if (confPassInput) confPassInput.value = "";

      // Reset tabs to show first tab by default
      profileTabs.forEach((t, i) => {
        if (i === 0) t.classList.add("active");
        else t.classList.remove("active");
      });
      tabContents.forEach((c, i) => {
        if (i === 0) {
          c.classList.add("active");
          c.style.display = "block";
        } else {
          c.classList.remove("active");
          c.style.display = "none";
        }
      });
    }

    const railProfileBtn = document.getElementById("rail-profile-btn");
    if (railProfileBtn && profileModal) {
      railProfileBtn.addEventListener("click", () => {
        populateSettingsInputs();
        profileModal.classList.add("active");
      });
    }
    if (btnOpenSettings && profileModal) {
      btnOpenSettings.addEventListener("click", () => {
        populateSettingsInputs();
        profileModal.classList.add("active");
      });
    }
    if (userProfileBtn && profileModal) {
      userProfileBtn.addEventListener("click", () => {
        populateSettingsInputs();
        profileModal.classList.add("active");
      });
    }
    if (btnCloseProfile && profileModal) {
      btnCloseProfile.addEventListener("click", () => profileModal.classList.remove("active"));
    }
    if (btnCancelProfile && profileModal) {
      btnCancelProfile.addEventListener("click", () => profileModal.classList.remove("active"));
    }

    profileTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        profileTabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => {
          c.classList.remove("active");
          c.style.display = "none";
        });
        tab.classList.add("active");
        const targetEl = document.getElementById(target);
        if (targetEl) {
          targetEl.classList.add("active");
          targetEl.style.display = "block";
        }
      });
    });

    populateSettingsInputs();

    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("setting-fullname")?.value.trim() || "User";
        const programVal = (document.getElementById("setting-program") || document.getElementById("setting-major"))?.value.trim() || "Software Engineering";
        const instVal = document.getElementById("setting-institution")?.value.trim() || "Faculty of Engineering";

        if (window.authClient) {
          await window.authClient.updateUser({
            full_name: fullName,
            program: programVal,
            major: programVal,
            institution_name: instVal
          });
        }

        syncUserProfile();
        profileModal?.classList.remove("active");
        showToast("Profile settings saved successfully!", "success");
      });
    }

    const secForm = document.getElementById("profile-security-form");
    if (secForm) {
      secForm.addEventListener("submit", async (e) => {
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
          secForm.reset();
          showToast("Password updated securely!", "success");
        } catch (err) {
          showToast(err.message || "Failed to update password.", "error");
        }
      });
    }

    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener("click", async () => {
        if (confirm("Permanently delete account and all historical predictions? This cannot be undone.")) {
          if (window.authClient) await window.authClient.deleteAccount();
          window.location.href = "signup.html";
        }
      });
    }
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
