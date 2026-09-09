/**
 * ============================================================================
 * STUDENT PERFORMANCE PREDICTION — PROFILE & ACCOUNT SETTINGS (profile.js)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Authentication Safeguard
  if (window.authClient && !window.authClient.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // 2. Current User Session & Metadata
  const currentUser = window.authClient ? window.authClient.getUser() : null;
  const userMeta = currentUser?.user_metadata || {};

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
    const roleLabel = (meta.role === "teacher" || meta.role === "instructor") ? "Teacher / Instructor" : "Student";
    const idCode = meta.student_id || meta.id_code || "STU-2026-001";
    const program = meta.program || meta.major || "";
    const institution = meta.institution_name || meta.institution || "";
    const stage = meta.stage || "university";

    // Navbar Elements
    const studentNameEl = document.getElementById("student-name");
    const studentIdCodeEl = document.getElementById("student-id-code");
    const avatarEl = document.getElementById("navbar-user-avatar");

    if (studentNameEl) studentNameEl.innerText = displayName;
    if (studentIdCodeEl) studentIdCodeEl.innerText = roleLabel;

    // Avatar Initials
    const words = displayName.trim().split(/\s+/);
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
    if (avatarEl) avatarEl.innerText = initials || "SP";

    // Inputs
    const settingNameInput = document.getElementById("setting-fullname");
    const settingEmailInput = document.getElementById("setting-email");
    const settingStudentId = document.getElementById("setting-studentid");
    const settingStage = document.getElementById("setting-stage");
    const settingProgram = document.getElementById("setting-program");
    const settingInstitution = document.getElementById("setting-institution");

    if (settingNameInput) settingNameInput.value = displayName;
    if (settingEmailInput) settingEmailInput.value = user?.email || "";
    if (settingStudentId) settingStudentId.value = idCode;
    if (settingStage) settingStage.value = stage;
    if (settingProgram) settingProgram.value = program;
    if (settingInstitution) settingInstitution.value = institution;
  }

  // 8. Profile Details Form Save
  const profileForm = document.getElementById("profile-details-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
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
            stage: stage
          });
        }
        renderProfile();
        showToast("Profile details updated successfully!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update profile.", "error");
      }
    });
  }

  // 9. Password Security Form Save
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
        secForm.reset();
        showToast("Password updated securely!", "success");
      } catch (err) {
        showToast(err.message || "Failed to update password.", "error");
      }
    });
  }

  // 10. Delete Account Action
  const btnDeleteAccount = document.getElementById("btn-delete-account-confirm");
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("Are you completely sure you want to delete your account? This action cannot be undone.")) {
        try {
          if (window.authClient) await window.authClient.deleteAccount();
          window.location.href = "login.html";
        } catch (err) {
          showToast(err.message || "Failed to delete account.", "error");
        }
      }
    });
  }

  // Initial Load
  renderProfile();
});
