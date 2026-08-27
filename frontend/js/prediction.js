/**
 * PAGE 2: Academic Records & Prediction Input Form Controller
 * Student Performance Prediction & Analytics System
 * Includes Multi-Subject & Course CRUD Engine with Live Aggregates & ML Model Sync
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Authentication Guard
  if (!window.authClient || !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // Active State
  let currentStage = "university";

  // DOM Elements
  const stageSelector = document.getElementById("stage-selector");
  const headerStageSelector = document.getElementById("header-stage-selector");
  const stageBannerTitle = document.getElementById("stage-banner-title");
  const stageBannerDesc = document.getElementById("stage-banner-desc");
  const stageBannerIcon = document.getElementById("stage-banner-icon");
  const formStageBadge = document.getElementById("form-stage-badge");
  const formCardTitle = document.getElementById("form-card-title");
  const dynamicContainer = document.getElementById("dynamic-fields-container");
  const predictionForm = document.getElementById("prediction-form");
  const submitBtn = document.getElementById("submit-predict-btn");
  const resetBtn = document.getElementById("reset-form-btn");
  const errorBanner = document.getElementById("error-banner");
  const errorBannerMessage = document.getElementById("error-banner-message");
  const resultCard = document.getElementById("prediction-result-card");

  // User Profile Header Elements
  const studentNameEl = document.getElementById("student-name");
  const studentAvatarEl = document.getElementById("student-avatar");
  const studentIdEl = document.getElementById("student-id-code");
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  // Subject CRUD DOM Elements
  const subjectsTableBody = document.getElementById("subjects-table-body");
  const btnOpenSubjectModal = document.getElementById("btn-open-subject-modal");
  const subjectModal = document.getElementById("subject-modal");
  const btnCloseSubjectModal = document.getElementById("btn-close-subject-modal");
  const btnCancelSubjectModal = document.getElementById("btn-cancel-subject-modal");
  const subjectEntryForm = document.getElementById("subject-entry-form");
  const subjectModalTitle = document.getElementById("subject-modal-title");
  const subjectEditIdInput = document.getElementById("subject-edit-id");
  const subjectPresetSelect = document.getElementById("subject-preset-select");
  const subjectNameInput = document.getElementById("subject-name-input");
  const subjectCategorySelect = document.getElementById("subject-category-select");
  const subjectTermSelect = document.getElementById("subject-term-select");
  const subjectObtainedInput = document.getElementById("subject-obtained-input");
  const subjectTotalInput = document.getElementById("subject-total-input");

  // Summary KPI Elements
  const kpiTotalSubjects = document.getElementById("kpi-total-subjects");
  const kpiTotalMarks = document.getElementById("kpi-total-marks");
  const kpiAggregatePct = document.getElementById("kpi-aggregate-pct");
  const kpiCalcGpa = document.getElementById("kpi-calc-gpa");

  // Render User Profile
  renderUserProfile();

  // Mobile Sidebar Toggle
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.authClient.signOut();
    });
  }

  // Sync Stage Selectors
  if (stageSelector) {
    stageSelector.addEventListener("change", (e) => {
      currentStage = e.target.value;
      if (headerStageSelector) headerStageSelector.value = currentStage;
      onStageChange(currentStage);
    });
  }

  if (headerStageSelector) {
    headerStageSelector.addEventListener("change", (e) => {
      currentStage = e.target.value;
      if (stageSelector) stageSelector.value = currentStage;
      onStageChange(currentStage);
    });
  }

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
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4500);
  }

  function renderUserProfile() {
    const currentUser = window.authClient ? window.authClient.getUser() : null;
    const meta = currentUser?.user_metadata || {};
    const displayName = meta.full_name || "Muhammad Ali";
    const avatarUrl = meta.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
    const studentId = meta.student_id || "SE-2023-049";

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentAvatarEl) studentAvatarEl.src = avatarUrl;
    if (studentIdEl) studentIdEl.innerText = studentId;

    // Also populate settings form inputs
    const setNameInput = document.getElementById("setting-fullname");
    const setIdInput = document.getElementById("setting-studentid");
    const setInstInput = document.getElementById("setting-institution");
    const setMajorInput = document.getElementById("setting-major");
    const setStageSelect = document.getElementById("setting-stage");
    const setBigAvatar = document.getElementById("avatar-preview-big");

    if (setNameInput) setNameInput.value = displayName;
    if (setIdInput) setIdInput.value = studentId;
    if (setInstInput) setInstInput.value = meta.institution_name || "Faculty of Computer Science & Engineering";
    if (setMajorInput) setMajorInput.value = meta.major || "Software Engineering";
    if (setStageSelect) setStageSelect.value = meta.stage || currentStage;
    if (setBigAvatar) setBigAvatar.src = avatarUrl;
  }

  // ----------------------------------------------------------------------------
  // Profile & Settings Modal Controller
  // ----------------------------------------------------------------------------
  function initProfileSettings() {
    const profileBtn = document.getElementById("user-profile-btn");
    const profileModal = document.getElementById("profile-settings-modal");
    const closeBtn = document.getElementById("btn-close-profile-modal");
    const cancelBtn = document.getElementById("btn-cancel-profile");
    const tabBtns = document.querySelectorAll(".modal-tab-btn");
    const tabContents = document.querySelectorAll(".profile-tab-content");

    const profileForm = document.getElementById("profile-details-form");
    const avatarFileInput = document.getElementById("avatar-file-input");
    const btnGenAvatar = document.getElementById("btn-generate-avatar");
    const btnApplyAvatar = document.getElementById("btn-apply-avatar");
    const avatarUrlInput = document.getElementById("avatar-url-input");
    const avatarBigPreview = document.getElementById("avatar-preview-big");

    const passwordForm = document.getElementById("password-change-form");
    const btnDeleteAcc = document.getElementById("btn-delete-account");

    let pendingAvatarUrl = "";

    if (profileBtn && profileModal) {
      profileBtn.addEventListener("click", (e) => {
        // Prevent opening if logout button was clicked directly
        if (e.target.closest("#logout-btn")) return;
        renderUserProfile();
        profileModal.classList.add("active");
      });
    }

    if (closeBtn && profileModal) {
      closeBtn.addEventListener("click", () => profileModal.classList.remove("active"));
    }
    if (cancelBtn && profileModal) {
      cancelBtn.addEventListener("click", () => profileModal.classList.remove("active"));
    }

    if (profileModal) {
      profileModal.addEventListener("click", (e) => {
        if (e.target === profileModal) profileModal.classList.remove("active");
      });
    }

    // Modal Tabs Navigation
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add("active");
      });
    });

    // Custom Avatar File Upload
    if (avatarFileInput) {
      avatarFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          showToast("Image file size exceeds 2MB limit.", "error");
          return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
          pendingAvatarUrl = evt.target.result;
          if (avatarBigPreview) avatarBigPreview.src = pendingAvatarUrl;
          showToast("Photo loaded! Click 'Apply Photo' to save.", "info");
        };
        reader.readAsDataURL(file);
      });
    }

    // Dicebear Randomizer
    if (btnGenAvatar) {
      btnGenAvatar.addEventListener("click", () => {
        const seed = Math.random().toString(36).substring(2, 9);
        pendingAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        if (avatarBigPreview) avatarBigPreview.src = pendingAvatarUrl;
      });
    }

    // Apply Avatar
    if (btnApplyAvatar) {
      btnApplyAvatar.addEventListener("click", async () => {
        const customUrl = avatarUrlInput ? avatarUrlInput.value.trim() : "";
        const finalUrl = customUrl || pendingAvatarUrl;

        if (!finalUrl) {
          showToast("Please choose an image file or paste an image URL first.", "error");
          return;
        }

        try {
          await window.authClient.updateUser({ avatar_url: finalUrl });
          renderUserProfile();
          showToast("Profile picture updated successfully!", "success");
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Error updating avatar: " + err.message, "error");
        }
      });
    }

    // Save Profile Details
    if (profileForm) {
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fullName = document.getElementById("setting-fullname")?.value.trim();
        const studentId = document.getElementById("setting-studentid")?.value.trim();
        const inst = document.getElementById("setting-institution")?.value.trim();
        const major = document.getElementById("setting-major")?.value.trim();
        const stage = document.getElementById("setting-stage")?.value;

        if (!fullName) {
          showToast("Please provide your full name.", "error");
          return;
        }

        try {
          await window.authClient.updateUser({
            full_name: fullName,
            student_id: studentId,
            institution_name: inst,
            major: major,
            stage: stage
          });

          renderUserProfile();
          showToast("Profile details updated successfully!", "success");
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Failed to update profile: " + err.message, "error");
        }
      });
    }

    // Password Update
    if (passwordForm) {
      passwordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPass = document.getElementById("setting-new-password")?.value;
        const confPass = document.getElementById("setting-confirm-password")?.value;

        if (newPass.length < 6) {
          showToast("Password must be at least 6 characters.", "error");
          return;
        }
        if (newPass !== confPass) {
          showToast("Passwords do not match.", "error");
          return;
        }

        try {
          await window.authClient.updatePassword(newPass);
          showToast("Password updated successfully!", "success");
          passwordForm.reset();
          profileModal.classList.remove("active");
        } catch (err) {
          showToast("Password update failed: " + err.message, "error");
        }
      });
    }

    // Danger Zone: Account Deletion
    if (btnDeleteAcc) {
      btnDeleteAcc.addEventListener("click", async () => {
        const confirm1 = confirm("⚠️ Are you sure you want to PERMANENTLY delete your student account?");
        if (!confirm1) return;

        const confirm2 = confirm("🚨 FINAL WARNING: All your academic records, course entries, and forecast histories will be irreversibly erased. Proceed?");
        if (!confirm2) return;

        try {
          await window.authClient.deleteAccount();
        } catch (err) {
          showToast("Error deleting account: " + err.message, "error");
        }
      });
    }
  }

  initProfileSettings();


  // ----------------------------------------------------------------------------
  // MULTI-SUBJECT & COURSE CRUD STORE
  // ----------------------------------------------------------------------------
  const defaultSubjectsStore = {
    university: [
      { id: "sub-u1", name: "Data Structures & Algorithms", category: "Core Science", term: "Semester 5", obtained: 88, total: 100 },
      { id: "sub-u2", name: "Database Management Systems", category: "Core Science", term: "Semester 5", obtained: 84, total: 100 },
      { id: "sub-u3", name: "Software Engineering", category: "Core Science", term: "Semester 5", obtained: 90, total: 100 },
      { id: "sub-u4", name: "Computer Networks Lab", category: "Lab / Practical", term: "Semester 5", obtained: 45, total: 50 }
    ],
    matric_inter: [
      { id: "sub-m1", name: "Mathematics", category: "Core Science", term: "HSSC-I", obtained: 92, total: 100 },
      { id: "sub-m2", name: "Physics Theory & Lab", category: "Core Science", term: "HSSC-I", obtained: 76, total: 85 },
      { id: "sub-m3", name: "Chemistry", category: "Core Science", term: "HSSC-I", obtained: 74, total: 85 },
      { id: "sub-m4", name: "Computer Science", category: "Core Science", term: "HSSC-I", obtained: 68, total: 75 },
      { id: "sub-m5", name: "English Compulsory", category: "Humanities", term: "HSSC-I", obtained: 82, total: 100 }
    ],
    secondary: [
      { id: "sub-s1", name: "Mathematics", category: "Core Science", term: "Period 1 (G1)", obtained: 16, total: 20 },
      { id: "sub-s2", name: "Natural Sciences", category: "Core Science", term: "Period 1 (G1)", obtained: 15, total: 20 },
      { id: "sub-s3", name: "English / Language", category: "Humanities", term: "Period 2 (G2)", obtained: 14, total: 20 },
      { id: "sub-s4", name: "History & Geography", category: "General", term: "Period 2 (G2)", obtained: 15, total: 20 }
    ],
    primary: [
      { id: "sub-p1", name: "Mathematics & Reasoning", category: "Core Science", term: "Final", obtained: 82, total: 100 },
      { id: "sub-p2", name: "Reading & English Literacy", category: "Humanities", term: "Final", obtained: 76, total: 100 },
      { id: "sub-p3", name: "Science & Environment", category: "General", term: "Final", obtained: 80, total: 100 }
    ]
  };

  // Stage Preset Suggestions
  const stagePresets = {
    university: [
      "Custom Subject...",
      "Data Structures & Algorithms",
      "Database Management Systems",
      "Software Engineering",
      "Operating Systems",
      "Computer Networks",
      "Linear Algebra & Calculus",
      "Machine Learning & AI",
      "Web Application Development",
      "Microeconomics",
      "Financial Accounting"
    ],
    matric_inter: [
      "Custom Subject...",
      "Mathematics",
      "Physics Theory & Lab",
      "Chemistry Theory & Lab",
      "Computer Science",
      "Biology",
      "English Compulsory",
      "Urdu Compulsory",
      "Islamic Studies / Ethics",
      "Pakistan Studies"
    ],
    secondary: [
      "Custom Subject...",
      "Mathematics",
      "Natural Sciences",
      "Physics-Chemistry",
      "History & Geography",
      "English / Foreign Language",
      "Portuguese / Main Language",
      "Physical Education",
      "Art & Technology"
    ],
    primary: [
      "Custom Subject...",
      "Mathematics & Reasoning",
      "Reading & English Literacy",
      "Science & Environment",
      "Social Studies",
      "Art & Creative Expression"
    ]
  };

  // Load state from localStorage or initialize with default store
  let subjectsStore = loadSavedSubjects();

  function loadSavedSubjects() {
    try {
      const saved = localStorage.getItem("sp_user_subjects_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to read subjects from localStorage", e);
    }
    return JSON.parse(JSON.stringify(defaultSubjectsStore));
  }

  function persistSubjects() {
    try {
      localStorage.setItem("sp_user_subjects_v1", JSON.stringify(subjectsStore));
    } catch (e) {
      console.warn("Failed to persist subjects", e);
    }
  }

  // ----------------------------------------------------------------------------
  // Subject Table Renderer & Summary Aggregator
  // ----------------------------------------------------------------------------
  function renderSubjectsTable() {
    if (!subjectsTableBody) return;

    const list = subjectsStore[currentStage] || [];

    if (list.length === 0) {
      subjectsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: var(--space-6);">
            No subjects logged for this stage yet. Click "+ Add New Subject" to add your academic courses!
          </td>
        </tr>
      `;
      updateSummaryKPIs(0, 0, 0, 0);
      return;
    }

    let grandObtained = 0;
    let grandTotal = 0;

    subjectsTableBody.innerHTML = list.map((item) => {
      const obtained = Number(item.obtained) || 0;
      const total = Number(item.total) || 1;
      const pct = (obtained / total) * 100;

      grandObtained += obtained;
      grandTotal += total;

      // Grade text & color calculation
      let gradeBadge = "badge-primary";
      let gradeText = "Pass";

      if (pct >= 85) { gradeBadge = "badge-success"; gradeText = "A+ (Exemplary)"; }
      else if (pct >= 75) { gradeBadge = "badge-success"; gradeText = "A (Good)"; }
      else if (pct >= 65) { gradeBadge = "badge-primary"; gradeText = "B (Average)"; }
      else if (pct >= 50) { gradeBadge = "badge-warning"; gradeText = "C (Pass)"; }
      else { gradeBadge = "badge-danger"; gradeText = "F (At Risk)"; }

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
          </td>
          <td><span class="badge badge-info">${item.category}</span></td>
          <td><span style="font-size: 12px; color: var(--text-secondary);">${item.term}</span></td>
          <td style="font-weight: 700; color: var(--text-primary);">${obtained}</td>
          <td style="color: var(--text-muted);">${total}</td>
          <td style="font-weight: 700; color: ${pct >= 75 ? 'var(--accent-emerald)' : (pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)')};">
            ${pct.toFixed(1)}%
          </td>
          <td><span class="badge ${gradeBadge}">${gradeText}</span></td>
          <td style="text-align: right;">
            <button type="button" class="subject-action-btn edit" data-id="${item.id}" title="Edit Subject">
              ✏️ Edit
            </button>
            <button type="button" class="subject-action-btn delete" data-id="${item.id}" title="Delete Subject">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Attach button click listeners
    const editBtns = subjectsTableBody.querySelectorAll(".subject-action-btn.edit");
    const deleteBtns = subjectsTableBody.querySelectorAll(".subject-action-btn.delete");

    editBtns.forEach(btn => {
      btn.addEventListener("click", () => openSubjectModal(btn.dataset.id));
    });

    deleteBtns.forEach(btn => {
      btn.addEventListener("click", () => deleteSubject(btn.dataset.id));
    });

    const aggregatePct = grandTotal > 0 ? (grandObtained / grandTotal) * 100 : 0;
    updateSummaryKPIs(list.length, grandObtained, grandTotal, aggregatePct);
  }

  function updateSummaryKPIs(count, obtained, total, pct) {
    if (kpiTotalSubjects) kpiTotalSubjects.innerText = `${count}`;
    if (kpiTotalMarks) kpiTotalMarks.innerText = `${obtained.toFixed(1)} / ${total.toFixed(0)}`;
    if (kpiAggregatePct) kpiAggregatePct.innerText = `${pct.toFixed(1)}%`;

    if (kpiCalcGpa) {
      if (currentStage === "university") {
        const gpa = (pct / 100) * 4.0;
        kpiCalcGpa.innerText = `${gpa.toFixed(2)} CGPA`;
      } else if (currentStage === "matric_inter") {
        const boardMarks = (pct / 100) * 1100;
        kpiCalcGpa.innerText = `${boardMarks.toFixed(0)} / 1100 Marks`;
      } else if (currentStage === "secondary") {
        const grade20 = (pct / 100) * 20;
        kpiCalcGpa.innerText = `${grade20.toFixed(1)} / 20 Scale`;
      } else if (currentStage === "primary") {
        kpiCalcGpa.innerText = `${pct.toFixed(1)} / 100 Index`;
      }
    }

    // Auto-sync calculated subject aggregates to main form input fields
    autoSyncSubjectAggregatesToForm(pct, obtained, total);
  }

  function autoSyncSubjectAggregatesToForm(pct, obtained, total) {
    if (currentStage === "university") {
      const cgpaInput = document.getElementById("field_prev_cgpa");
      if (cgpaInput && total > 0) {
        const calcCgpa = (pct / 100) * 4.0;
        cgpaInput.value = calcCgpa.toFixed(2);
      }
    } else if (currentStage === "matric_inter") {
      const ssc1Input = document.getElementById("field_ssc_i");
      const ssc2Input = document.getElementById("field_ssc_ii");
      const hssc1Input = document.getElementById("field_hssc_i");

      const list = subjectsStore[currentStage] || [];
      let hssc1Sum = 0, hssc1Tot = 0;
      list.filter(s => s.term === "HSSC-I").forEach(s => {
        hssc1Sum += Number(s.obtained);
        hssc1Tot += Number(s.total);
      });

      if (hssc1Input && hssc1Tot > 0) {
        const scaledHssc1 = (hssc1Sum / hssc1Tot) * 550;
        hssc1Input.value = Math.round(scaledHssc1);
      }
    } else if (currentStage === "secondary") {
      const g1Input = document.getElementById("field_g1");
      const g2Input = document.getElementById("field_g2");

      const list = subjectsStore[currentStage] || [];
      let g1Sum = 0, g1Tot = 0, g2Sum = 0, g2Tot = 0;
      list.forEach(s => {
        if (s.term.includes("G1") || s.term.includes("Period 1")) {
          g1Sum += Number(s.obtained); g1Tot += Number(s.total);
        } else {
          g2Sum += Number(s.obtained); g2Tot += Number(s.total);
        }
      });

      if (g1Input && g1Tot > 0) g1Input.value = Math.round((g1Sum / g1Tot) * 20);
      if (g2Input && g2Tot > 0) g2Input.value = Math.round((g2Sum / g2Tot) * 20);
    } else if (currentStage === "primary") {
      const mathInput = document.getElementById("field_math_score");
      const readingInput = document.getElementById("field_reading_score");

      const list = subjectsStore[currentStage] || [];
      const mathSub = list.find(s => s.name.toLowerCase().includes("math"));
      const readSub = list.find(s => s.name.toLowerCase().includes("read") || s.name.toLowerCase().includes("english"));

      if (mathInput && mathSub && mathSub.total > 0) {
        mathInput.value = ((mathSub.obtained / mathSub.total) * 100).toFixed(1);
      }
      if (readingInput && readSub && readSub.total > 0) {
        readingInput.value = ((readSub.obtained / readSub.total) * 100).toFixed(1);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Subject Modal Actions (Add, Edit, Delete, Save)
  // ----------------------------------------------------------------------------
  function populatePresets() {
    if (!subjectPresetSelect) return;
    const presets = stagePresets[currentStage] || stagePresets.university;
    subjectPresetSelect.innerHTML = presets.map(p => `<option value="${p}">${p}</option>`).join("");
  }

  if (subjectPresetSelect) {
    subjectPresetSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val && val !== "Custom Subject...") {
        if (subjectNameInput) subjectNameInput.value = val;
      }
    });
  }

  function openSubjectModal(editId = null) {
    if (!subjectModal) return;

    populatePresets();

    if (editId) {
      const list = subjectsStore[currentStage] || [];
      const item = list.find(s => s.id === editId);
      if (!item) return;

      if (subjectModalTitle) subjectModalTitle.innerText = "✏️ Edit Academic Subject";
      if (subjectEditIdInput) subjectEditIdInput.value = item.id;
      if (subjectNameInput) subjectNameInput.value = item.name;
      if (subjectCategorySelect) subjectCategorySelect.value = item.category;
      if (subjectTermSelect) subjectTermSelect.value = item.term;
      if (subjectObtainedInput) subjectObtainedInput.value = item.obtained;
      if (subjectTotalInput) subjectTotalInput.value = item.total;
    } else {
      if (subjectModalTitle) subjectModalTitle.innerText = "➕ Add Academic Subject / Course";
      if (subjectEditIdInput) subjectEditIdInput.value = "";
      if (subjectEntryForm) subjectEntryForm.reset();
      if (subjectObtainedInput) subjectObtainedInput.value = "85";
      if (subjectTotalInput) subjectTotalInput.value = "100";
    }

    subjectModal.classList.add("active");
  }

  function closeSubjectModal() {
    if (subjectModal) subjectModal.classList.remove("active");
  }

  if (btnOpenSubjectModal) btnOpenSubjectModal.addEventListener("click", () => openSubjectModal());
  if (btnCloseSubjectModal) btnCloseSubjectModal.addEventListener("click", closeSubjectModal);
  if (btnCancelSubjectModal) btnCancelSubjectModal.addEventListener("click", closeSubjectModal);

  if (subjectModal) {
    subjectModal.addEventListener("click", (e) => {
      if (e.target === subjectModal) closeSubjectModal();
    });
  }

  if (subjectEntryForm) {
    subjectEntryForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const editId = subjectEditIdInput ? subjectEditIdInput.value : "";
      const name = subjectNameInput ? subjectNameInput.value.trim() : "";
      const category = subjectCategorySelect ? subjectCategorySelect.value : "Core Science";
      const term = subjectTermSelect ? subjectTermSelect.value : "Current Active Term";
      const obtained = parseFloat(subjectObtainedInput ? subjectObtainedInput.value : 0);
      const total = parseFloat(subjectTotalInput ? subjectTotalInput.value : 100);

      if (!name) {
        showToast("Please enter a valid subject name.", "error");
        return;
      }

      if (isNaN(obtained) || obtained < 0) {
        showToast("Obtained marks must be a non-negative number.", "error");
        return;
      }

      if (isNaN(total) || total <= 0 || obtained > total) {
        showToast("Max total marks must be greater than obtained marks.", "error");
        return;
      }

      const list = subjectsStore[currentStage] || [];

      if (editId) {
        // Edit existing subject
        const idx = list.findIndex(s => s.id === editId);
        if (idx !== -1) {
          list[idx] = { id: editId, name, category, term, obtained, total };
          showToast(`Updated subject: "${name}"`, "success");
        }
      } else {
        // Add new subject
        const newSubject = {
          id: "sub-" + Math.random().toString(36).substring(2, 9),
          name,
          category,
          term,
          obtained,
          total
        };
        list.push(newSubject);
        showToast(`Added new subject: "${name}"`, "success");
      }

      subjectsStore[currentStage] = list;
      persistSubjects();
      renderSubjectsTable();
      closeSubjectModal();
    });
  }

  function deleteSubject(id) {
    const list = subjectsStore[currentStage] || [];
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removedName = list[idx].name;
      list.splice(idx, 1);
      subjectsStore[currentStage] = list;
      persistSubjects();
      renderSubjectsTable();
      showToast(`Removed subject: "${removedName}"`, "info");
    }
  }

  // ----------------------------------------------------------------------------
  // Stage Change Handler & Dynamic Form Generator
  // ----------------------------------------------------------------------------
  function onStageChange(stage) {
    hideErrorBanner();
    if (resultCard) resultCard.classList.remove("active");

    const stageMeta = {
      university: {
        title: "University Level Performance Predictor",
        desc: "Target: Final CGPA (0.00 - 4.00 Scale) | Algorithm: Gradient Boosting Regressor",
        icon: "🎓",
        badge: "Stage: University"
      },
      matric_inter: {
        title: "Matric & Intermediate Board Predictor",
        desc: "Target: HSSC-II Total Marks (0 - 1100 Scale) | Algorithm: Ridge Regression",
        icon: "📜",
        badge: "Stage: Matric / Inter"
      },
      secondary: {
        title: "Secondary School Academic Predictor",
        desc: "Target: Final G3 Grade (0 - 20 Scale) | Algorithm: Gradient Boosting Regressor",
        icon: "🏫",
        badge: "Stage: Secondary School"
      },
      primary: {
        title: "Primary Education Indicator",
        desc: "Target: Overall Learning Score (0 - 100 Scale) | Algorithm: Linear Regression",
        icon: "✏️",
        badge: "Stage: Primary Education"
      }
    };

    const meta = stageMeta[stage] || stageMeta.university;
    if (stageBannerTitle) stageBannerTitle.innerText = meta.title;
    if (stageBannerDesc) stageBannerDesc.innerText = meta.desc;
    if (stageBannerIcon) stageBannerIcon.innerText = meta.icon;
    if (formStageBadge) formStageBadge.innerText = meta.badge;
    if (formCardTitle) formCardTitle.innerText = `${meta.title} Inputs`;

    renderDynamicFormFields(stage);
    renderSubjectsTable();
  }

  // ----------------------------------------------------------------------------
  // Render Dynamic Input Fields per Stage
  // ----------------------------------------------------------------------------
  function renderDynamicFormFields(stage) {
    if (!dynamicContainer) return;

    if (stage === "university") {
      dynamicContainer.innerHTML = `
        <div class="form-section-title">Academic & Engagement Metrics</div>
        <div class="form-grid-2col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_major">Academic Program / Major <span style="color:var(--accent-rose)">*</span></label>
            <select id="field_major" class="form-select" required>
              <option value="Engineering" selected>Engineering</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Business">Business & Management</option>
              <option value="Medicine">Medicine / Health Sciences</option>
              <option value="Arts">Arts & Humanities</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_gender">Gender <span style="color:var(--accent-rose)">*</span></label>
            <select id="field_gender" class="form-select" required>
              <option value="Male" selected>Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        <div class="form-grid-3col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_age">Age (Years)</label>
            <input type="number" id="field_age" class="form-input" min="16" max="60" value="21" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 16 to 60 years</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_prev_cgpa">Previous Cumulative CGPA <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" step="0.01" id="field_prev_cgpa" class="form-input" min="0.0" max="4.0" value="3.48" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-calculated from subject records</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_attendance">Class Attendance (%) <span style="color:var(--accent-rose)">*</span></label>
            <input type="number" step="0.1" id="field_attendance" class="form-input" min="0.0" max="100.0" value="88.5" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0.0% to 100.0%</span>
          </div>
        </div>

        <div class="form-section-title">Lifestyle & Study Discipline</div>
        <div class="form-grid-3col">
          <div class="form-group">
            <label class="form-label" for="field_study_hours">Daily Study Time (Hours/Day)</label>
            <input type="number" step="0.1" id="field_study_hours" class="form-input" min="0.0" max="16.0" value="4.5" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0 to 16 hrs/day</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_sleep_hours">Average Sleep (Hours/Night)</label>
            <input type="number" step="0.1" id="field_sleep_hours" class="form-input" min="2.0" max="14.0" value="7.2" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 2 to 14 hrs/night</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_social_hours">Social Hours (Hours/Week)</label>
            <input type="number" id="field_social_hours" class="form-input" min="0" max="50" value="8" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0 to 50 hrs/week</span>
          </div>
        </div>
      `;
    } else if (stage === "matric_inter") {
      dynamicContainer.innerHTML = `
        <div class="form-section-title">Board Examination Milestone Marks</div>
        <div class="form-grid-3col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_ssc_i">SSC-I Marks (9th Grade)</label>
            <input type="number" id="field_ssc_i" class="form-input" min="0" max="1100" value="650" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0 to 1100 marks</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_ssc_ii">SSC-II Marks (10th Grade)</label>
            <input type="number" id="field_ssc_ii" class="form-input" min="0" max="1100" value="680" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0 to 1100 marks</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_hssc_i">HSSC-I Marks (11th Grade)</label>
            <input type="number" id="field_hssc_i" class="form-input" min="0" max="550" value="420" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-calculated from subject records</span>
          </div>
        </div>

        <div class="form-section-title">Academic Environment & Attendance</div>
        <div class="form-grid-3col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_subject_group">Subject Group</label>
            <select id="field_subject_group" class="form-select" required>
              <option value="Science" selected>Pre-Engineering / Medical Science</option>
              <option value="Computer Science">Computer Science (ICS)</option>
              <option value="Arts">Humanities / Arts</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_gender_mi">Gender</label>
            <select id="field_gender_mi" class="form-select" required>
              <option value="Male" selected>Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_school_type">School Type</label>
            <select id="field_school_type" class="form-select" required>
              <option value="Private" selected>Private Institution</option>
              <option value="Public">Public / Government School</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2col">
          <div class="form-group">
            <label class="form-label" for="field_attendance_rate">Attendance Rate (%)</label>
            <input type="number" step="0.1" id="field_attendance_rate" class="form-input" min="0.0" max="100.0" value="85.0" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0.0% to 100.0%</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_study_hours_mi">Daily Study Discipline (Hours)</label>
            <input type="number" step="0.1" id="field_study_hours_mi" class="form-input" min="0.0" max="16.0" value="4.0" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0.0 to 16.0 hrs</span>
          </div>
        </div>
      `;
    } else if (stage === "secondary") {
      dynamicContainer.innerHTML = `
        <div class="form-section-title">Assessment Period Grades (0 - 20 Scale)</div>
        <div class="form-grid-2col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_g1">Period 1 Grade (G1)</label>
            <input type="number" id="field_g1" class="form-input" min="0" max="20" value="14" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-calculated from Period 1 subjects</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_g2">Period 2 Grade (G2)</label>
            <input type="number" id="field_g2" class="form-input" min="0" max="20" value="15" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-calculated from Period 2 subjects</span>
          </div>
        </div>

        <div class="form-section-title">Study Habit & Attendance Metrics</div>
        <div class="form-grid-2col">
          <div class="form-group">
            <label class="form-label" for="field_studytime">Weekly Study Time Scale</label>
            <select id="field_studytime" class="form-select" required>
              <option value="1">1: Less than 2 hours / week</option>
              <option value="2" selected>2: 2 to 5 hours / week</option>
              <option value="3">3: 5 to 10 hours / week</option>
              <option value="4">4: More than 10 hours / week</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_absences">Total School Absences</label>
            <input type="number" id="field_absences" class="form-input" min="0" max="93" value="4" required>
            <span style="font-size: 11px; color: var(--text-muted);">Allowed: 0 to 93 days</span>
          </div>
        </div>
      `;
    } else if (stage === "primary") {
      dynamicContainer.innerHTML = `
        <div class="form-section-title">Primary Foundational Learning Scores</div>
        <div class="form-grid-2col" style="margin-bottom: var(--space-6);">
          <div class="form-group">
            <label class="form-label" for="field_math_score">Mathematics Score (0 - 100)</label>
            <input type="number" step="0.1" id="field_math_score" class="form-input" min="0.0" max="100.0" value="78.5" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-synced from Math subject</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_reading_score">Reading / Literacy Score (0 - 100)</label>
            <input type="number" step="0.1" id="field_reading_score" class="form-input" min="0.0" max="100.0" value="74.0" required>
            <span style="font-size: 11px; color: var(--text-muted);">Auto-synced from Reading subject</span>
          </div>
        </div>

        <div class="form-section-title">Support & Gender Context</div>
        <div class="form-grid-2col">
          <div class="form-group">
            <label class="form-label" for="field_test_prep">Test Preparation Course Status</label>
            <select id="field_test_prep" class="form-select" required>
              <option value="Completed" selected>Completed Prep Course</option>
              <option value="None">None / Not Enrolled</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field_gender_primary">Gender</label>
            <select id="field_gender_primary" class="form-select" required>
              <option value="Female" selected>Female</option>
              <option value="Male">Male</option>
            </select>
          </div>
        </div>
      `;
    }
  }

  // Initial Form Build & Table Render
  onStageChange(currentStage);

  // ----------------------------------------------------------------------------
  // Input Validation & Payload Builder
  // ----------------------------------------------------------------------------
  function extractAndValidatePayload(stage) {
    hideErrorBanner();
    const payload = {};
    const errors = [];

    if (stage === "university") {
      const major = document.getElementById("field_major")?.value;
      const gender = document.getElementById("field_gender")?.value;
      const age = parseInt(document.getElementById("field_age")?.value);
      const prevCgpa = parseFloat(document.getElementById("field_prev_cgpa")?.value);
      const attendance = parseFloat(document.getElementById("field_attendance")?.value);
      const studyHours = parseFloat(document.getElementById("field_study_hours")?.value);
      const sleepHours = parseFloat(document.getElementById("field_sleep_hours")?.value);
      const socialHours = parseInt(document.getElementById("field_social_hours")?.value);

      if (isNaN(age) || age < 16 || age > 60) errors.push("Age must be an integer between 16 and 60.");
      if (isNaN(prevCgpa) || prevCgpa < 0.0 || prevCgpa > 4.0) errors.push("Previous CGPA must be between 0.00 and 4.00.");
      if (isNaN(attendance) || attendance < 0.0 || attendance > 100.0) errors.push("Attendance percentage must be between 0% and 100%.");
      if (isNaN(studyHours) || studyHours < 0.0 || studyHours > 16.0) errors.push("Study hours per day must be between 0 and 16 hours.");
      if (isNaN(sleepHours) || sleepHours < 2.0 || sleepHours > 14.0) errors.push("Sleep hours must be between 2 and 14 hours per night.");
      if (isNaN(socialHours) || socialHours < 0 || socialHours > 50) errors.push("Social hours must be between 0 and 50 hours per week.");

      if (errors.length === 0) {
        payload.Major = major;
        payload.Gender = gender;
        payload.Age = age;
        payload.Previous_CGPA = prevCgpa;
        payload.Attendance_Pct = attendance;
        payload.Study_Hours_Per_Day = studyHours;
        payload.Sleep_Hours = sleepHours;
        payload.Social_Hours_Week = socialHours;
      }
    } else if (stage === "matric_inter") {
      const sscI = parseInt(document.getElementById("field_ssc_i")?.value);
      const sscIi = parseInt(document.getElementById("field_ssc_ii")?.value);
      const hsscI = parseInt(document.getElementById("field_hssc_i")?.value);
      const subjectGroup = document.getElementById("field_subject_group")?.value;
      const gender = document.getElementById("field_gender_mi")?.value;
      const schoolType = document.getElementById("field_school_type")?.value;
      const attendanceRate = parseFloat(document.getElementById("field_attendance_rate")?.value);
      const studyHours = parseFloat(document.getElementById("field_study_hours_mi")?.value);

      if (isNaN(sscI) || sscI < 0 || sscI > 1100) errors.push("SSC-I Marks must be between 0 and 1100.");
      if (isNaN(sscIi) || sscIi < 0 || sscIi > 1100) errors.push("SSC-II Marks must be between 0 and 1100.");
      if (isNaN(hsscI) || hsscI < 0 || hsscI > 550) errors.push("HSSC-I Marks must be between 0 and 550.");
      if (isNaN(attendanceRate) || attendanceRate < 0.0 || attendanceRate > 100.0) errors.push("Attendance rate must be between 0% and 100%.");
      if (isNaN(studyHours) || studyHours < 0.0 || studyHours > 16.0) errors.push("Daily study hours must be between 0 and 16 hours.");

      if (errors.length === 0) {
        payload.SSC_I_Marks = sscI;
        payload.SSC_II_Marks = sscIi;
        payload.HSSC_I_Marks = hsscI;
        payload.Subject_Group = subjectGroup;
        payload.Gender = gender;
        payload.School_Type = schoolType;
        payload.Attendance_Rate = attendanceRate;
        payload.Study_Hours = studyHours;
        payload.Previous_Failures = 0;
        payload.Exam_Attempts = 1;
        payload.Region = "Mohmand";
        payload.Enrollment_Type = "Regular";
        payload.Parent_Education_Level = "College";
        payload.Parent_Income = "Medium";
        payload.Extra_Tuition = "No";
        payload.Co_Curricular_Activities = "Yes";
      }
    } else if (stage === "secondary") {
      const g1 = parseInt(document.getElementById("field_g1")?.value);
      const g2 = parseInt(document.getElementById("field_g2")?.value);
      const studytime = parseInt(document.getElementById("field_studytime")?.value);
      const absences = parseInt(document.getElementById("field_absences")?.value);

      if (isNaN(g1) || g1 < 0 || g1 > 20) errors.push("Period 1 Grade (G1) must be between 0 and 20.");
      if (isNaN(g2) || g2 < 0 || g2 > 20) errors.push("Period 2 Grade (G2) must be between 0 and 20.");
      if (isNaN(studytime) || studytime < 1 || studytime > 4) errors.push("Study time scale must be between 1 and 4.");
      if (isNaN(absences) || absences < 0 || absences > 93) errors.push("Absences must be between 0 and 93 days.");

      if (errors.length === 0) {
        payload.G1 = g1;
        payload.G2 = g2;
        payload.studytime = studytime;
        payload.absences = absences;
        payload.age = 16;
        payload.Medu = 3;
        payload.Fedu = 3;
        payload.traveltime = 1;
        payload.failures = 0;
        payload.famrel = 4;
        payload.freetime = 3;
        payload.goout = 3;
        payload.Dalc = 1;
        payload.Walc = 1;
        payload.health = 4;
        payload.school = "GP";
        payload.sex = "F";
        payload.address = "U";
        payload.famsize = "GT3";
        payload.Pstatus = "T";
        payload.Mjob = "teacher";
        payload.Fjob = "services";
        payload.reason = "course";
        payload.guardian = "mother";
        payload.schoolsup = "no";
        payload.famsup = "yes";
        payload.paid = "no";
        payload.activities = "yes";
        payload.nursery = "yes";
        payload.higher = "yes";
        payload.internet = "yes";
        payload.romantic = "no";
      }
    } else if (stage === "primary") {
      const mathScore = parseFloat(document.getElementById("field_math_score")?.value);
      const readingScore = parseFloat(document.getElementById("field_reading_score")?.value);
      const testPrep = document.getElementById("field_test_prep")?.value;
      const gender = document.getElementById("field_gender_primary")?.value;

      if (isNaN(mathScore) || mathScore < 0.0 || mathScore > 100.0) errors.push("Math score must be between 0.0 and 100.0.");
      if (isNaN(readingScore) || readingScore < 0.0 || readingScore > 100.0) errors.push("Reading score must be between 0.0 and 100.0.");

      if (errors.length === 0) {
        payload.Enrolment_score = mathScore;
        payload.Learning_score = readingScore;
        payload.Retention_score = testPrep === "Completed" ? 90.0 : 70.0;
        payload.Gender_parity_score = gender === "Female" ? 90.0 : 85.0;
        payload.School_infrastructure_score = 75.0;
        payload.Total_number_of_schools = 500;
        payload.Drinking_water = 85.0;
        payload.Electricity = 80.0;
        payload.Toilet = 90.0;
        payload.Province = "Punjab";
      }
    }

    return { payload, errors };
  }

  function showErrorBanner(msg) {
    if (errorBanner && errorBannerMessage) {
      errorBannerMessage.innerText = msg;
      errorBanner.classList.add("active");
      errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideErrorBanner() {
    if (errorBanner) {
      errorBanner.classList.remove("active");
    }
  }

  // Reset Form Handler
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      subjectsStore[currentStage] = JSON.parse(JSON.stringify(defaultSubjectsStore[currentStage] || []));
      persistSubjects();
      onStageChange(currentStage);
      showToast("Form inputs & subject records reset to defaults.", "info");
    });
  }

  // ----------------------------------------------------------------------------
  // Form Submission & API Inference Integration
  // ----------------------------------------------------------------------------
  if (predictionForm) {
    predictionForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const { payload, errors } = extractAndValidatePayload(currentStage);

      if (errors.length > 0) {
        showErrorBanner(errors.join(" "));
        showToast("Validation Error: Please check your form inputs.", "error");
        return;
      }

      try {
        setSubmitLoading(true);

        // Call FastAPI Inference endpoint: POST /api/v1/predictions/{stage}
        const result = await window.apiClient.runPrediction(currentStage, payload);

        renderResultCard(result);
        showToast(`Forecast generated: ${result.formatted_score} (${result.status_badge})`, "success");
      } catch (err) {
        console.error("Prediction Inference Error:", err);
        const msg = err.message || "Failed to communicate with FastAPI backend server.";
        showErrorBanner(msg);
        showToast(`API Error: ${msg}`, "error");
      } finally {
        setSubmitLoading(false);
      }
    });
  }

  function setSubmitLoading(isLoading) {
    if (!submitBtn) return;
    if (isLoading) {
      submitBtn.classList.add("btn-loading");
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-icon"></span> Running ML Model...`;
    } else {
      submitBtn.classList.remove("btn-loading");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>⚡ Run AI Forecast Model</span>`;
    }
  }

  // ----------------------------------------------------------------------------
  // Render Prediction Result Card & Confidence Range Bar
  // ----------------------------------------------------------------------------
  function renderResultCard(res) {
    if (!resultCard || !res) return;

    // Elements
    const modelMetaEl = document.getElementById("result-model-meta");
    const statusBadgeEl = document.getElementById("result-status-badge");
    const statusTextEl = document.getElementById("result-status-text");
    const predictedValEl = document.getElementById("result-predicted-val");
    const gradeValEl = document.getElementById("result-grade-val");

    const ciRangeEl = document.getElementById("result-ci-range");
    const ciBarFillEl = document.getElementById("result-ci-bar-fill");
    const ciMarkerEl = document.getElementById("result-ci-marker");
    const ciMinLabel = document.getElementById("ci-min-label");
    const ciMaxLabel = document.getElementById("ci-max-label");

    const positiveListEl = document.getElementById("positive-factors-list");
    const growthListEl = document.getElementById("growth-factors-list");
    const recTextEl = document.getElementById("result-recommendation-text");

    // Populate Metadata & Status Badge
    if (modelMetaEl) modelMetaEl.innerText = `Model: ${res.model_name || "ML Predictor"} (${res.model_version || "v1.0.0"})`;
    if (statusBadgeEl) statusBadgeEl.className = `badge ${res.status_color || "badge-success"}`;
    if (statusTextEl) statusTextEl.innerText = res.status_badge || "Evaluated";

    // Populate Predicted Values
    if (predictedValEl) predictedValEl.innerText = res.formatted_score || `${res.predicted_score}`;
    if (gradeValEl) gradeValEl.innerText = res.predicted_grade ? `Calibrated Grade: ${res.predicted_grade}` : `Educational Stage: ${res.stage}`;

    // Populate Confidence Interval Bar
    const ciLow = res.confidence_interval_low ?? 0;
    const ciHigh = res.confidence_interval_high ?? 0;
    const score = res.predicted_score ?? 0;

    let maxScale = 4.0;
    let minScale = 0.0;
    if (currentStage === "matric_inter") maxScale = 1100.0;
    else if (currentStage === "secondary") maxScale = 20.0;
    else if (currentStage === "primary") maxScale = 100.0;

    if (ciMinLabel) ciMinLabel.innerText = `${minScale.toFixed(2)}`;
    if (ciMaxLabel) ciMaxLabel.innerText = `${maxScale.toFixed(2)}`;
    if (ciRangeEl) ciRangeEl.innerText = `[${ciLow.toFixed(2)} — ${ciHigh.toFixed(2)}]`;

    // Position CI Bar and Marker (%)
    const rangeSpan = maxScale - minScale;
    if (rangeSpan > 0) {
      const leftPct = Math.max(0, Math.min(100, ((ciLow - minScale) / rangeSpan) * 100));
      const rightPct = Math.max(0, Math.min(100, ((ciHigh - minScale) / rangeSpan) * 100));
      const widthPct = Math.max(2, rightPct - leftPct);
      const markerPct = Math.max(0, Math.min(100, ((score - minScale) / rangeSpan) * 100));

      if (ciBarFillEl) {
        ciBarFillEl.style.left = `${leftPct}%`;
        ciBarFillEl.style.width = `${widthPct}%`;
      }
      if (ciMarkerEl) {
        ciMarkerEl.style.left = `${markerPct}%`;
      }
    }

    // Populate Feature Contributions
    const contribs = res.feature_contributions || {};
    const posFactors = contribs.top_positive_factors || ["Strong baseline academic discipline and engagement."];
    const growthFactors = contribs.growth_areas || ["Maintain high attendance during exam blocks."];

    if (positiveListEl) {
      positiveListEl.innerHTML = posFactors.map(f => `
        <li class="factor-item"><span class="factor-bullet">🟢</span> ${f}</li>
      `).join("");
    }

    if (growthListEl) {
      growthListEl.innerHTML = growthFactors.map(f => `
        <li class="factor-item"><span class="factor-bullet">🟡</span> ${f}</li>
      `).join("");
    }

    // Populate AI Recommendation
    if (recTextEl) {
      recTextEl.innerText = res.recommendation || "Maintain consistent daily self-study habits and attendance to secure optimal academic performance.";
    }

    // Reveal Result Card with smooth scroll
    resultCard.classList.add("active");
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});
