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

  // 3. Live Database Health Check
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

  // 4. Instant Sign Out
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
    const idCode = meta.student_id || meta.id_code || (user?.id ? `STU-${user.id.slice(0, 6).toUpperCase()}` : "STU-2026-001");
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

    if (settingNameInput) settingNameInput.value = displayName;
    if (settingEmailInput) settingEmailInput.value = email;
    if (settingStudentId) settingStudentId.value = idCode;
    if (settingStage) settingStage.value = stage;
    if (settingProgram) settingProgram.value = program;
    if (settingInstitution) settingInstitution.value = institution;
  }

  // 8. Password Visibility Toggles
  document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        input.type = "password";
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });

  // 9. Password Strength Live Evaluation
  const newPwdInput = document.getElementById("setting-new-password");
  const pwdFill = document.getElementById("pwd-meter-fill");
  const pwdLabel = document.getElementById("pwd-meter-text");

  if (newPwdInput && pwdFill && pwdLabel) {
    newPwdInput.addEventListener("input", () => {
      const val = newPwdInput.value;
      if (!val) {
        pwdFill.style.width = "0%";
        pwdFill.style.background = "#f87171";
        pwdLabel.innerText = "Strength: Enter password";
        pwdLabel.style.color = "var(--text-muted)";
        return;
      }

      let score = 0;
      if (val.length >= 6) score += 25;
      if (val.length >= 10) score += 25;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 25;
      if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 25;

      pwdFill.style.width = `${score}%`;
      if (score <= 25) {
        pwdFill.style.background = "#f87171";
        pwdLabel.innerText = "Strength: Weak (min. 6 characters)";
        pwdLabel.style.color = "#f87171";
      } else if (score <= 50) {
        pwdFill.style.background = "#ff9c27";
        pwdLabel.innerText = "Strength: Moderate (add letters & numbers)";
        pwdLabel.style.color = "#ff9c27";
      } else if (score <= 75) {
        pwdFill.style.background = "#38bdf8";
        pwdLabel.innerText = "Strength: Good";
        pwdLabel.style.color = "#38bdf8";
      } else {
        pwdFill.style.background = "#a8f04b";
        pwdLabel.innerText = "Strength: Excellent & Secure 🛡️";
        pwdLabel.style.color = "#a8f04b";
      }
    });
  }

  // 10. Profile Details Form Save Handler
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

      const name = document.getElementById("setting-fullname")?.value.trim() || "User";
      const program = document.getElementById("setting-program")?.value.trim() || "";
      const inst = document.getElementById("setting-institution")?.value.trim() || "";
      const stage = document.getElementById("setting-stage")?.value || "university";

      try {
        if (window.authClient) {
          await window.authClient.updateUser({
            full_name: name,
            program: program,
            major: program,
            institution_name: inst,
            institution: inst,
            stage: stage
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

  // 11. Password Security Form Save Handler
  const secForm = document.getElementById("profile-security-form");
  if (secForm) {
    secForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveSecBtn = document.getElementById("btn-save-security");
      const origSecText = saveSecBtn ? saveSecBtn.innerHTML : "Update";

      const newPass = document.getElementById("setting-new-password")?.value;
      const confPass = document.getElementById("setting-confirm-password")?.value;

      if (!newPass || newPass.length < 6) {
        return showToast("Password must be at least 6 characters long.", "error");
      }
      if (newPass !== confPass) {
        return showToast("Passwords do not match.", "error");
      }

      if (saveSecBtn) {
        saveSecBtn.disabled = true;
        saveSecBtn.innerHTML = `⏳ Updating Password...`;
      }

      try {
        if (window.authClient) await window.authClient.updatePassword(newPass);
        secForm.reset();
        if (pwdFill) pwdFill.style.width = "0%";
        if (pwdLabel) {
          pwdLabel.innerText = "Strength: Enter password";
          pwdLabel.style.color = "var(--text-muted)";
        }
        showToast("Password updated securely!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update password.", "error");
      } finally {
        if (saveSecBtn) {
          saveSecBtn.disabled = false;
          saveSecBtn.innerHTML = origSecText;
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
});
