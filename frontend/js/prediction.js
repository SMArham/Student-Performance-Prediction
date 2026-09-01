/**
 * AI Academic Performance Prediction & Analytics Platform (Page 2)
 * EduMetrics AI - Student Success & Academic Performance Prediction Platform
 */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  // ============================================================================
  // 1. GLOBAL STATE MANAGEMENT
  // ============================================================================
  let currentRole = "student"; // 'student' | 'teacher'
  let currentStudentStep = 1;  // 1 to 5
  let currentStage = "university"; // 'university' | 'intermediate' | 'matric' | 'secondary' | 'primary'
  let currentTeacherTool = "individual"; // 'individual' | 'class' | 'upload'
  let pendingRoleSwitch = null;
  let hasUnsavedFormData = false;
  let activeStudentPrediction = null;

  // Sync Profile & Smart Avatar for Sidebar
  function syncUserProfile() {
    const currentUser = window.authClient ? window.authClient.getUser() : null;
    const meta = currentUser?.user_metadata || {};
    const displayName = meta.full_name || "Muhammad Ali";
    const gender = meta.gender || "auto";
    const studentAvatarEl = document.getElementById("student-avatar");
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");

    function getAvatar(name, gen) {
      if (typeof window.getSmartAvatar === "function") return window.getSmartAvatar(name, gen);
      const isFemale = gen === "female" || ["fatima", "ayesha", "sara", "sana", "maryam", "zainab", "hira", "anum", "mahnoor", "noor", "alishba", "dua", "zoya", "kinza", "rabia", "sadia", "laiba", "eman"].some(fn => (name || "").toLowerCase().includes(fn));
      return isFemale 
        ? `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&clothingColor=262e33,3c4f5c,5199e4,25557c,3c443c`;
    }

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentAvatarEl) studentAvatarEl.src = meta.avatar_url || getAvatar(displayName, gender);
    if (studentIdCodeEl) studentIdCodeEl.innerText = meta.student_id || "SE-2023-049";
  }

  syncUserProfile();

  // Presets for Academic Subjects by Stage
  const defaultSubjectsStore = {
    university: [
      { id: "sub-1", name: "Data Structures & Algorithms", category: "Core Science", term: "Semester 3", obtained: 88, max: 100, credits: 3 },
      { id: "sub-2", name: "Database Management Systems", category: "Core Science", term: "Semester 3", obtained: 82, max: 100, credits: 3 },
      { id: "sub-3", name: "Probability & Statistics", category: "General", term: "Semester 3", obtained: 79, max: 100, credits: 3 },
      { id: "sub-4", name: "Software Engineering Principles", category: "Core Science", term: "Semester 3", obtained: 91, max: 100, credits: 3 }
    ],
    intermediate: [
      { id: "sub-1", name: "Physics (Theory & Practical)", category: "Core Science", term: "HSSC-I", obtained: 74, max: 85, credits: 0 },
      { id: "sub-2", name: "Chemistry / Computer Science", category: "Core Science", term: "HSSC-I", obtained: 78, max: 85, credits: 0 },
      { id: "sub-3", name: "Mathematics / Biology", category: "Core Science", term: "HSSC-I", obtained: 89, max: 100, credits: 0 },
      { id: "sub-4", name: "English Compulsory", category: "Humanities", term: "HSSC-I", obtained: 82, max: 100, credits: 0 }
    ],
    matric: [
      { id: "sub-1", name: "Mathematics (Algebra & Geometry)", category: "Core Science", term: "SSC-I", obtained: 68, max: 75, credits: 0 },
      { id: "sub-2", name: "Physics", category: "Core Science", term: "SSC-I", obtained: 65, max: 75, credits: 0 },
      { id: "sub-3", name: "Chemistry", category: "Core Science", term: "SSC-I", obtained: 62, max: 75, credits: 0 },
      { id: "sub-4", name: "English", category: "Humanities", term: "SSC-I", obtained: 66, max: 75, credits: 0 }
    ],
    secondary: [
      { id: "sub-1", name: "General Science", category: "Core Science", term: "Current Term", obtained: 16, max: 20, credits: 0 },
      { id: "sub-2", name: "Mathematics", category: "Core Science", term: "Current Term", obtained: 17, max: 20, credits: 0 },
      { id: "sub-3", name: "English & Social Studies", category: "Humanities", term: "Current Term", obtained: 15, max: 20, credits: 0 }
    ],
    primary: [
      { id: "sub-1", name: "Basic Mathematics & Numbers", category: "Core Science", term: "Current Term", obtained: 88, max: 100, credits: 0 },
      { id: "sub-2", name: "Reading Comprehension & Phonics", category: "Humanities", term: "Current Term", obtained: 92, max: 100, credits: 0 },
      { id: "sub-3", name: "General Knowledge & Science", category: "General", term: "Current Term", obtained: 85, max: 100, credits: 0 }
    ]
  };

  // Stage Preset Suggestions for Modal
  const subjectPresetOptions = {
    university: [
      "Custom Subject / Course...",
      "Data Structures & Algorithms",
      "Object Oriented Programming",
      "Database Systems",
      "Linear Algebra & Differential Eq",
      "Computer Networks",
      "Operating Systems",
      "Artificial Intelligence Principles",
      "Software Quality Assurance"
    ],
    intermediate: [
      "Custom Subject / Course...",
      "Physics (Part 1 / 2)",
      "Chemistry (Part 1 / 2)",
      "Mathematics (Calculus & Analytic)",
      "Biology (Botany & Zoology)",
      "Computer Science (C / Python)",
      "English Compulsory",
      "Urdu Compulsory",
      "Islamic Studies / Pak Studies"
    ],
    matric: [
      "Custom Subject / Course...",
      "Mathematics (SSC)",
      "Physics (SSC)",
      "Chemistry (SSC)",
      "Biology (SSC)",
      "Computer Science (SSC)",
      "English Literature & Grammar",
      "Urdu Literature",
      "Pakistan Studies"
    ],
    secondary: [
      "Custom Subject / Course...",
      "General Mathematics",
      "General Science",
      "English Language",
      "Social Studies / History",
      "Computer Fundamentals",
      "Art & Design"
    ],
    primary: [
      "Custom Subject / Course...",
      "Basic Mathematics & Arithmetic",
      "Reading & Creative Writing",
      "Environmental Studies & Science",
      "Social Skills & Drawing"
    ]
  };

  // Live in-memory subjects store with LocalStorage persistence
  let subjectsStore = {};
  try {
    const saved = localStorage.getItem("edumetrics_subjects_store_v2");
    if (saved) {
      subjectsStore = JSON.parse(saved);
    } else {
      subjectsStore = JSON.parse(JSON.stringify(defaultSubjectsStore));
    }
  } catch (e) {
    subjectsStore = JSON.parse(JSON.stringify(defaultSubjectsStore));
  }

  // Teacher Class Roster In-Memory Data
  let classRoster = [
    { roll: "01", name: "Ayesha Malik", attendance: 92, test: 88, assignment: 95, midterm: "A" },
    { roll: "02", name: "Bilal Tariq", attendance: 84, test: 76, assignment: 80, midterm: "B" },
    { roll: "03", name: "Danish Ahmed", attendance: 65, test: 54, assignment: 60, midterm: "D" },
    { roll: "04", name: "Fatima Noor", attendance: 95, test: 94, assignment: 98, midterm: "A+" },
    { roll: "05", name: "Hamza Khan", attendance: 72, test: 68, assignment: 70, midterm: "C" }
  ];

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

  // What-If Simulator Elements
  const simSliderStudy = document.getElementById("sim-slider-study");
  const simSliderAtt = document.getElementById("sim-slider-att");
  const simSliderAssign = document.getElementById("sim-slider-assign");
  const simValStudy = document.getElementById("sim-val-study");
  const simValAtt = document.getElementById("sim-val-att");
  const simValAssign = document.getElementById("sim-val-assign");
  const simScenarioCurrent = document.getElementById("sim-scenario-current");
  const simScenarioSimulated = document.getElementById("sim-scenario-simulated");
  const simScenarioBest = document.getElementById("sim-scenario-best");

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

    // 4. Adapt & Render Academic Subjects CRUD Table
    renderSubjectsTable();
    updateSubjectPresetOptions();
  }

  function renderStep2AcademicFields(stage) {
    if (!dynamicAcademicFields) return;
    let html = "";

    if (stage === "university") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_uni_cgpa">Current / Baseline CGPA (0.00 - 4.00) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" step="0.01" min="0.0" max="4.0" id="f_uni_cgpa" class="form-input" placeholder="e.g. 3.55" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_uni_semester">Current Semester</label>
            <select id="f_uni_semester" class="form-select">
              <option value="1">Semester 1 (Freshman)</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3 (Sophomore)</option>
              <option value="4" selected>Semester 4</option>
              <option value="5">Semester 5 (Junior)</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7 (Senior)</option>
              <option value="8">Semester 8 (Final Year)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_uni_credits">Enrolled Credit Hours</label>
            <input type="number" id="f_uni_credits" class="form-input" min="3" max="24" placeholder="e.g. 15">
          </div>
        </div>
        <div class="form-grid-3col" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_uni_att">Lecture Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_uni_att" class="form-input" min="0" max="100" placeholder="e.g. 85" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_uni_midterm">Midterm Exam Average (%)</label>
            <input type="number" id="f_uni_midterm" class="form-input" min="0" max="100" placeholder="e.g. 80">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_uni_backlogs">Past Backlogs / Failed Courses</label>
            <input type="number" id="f_uni_backlogs" class="form-input" min="0" max="10" placeholder="e.g. 0">
          </div>
        </div>
      `;
    } else if (stage === "intermediate") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_inter_group">Academic Group <span style="color:var(--accent-rose)">*</span></label>
            <select id="f_inter_group" class="form-select">
              <option value="Pre-Engineering" selected>Pre-Engineering</option>
              <option value="Pre-Medical">Pre-Medical</option>
              <option value="ICS">ICS (Computer Science)</option>
              <option value="I.Com">I.Com (Commerce)</option>
              <option value="Humanities">Humanities / Arts</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_ssc">Matric (10th) Overall Marks (out of 1100) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_ssc" class="form-input" min="0" max="1100" placeholder="e.g. 940" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_hssc1">1st Year (11th) Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_hssc1" class="form-input" min="0" max="550" placeholder="e.g. 440" required>
          </div>
        </div>
        <div class="form-grid-3col" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="f_inter_att">College Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_inter_att" class="form-input" min="0" max="100" placeholder="e.g. 85" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_college_type">Institution Type</label>
            <select id="f_inter_college_type" class="form-select">
              <option value="Private" selected>Private College / Institute</option>
              <option value="Government">Government Higher Secondary</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_inter_lab">Practical / Lab Competency</label>
            <select id="f_inter_lab" class="form-select">
              <option value="Excellent" selected>Excellent (Consistent hands-on practice)</option>
              <option value="Good">Good (Satisfactory experiments)</option>
              <option value="Needs Work">Needs Work (Irregular lab practice)</option>
            </select>
          </div>
        </div>
      `;
    } else if (stage === "matric") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_matric_ssc1">9th Class (SSC-I) Marks (out of 550) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_matric_ssc1" class="form-input" min="0" max="550" placeholder="e.g. 465" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_expected">Expected 10th (SSC-II) Target Marks</label>
            <input type="number" id="f_matric_expected" class="form-input" min="0" max="550" placeholder="e.g. 480">
          </div>
          <div class="form-group">
            <label class="form-label" for="f_matric_att">School Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_matric_att" class="form-input" min="0" max="100" placeholder="e.g. 90" required>
          </div>
        </div>
        <div class="form-grid-2col" style="margin-top: var(--space-4);">
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
      `;
    } else if (stage === "secondary") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_sec_g1">Period 1 Grade / Quiz Average (out of 20) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_sec_g1" class="form-input" min="0" max="20" placeholder="e.g. 16" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_sec_g2">Period 2 Grade / Midterm (out of 20) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_sec_g2" class="form-input" min="0" max="20" placeholder="e.g. 17" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_sec_absences">Class Absences (Days) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_sec_absences" class="form-input" min="0" max="50" placeholder="e.g. 3" required>
          </div>
        </div>
      `;
    } else if (stage === "primary") {
      html = `
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="f_prim_math">Basic Mathematics Score (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_prim_math" class="form-input" min="0" max="100" placeholder="e.g. 86" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_prim_read">Reading & Literacy Score (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_prim_read" class="form-input" min="0" max="100" placeholder="e.g. 90" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f_prim_att">Attendance Track (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" id="f_prim_att" class="form-input" min="0" max="100" placeholder="e.g. 94" required>
          </div>
        </div>
      `;
    }

    dynamicAcademicFields.innerHTML = html;
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
            <option value="Yes" selected>Yes (Enrolled in coaching / tutoring)</option>
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
      <div class="form-grid-2col" style="margin-bottom: var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="f_attentive_level">Classroom Focus & Attentiveness</label>
          <select id="f_attentive_level" class="form-select">
            <option value="High" selected>High (Actively engaged & attentive)</option>
            <option value="Moderate">Moderate (Good engagement with occasional lapses)</option>
            <option value="Low">Low (Easily distracted / needs refocusing)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="f_comm_skill">Communication & Verbal Presentation</label>
          <select id="f_comm_skill" class="form-select">
            <option value="Excellent" selected>Exceptional (Articulate, clear & confident)</option>
            <option value="Good">Good (Clear communicator)</option>
            <option value="Developing">Developing (Average confidence)</option>
            <option value="Needs Support">Needs Support</option>
          </select>
        </div>
      </div>
      <div class="form-grid-3col">
        <div class="form-group">
          <label class="form-label" for="f_self_motivation">Academic Motivation (1 - 10)</label>
          <input type="number" id="f_self_motivation" class="form-input" min="1" max="10" placeholder="e.g. 9">
        </div>
        <div class="form-group">
          <label class="form-label" for="f_self_confidence">Exam Confidence (1 - 10)</label>
          <input type="number" id="f_self_confidence" class="form-input" min="1" max="10" placeholder="e.g. 8">
        </div>
        <div class="form-group">
          <label class="form-label" for="f_self_consistency">Study Consistency (1 - 10)</label>
          <input type="number" id="f_self_consistency" class="form-input" min="1" max="10" placeholder="e.g. 9">
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
      if (currentStage === "university") {
        const cgpa = parseFloat(document.getElementById("f_uni_cgpa")?.value);
        const att = parseFloat(document.getElementById("f_uni_att")?.value);
        if (isNaN(cgpa) || cgpa < 0.0 || cgpa > 4.0) errors.push("Current CGPA must be between 0.00 and 4.00.");
        if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0% and 100%.");
      } else if (currentStage === "intermediate") {
        const ssc = parseFloat(document.getElementById("f_inter_ssc")?.value);
        const hssc1 = parseFloat(document.getElementById("f_inter_hssc1")?.value);
        const att = parseFloat(document.getElementById("f_inter_att")?.value);
        if (isNaN(ssc) || ssc < 0 || ssc > 1100) errors.push("Matric marks must be between 0 and 1100.");
        if (isNaN(hssc1) || hssc1 < 0 || hssc1 > 550) errors.push("1st Year marks must be between 0 and 550.");
        if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0% and 100%.");
      } else if (currentStage === "matric") {
        const ssc1 = parseFloat(document.getElementById("f_matric_ssc1")?.value);
        const att = parseFloat(document.getElementById("f_matric_att")?.value);
        if (isNaN(ssc1) || ssc1 < 0 || ssc1 > 550) errors.push("9th class marks must be between 0 and 550.");
        if (isNaN(att) || att < 0 || att > 100) errors.push("Attendance must be between 0% and 100%.");
      } else if (currentStage === "secondary") {
        const g1 = parseFloat(document.getElementById("f_sec_g1")?.value);
        const g2 = parseFloat(document.getElementById("f_sec_g2")?.value);
        if (isNaN(g1) || g1 < 0 || g1 > 20) errors.push("Period 1 score must be between 0 and 20.");
        if (isNaN(g2) || g2 < 0 || g2 > 20) errors.push("Period 2 score must be between 0 and 20.");
      } else if (currentStage === "primary") {
        const math = parseFloat(document.getElementById("f_prim_math")?.value);
        const read = parseFloat(document.getElementById("f_prim_read")?.value);
        if (isNaN(math) || math < 0 || math > 100) errors.push("Math score must be between 0 and 100.");
        if (isNaN(read) || read < 0 || read > 100) errors.push("Reading score must be between 0 and 100.");
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
    const subjects = subjectsStore[currentStage] || [];
    const studyHours = document.getElementById("f_study_hours")?.value || "4.5";
    const revision = document.getElementById("f_revision_freq")?.value || "Daily";
    const focus = document.getElementById("f_attentive_level")?.value || "High";
    const motivation = document.getElementById("f_self_motivation")?.value || "9";

    let academicSummary = "";
    if (currentStage === "university") {
      academicSummary = `CGPA: ${document.getElementById("f_uni_cgpa")?.value || "3.55"} / 4.00 | Attendance: ${document.getElementById("f_uni_att")?.value || "88"}% | Semester: ${document.getElementById("f_uni_semester")?.value || "4"}`;
    } else if (currentStage === "intermediate") {
      academicSummary = `Group: ${document.getElementById("f_inter_group")?.value || "Pre-Eng"} | 1st Year Marks: ${document.getElementById("f_inter_hssc1")?.value || "440"}/550 | Attendance: ${document.getElementById("f_inter_att")?.value || "85"}%`;
    } else if (currentStage === "matric") {
      academicSummary = `9th Marks: ${document.getElementById("f_matric_ssc1")?.value || "465"}/550 | Attendance: ${document.getElementById("f_matric_att")?.value || "90"}%`;
    } else if (currentStage === "secondary") {
      academicSummary = `Period 1: ${document.getElementById("f_sec_g1")?.value || "16"}/20 | Period 2: ${document.getElementById("f_sec_g2")?.value || "17"}/20`;
    } else {
      academicSummary = `Math: ${document.getElementById("f_prim_math")?.value || "86"}% | Reading: ${document.getElementById("f_prim_read")?.value || "90"}%`;
    }

    studentReviewContainer.innerHTML = `
      <div class="review-summary-box">
        <div class="review-section-title">1. Target Education Level</div>
        <div class="review-grid">
          <div class="review-data-item">
            <span class="review-data-label">Selected Level</span>
            <span class="review-data-value" style="color: var(--primary-400);">${currentStage.toUpperCase()}</span>
          </div>
          <div class="review-data-item">
            <span class="review-data-label">Grading Standard</span>
            <span class="review-data-value">${currentStage === "university" ? "4.00 CGPA Scale" : currentStage === "secondary" ? "20-Point Scale" : "Percentage & Board Marks"}</span>
          </div>
        </div>

        <div class="review-section-title">2. Academic Record & Enrolled Courses</div>
        <div class="review-grid">
          <div class="review-data-item">
            <span class="review-data-label">Academic Baseline</span>
            <span class="review-data-value">${academicSummary}</span>
          </div>
          <div class="review-data-item">
            <span class="review-data-label">Enrolled Subjects</span>
            <span class="review-data-value">${subjects.length} Subjects Logged (${kpiAggregatePct?.innerText || "0%"} Avg)</span>
          </div>
        </div>

        <div class="review-section-title">3. Habits & Self-Assessment Indicators</div>
        <div class="review-grid">
          <div class="review-data-item">
            <span class="review-data-label">Daily Study Routine</span>
            <span class="review-data-value">${studyHours} Hours/Day (${revision} Revision)</span>
          </div>
          <div class="review-data-item">
            <span class="review-data-label">Classroom Focus</span>
            <span class="review-data-value">${focus} Focus | Motivation: ${motivation}/10</span>
          </div>
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
        initWhatIfSimulator(result.score || 3.65);
        showToast("AI Academic Forecast successfully generated!", "success");

        // Save prediction record to historical records
        savePredictionToHistory(result, payload);

      } catch (err) {
        showErrorBanner("Prediction generation failed: " + (err.message || "Unknown error"));
      } finally {
        if (submitPredictBtn) {
          submitPredictBtn.classList.remove("btn-loading");
          submitPredictBtn.innerHTML = `<span>⚡ Run AI Forecast Model</span>`;
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
      payload.Previous_CGPA = parseFloat(document.getElementById("f_uni_cgpa")?.value || 3.55);
      payload.Attendance_Pct = parseFloat(document.getElementById("f_uni_att")?.value || 88);
      payload.Study_Hours_Per_Day = payload.study_hours;
      payload.Semester = parseInt(document.getElementById("f_uni_semester")?.value || 4);
      payload.Credit_Hours = parseInt(document.getElementById("f_uni_credits")?.value || 15);
    } else if (currentStage === "intermediate") {
      payload.SSC_I_Marks = parseFloat(document.getElementById("f_inter_ssc")?.value || 940) / 2;
      payload.SSC_II_Marks = payload.SSC_I_Marks;
      payload.HSSC_I_Marks = parseFloat(document.getElementById("f_inter_hssc1")?.value || 440);
      payload.Attendance_Rate = parseFloat(document.getElementById("f_inter_att")?.value || 85);
      payload.Subject_Group = document.getElementById("f_inter_group")?.value || "Pre-Engineering";
      payload.Study_Hours = payload.study_hours;
    } else if (currentStage === "matric") {
      payload.SSC_I_Marks = parseFloat(document.getElementById("f_matric_ssc1")?.value || 465);
      payload.SSC_II_Marks = payload.SSC_I_Marks;
      payload.HSSC_I_Marks = 400;
      payload.Attendance_Rate = parseFloat(document.getElementById("f_matric_att")?.value || 90);
      payload.Study_Hours = payload.study_hours;
    } else if (currentStage === "secondary") {
      payload.G1 = parseInt(document.getElementById("f_sec_g1")?.value || 16);
      payload.G2 = parseInt(document.getElementById("f_sec_g2")?.value || 17);
      payload.absences = parseInt(document.getElementById("f_sec_absences")?.value || 3);
      payload.studytime = Math.min(4, Math.max(1, Math.round(payload.study_hours / 2.5)));
    } else if (currentStage === "primary") {
      payload.Enrolment_score = parseFloat(document.getElementById("f_prim_math")?.value || 86);
      payload.Learning_score = parseFloat(document.getElementById("f_prim_read")?.value || 90);
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
    let pass_prob = 94;

    if (stage === "university") {
      const base = payload.Previous_CGPA || 3.55;
      const boost = (payload.Attendance_Pct > 85 ? 0.15 : 0) + (payload.study_hours > 4 ? 0.12 : -0.1);
      score = Math.min(4.0, Math.max(1.0, +(base + boost).toFixed(2)));
      formatted_score = `${score.toFixed(2)} CGPA`;
      min_ci = +(score - 0.21).toFixed(2);
      max_ci = Math.min(4.0, +(score + 0.19).toFixed(2));
      grade = score >= 3.6 ? "Grade A+ (Exemplary)" : score >= 3.0 ? "Grade B+ (Proficient)" : "Grade C";
    } else if (stage === "intermediate" || stage === "matric") {
      const marks = stage === "intermediate" ? (payload.HSSC_I_Marks || 440) * 2 : (payload.SSC_I_Marks || 465) * 2;
      const pct = Math.min(99, Math.max(40, Math.round((marks / 1100) * 100 + (payload.study_hours > 4 ? 4 : 0))));
      score = pct;
      formatted_score = `${pct}% (${Math.round((pct / 100) * 1100)} / 1100)`;
      min_ci = pct - 4;
      max_ci = Math.min(100, pct + 4);
      grade = pct >= 80 ? "Grade A1 (Exceptional)" : pct >= 70 ? "Grade A (First Division)" : "Grade B";
    } else if (stage === "secondary") {
      const g1 = payload.G1 || 16;
      const g2 = payload.G2 || 17;
      score = +((g1 * 0.4 + g2 * 0.6) + (payload.study_hours > 3 ? 0.8 : 0)).toFixed(1);
      formatted_score = `${score} / 20`;
      min_ci = +(score - 1.2).toFixed(1);
      max_ci = Math.min(20, +(score + 1.2).toFixed(1));
      grade = score >= 16 ? "Distinction (Level 5)" : score >= 14 ? "Proficient (Level 4)" : "Developing";
    } else {
      const math = payload.Enrolment_score || 86;
      const read = payload.Learning_score || 90;
      score = +((math + read) / 2).toFixed(1);
      formatted_score = `${score}% Mastery`;
      min_ci = +(score - 3.5).toFixed(1);
      max_ci = Math.min(100, +(score + 3.5).toFixed(1));
      grade = score >= 85 ? "Advanced Mastery" : "Standard Competency";
    }

    return {
      score,
      formatted_score,
      grade,
      risk_level: score >= (stage === "university" ? 3.2 : 75) ? "LOW" : "MEDIUM",
      confidence_interval: { lower: min_ci, upper: max_ci },
      feature_contributions: {
        top_positive_factors: [
          `Attendance Track: High attendance reinforces steady academic performance`,
          `Classroom Attentiveness: Maintains sharp focus and active engagement in core lectures`,
          `Assignment Consistency: High homework and project submission discipline`
        ],
        growth_areas: [
          `Target dedicated weekend revision for high-weightage topics`,
          `Maintain strict problem-solving consistency across complex modules`
        ]
      },
      recommendation: `Model suggests strong academic momentum. Prioritize structured weekly revision to maximize final assessment scores.`
    };
  }

  function renderStudentResults(res) {
    if (!studentResultCard) return;

    if (resultPredictedVal) resultPredictedVal.innerText = res.formatted_score || `${res.score}`;
    if (resultGradeVal) resultGradeVal.innerText = res.grade || "Grade A (Excellent)";
    if (resultStatusBadge && resultStatusText) {
      const isHigh = (res.risk_level || "LOW") === "LOW";
      resultStatusBadge.className = isHigh ? "badge badge-success" : "badge badge-warning";
      resultStatusText.innerText = isHigh ? "On Track / Low Risk" : "Attention Needed";
    }

    // Model Meta
    if (resultModelMeta) {
      resultModelMeta.innerText = `Model: ${currentStage.toUpperCase()} AI Multi-Factor Engine (v2.1.0)`;
    }

    // Confidence / Reliability Interval
    const ci = res.confidence_interval || { lower: 3.4, upper: 3.8 };
    if (resultCiRange) resultCiRange.innerText = `[${ci.lower} — ${ci.upper}]`;
    if (ciMinLabel) ciMinLabel.innerText = currentStage === "university" ? "0.00" : currentStage === "secondary" ? "0" : "0%";
    if (ciMaxLabel) ciMaxLabel.innerText = currentStage === "university" ? "4.00" : currentStage === "secondary" ? "20" : "100%";

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
        const summaryText = `🎓 EduMetrics AI - Academic Prediction Report\nStage: ${currentStage.toUpperCase()}\nPredicted Score: ${res.formatted_score || res.score}\nGrade: ${res.grade}\nRisk Level: ${res.risk_level}\nAI Recommendation: ${res.recommendation}\nDate: ${new Date().toLocaleDateString()}`;
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
  // 9. WHAT-IF SIMULATOR ENGINE
  // ============================================================================
  function initWhatIfSimulator(baseScore) {
    if (!simSliderStudy || !simSliderAtt || !simSliderAssign) return;

    function updateSimulation() {
      const study = parseFloat(simSliderStudy.value);
      const att = parseFloat(simSliderAtt.value);
      const assign = parseFloat(simSliderAssign.value);

      if (simValStudy) simValStudy.innerText = `${study}h/day`;
      if (simValAtt) simValAtt.innerText = `${att}%`;
      if (simValAssign) simValAssign.innerText = `${assign}%`;

      let simScore = baseScore;
      if (currentStage === "university") {
        const delta = (study - 4.5) * 0.04 + (att - 88) * 0.005 + (assign - 90) * 0.003;
        simScore = Math.min(4.0, Math.max(1.0, +(baseScore + delta).toFixed(2)));
        if (simScenarioCurrent) simScenarioCurrent.innerText = `${baseScore.toFixed(2)} CGPA`;
        if (simScenarioSimulated) simScenarioSimulated.innerText = `${simScore.toFixed(2)} CGPA`;
        if (simScenarioBest) simScenarioBest.innerText = `${Math.min(4.0, baseScore + 0.28).toFixed(2)} CGPA`;
      } else {
        const delta = (study - 4.5) * 1.5 + (att - 88) * 0.2 + (assign - 90) * 0.15;
        simScore = Math.min(100, Math.max(30, Math.round(baseScore + delta)));
        if (simScenarioCurrent) simScenarioCurrent.innerText = `${baseScore}%`;
        if (simScenarioSimulated) simScenarioSimulated.innerText = `${simScore}%`;
        if (simScenarioBest) simScenarioBest.innerText = `${Math.min(100, baseScore + 6)}%`;
      }
    }

    // Quick Preset Handlers
    const btnPresetBalanced = document.getElementById("btn-sim-preset-balanced");
    const btnPresetCram = document.getElementById("btn-sim-preset-cram");
    const btnPresetHonors = document.getElementById("btn-sim-preset-honors");

    if (btnPresetBalanced) {
      btnPresetBalanced.onclick = () => {
        simSliderStudy.value = 4.5;
        simSliderAtt.value = 88;
        simSliderAssign.value = 90;
        updateSimulation();
        showToast("Loaded Balanced Routine Preset", "info");
      };
    }
    if (btnPresetCram) {
      btnPresetCram.onclick = () => {
        simSliderStudy.value = 6.5;
        simSliderAtt.value = 95;
        simSliderAssign.value = 95;
        updateSimulation();
        showToast("Loaded Exam Sprint Preset", "info");
      };
    }
    if (btnPresetHonors) {
      btnPresetHonors.onclick = () => {
        simSliderStudy.value = 8.0;
        simSliderAtt.value = 98;
        simSliderAssign.value = 100;
        updateSimulation();
        showToast("Loaded Dean's List Honors Preset", "success");
      };
    }

    simSliderStudy.oninput = updateSimulation;
    simSliderAtt.oninput = updateSimulation;
    simSliderAssign.oninput = updateSimulation;
    updateSimulation();
  }

  // ============================================================================
  // 10. SUBJECT / COURSE CRUD MANAGER (PRESERVED & STAGE-ADAPTED)
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
          <td style="font-weight: 600; color: ${parseFloat(pct) >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)"};">${pct}%</td>
          <td><span class="badge ${parseFloat(pct) >= 80 ? "badge-success" : "badge-warning"}">${grade}</span></td>
          <td style="text-align: right;">
            <button type="button" class="subject-action-btn" onclick="window.editSubject('${sub.id}')">✏️ Edit</button>
            <button type="button" class="subject-action-btn delete" onclick="window.deleteSubject('${sub.id}')">🗑️</button>
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
    if (!subjectPresetSelect) return;
    const presets = subjectPresetOptions[currentStage] || subjectPresetOptions.university;
    subjectPresetSelect.innerHTML = presets.map((p) => `<option value="${p}">${p}</option>`).join("");
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
      const category = subjectCategorySelect?.value || "Core Science";
      const term = subjectTermSelect?.value || "Current Term";
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
      { id: "class", btn: toolBtnClass, view: teacherViewClass },
      { id: "upload", btn: toolBtnUpload, view: teacherViewUpload }
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
  if (toolBtnUpload) toolBtnUpload.addEventListener("click", () => switchTeacherTool("upload"));

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
          <button type="button" class="subject-action-btn" onclick="window.editClassStudent(${idx})">✏️ Edit</button>
          <button type="button" class="subject-action-btn delete" onclick="window.deleteClassStudent(${idx})">🗑️</button>
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

      const existingHistory = JSON.parse(localStorage.getItem("edumetrics_prediction_history_v2") || localStorage.getItem("edumetrics_prediction_history") || "[]");
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
    const profileModal = document.getElementById("profile-settings-modal");
    const btnCloseProfile = document.getElementById("btn-close-profile-modal");
    const btnCancelProfile = document.getElementById("btn-cancel-profile");
    const profileTabs = document.querySelectorAll(".modal-tab-btn");
    const tabContents = document.querySelectorAll(".profile-tab-content");
    const avatarFileInput = document.getElementById("avatar-file-input");
    const btnGenerateAvatar = document.getElementById("btn-generate-avatar");
    const btnApplyAvatar = document.getElementById("btn-apply-avatar");
    const avatarPreviewBig = document.getElementById("avatar-preview-big");
    const studentAvatar = document.getElementById("student-avatar");
    const avatarUrlInput = document.getElementById("avatar-url-input");
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
        if (confirm("Are you sure you want to sign out?")) {
          if (window.authClient) await window.authClient.signOut();
          window.location.href = "login.html";
        }
      });
    }

    if (userProfileBtn && profileModal) {
      userProfileBtn.addEventListener("click", () => profileModal.classList.add("active"));
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
        tabContents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(target)?.classList.add("active");
      });
    });

    if (avatarFileInput && avatarPreviewBig) {
      avatarFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            avatarPreviewBig.src = evt.target.result;
            if (avatarUrlInput) avatarUrlInput.value = "";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (btnGenerateAvatar && avatarPreviewBig) {
      btnGenerateAvatar.addEventListener("click", () => {
        const randomSeed = "User_" + Math.random().toString(36).substring(2, 9);
        const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
        avatarPreviewBig.src = newUrl;
        if (avatarUrlInput) avatarUrlInput.value = newUrl;
      });
    }

    if (btnApplyAvatar && avatarPreviewBig && studentAvatar) {
      btnApplyAvatar.addEventListener("click", () => {
        studentAvatar.src = avatarPreviewBig.src;
        localStorage.setItem("edumetrics_custom_avatar", avatarPreviewBig.src);
        profileModal?.classList.remove("active");
        showToast("Profile picture updated successfully!", "success");
      });
    }

    // Load saved avatar
    const savedAvatar = localStorage.getItem("edumetrics_custom_avatar");
    if (savedAvatar) {
      if (studentAvatar) studentAvatar.src = savedAvatar;
      if (avatarPreviewBig) avatarPreviewBig.src = savedAvatar;
    }

    if (profileForm) {
      profileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const fullName = document.getElementById("setting-fullname")?.value;
        const studentId = document.getElementById("setting-studentid")?.value;
        if (fullName && studentNameEl) studentNameEl.innerText = fullName;
        if (studentId && studentIdCodeEl) studentIdCodeEl.innerText = studentId;
        profileModal?.classList.remove("active");
        showToast("Profile settings saved successfully!", "success");
      });
    }

    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener("click", () => {
        if (confirm("Permanently delete account and all historical predictions? This cannot be undone.")) {
          localStorage.clear();
          showToast("Account deleted.", "info");
          setTimeout(() => (window.location.href = "login.html"), 1000);
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
