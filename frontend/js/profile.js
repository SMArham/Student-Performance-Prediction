/**
 * ============================================================================
 * STUDENT PERFORMANCE PREDICTION — PROFILE & ACCOUNT SETTINGS (profile.js)
 * Modern UI & Synchronized User Identity Engine
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authentication Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // 2. Stage Display Formatter
  const stageMap = {
    university: "University (0.00 – 4.00 CGPA)",
    intermediate: "Intermediate (HSSC / FSC)",
    matric: "Matriculation (SSC / 9th-10th)",
    secondary: "Secondary School (6th-8th)",
    primary: "Primary School (1st-5th)"
  };

  // 3. Instant Sign Out
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.authClient) await window.authClient.signOut();
      window.location.href = "login.html";
    });
  }

  // 5. Toast Notification Helper
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
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3500);
  }

  // 6. Tab Switching Logic
  const tabBtns = document.querySelectorAll(".modal-tab-btn");
  const tabContents = document.querySelectorAll(".profile-tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => {
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

  // 7. Render User Profile Information
  function renderProfile() {
    const user = window.authClient ? window.authClient.getUser() : null;
    const meta = user?.user_metadata || {};
    const displayName = meta.full_name || (user?.email ? user.email.split("@")[0] : "Student User");
    const roleLabel = (meta.role === "teacher" || meta.role === "instructor") ? "Teacher / Instructor" : "Student Portal";
    const idCode = (user?.id && (user.id.startsWith("STU-") || user.id.startsWith("TCH-")))
      ? user.id
      : (meta.student_id || meta.id_code || (meta.role === "teacher" ? "TCH-01" : "STU-01"));
    const program = meta.program || meta.major || "";
    const institution = meta.institution_name || meta.institution || "";
    const stage = meta.stage || "university";
    const email = user?.email || "student@university.edu";

    // Initials Calculation
    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();

    // Upper Navbar Elements
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");
    const avatarEl = document.getElementById("navbar-user-avatar");

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentIdCodeEl) studentIdCodeEl.innerText = idCode;
    if (avatarEl) avatarEl.innerText = initials || "SP";

    // Hero Identity Card Elements
    const heroNameEl = document.getElementById("hero-profile-name");
    const heroIdEl = document.getElementById("hero-profile-id");
    const heroAvatarEl = document.getElementById("hero-profile-avatar");
    const heroStageEl = document.getElementById("hero-stage-text");
    const heroEmailEl = document.getElementById("hero-email-text");
    const heroProgramEl = document.getElementById("hero-program-text");
    const heroInstitutionEl = document.getElementById("hero-institution-text");

    if (heroNameEl) heroNameEl.innerText = displayName;
    if (heroIdEl) heroIdEl.innerText = idCode;
    if (heroAvatarEl) heroAvatarEl.innerText = initials || "SP";
    if (heroStageEl) heroStageEl.innerText = stageMap[stage] || stage.toUpperCase();
    if (heroEmailEl) heroEmailEl.innerText = email;
    if (heroProgramEl) heroProgramEl.innerText = program ? program : "Major: Not Specified";
    if (heroInstitutionEl) heroInstitutionEl.innerText = institution ? institution : "Institution: Not Specified";

    // Form Inputs
    const settingNameInput = document.getElementById("setting-fullname");
    const settingEmailInput = document.getElementById("setting-email");
    const settingStudentId = document.getElementById("setting-studentid");
    const settingStage = document.getElementById("setting-stage");
    const settingProgram = document.getElementById("setting-program");
    const settingInstitution = document.getElementById("setting-institution");
    const settingActivity = document.getElementById("setting-activity");

    if (settingNameInput) settingNameInput.value = displayName;
    if (settingEmailInput) settingEmailInput.value = email;
    if (settingStudentId) settingStudentId.value = idCode;
    if (settingStage) settingStage.value = stage;
    if (settingProgram) settingProgram.value = program;
    if (settingInstitution) settingInstitution.value = institution;
    if (settingActivity) settingActivity.value = meta.academic_activity || meta.activity || "";
  }

  // 8. Profile Details Form Save Handler (Only 3 fields editable: Major, Institution, Activity)
  const profileForm = document.getElementById("profile-details-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("btn-save-profile");
      const originalBtnText = saveBtn ? saveBtn.innerHTML : "Save";

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `⏳ Saving...`;
      }

      // Strictly the 3 user-permitted parameters
      const program = document.getElementById("setting-program")?.value.trim() || "";
      const inst = document.getElementById("setting-institution")?.value.trim() || "";
      const activity = document.getElementById("setting-activity")?.value.trim() || "";

      try {
        if (window.authClient) {
          await window.authClient.updateUser({
            program: program,
            major: program,
            institution_name: inst,
            institution: inst,
            academic_activity: activity,
            activity: activity
          });
        }
        renderProfile();
        showToast("Profile details updated successfully!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update profile.", "error");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  // 12. Delete Account Action
  const btnDeleteAccount = document.getElementById("btn-delete-account-confirm");
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("Are you completely sure you want to permanently delete your account? All diagnostics and personal records will be wiped forever.")) {
        try {
          if (window.authClient) await window.authClient.deleteAccount();
          window.location.href = "login.html";
        } catch (err) {
          showToast(err.message || "Failed to delete account.", "error");
        }
      }
    });
  }

  // Initial Render on Page Load
  renderProfile();
  if (window.authClient && window.authClient.syncProfileWithDatabase) {
    window.authClient.syncProfileWithDatabase().then(() => renderProfile());
  }
});
