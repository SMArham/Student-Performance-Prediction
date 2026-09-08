/**
 * Authentication Form Handlers & Validation
 * Student Performance Prediction & Analytics System
 */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const demoLoginBtn = document.getElementById("demo-login-btn");
  const toastContainer = document.getElementById("toast-container");

  // Show Toast Message Helper
  window.showToast = function(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div style="flex:1;">${message}</div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;">&times;</button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  };

  // Live Database Health Check: Verify Supabase database is online and accessible
  if (window.authClient && typeof window.authClient.checkDatabaseHealth === "function") {
    window.authClient.checkDatabaseHealth().then((status) => {
      const textEl = document.getElementById("db-health-text");
      const dotEl = document.getElementById("db-health-dot");
      if (textEl && dotEl) {
        if (status.connected) {
          dotEl.style.background = "#52c41a";
          dotEl.style.boxShadow = "0 0 6px rgba(82,196,26,0.6)";
          textEl.innerHTML = `<strong style="color: #52c41a;">Database Connected</strong> • Supabase Cloud (${status.latency}ms)`;
        } else {
          dotEl.style.background = "#faad14";
          dotEl.style.boxShadow = "0 0 6px rgba(250,173,20,0.6)";
          textEl.innerHTML = `<strong style="color: #faad14;">Offline Store Active</strong> • Local Storage Synced`;
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // SIGN UP: Interactive Role Selector (Student vs Teacher)
  // ----------------------------------------------------------------------------
  const roleTabStudent = document.getElementById("signup-role-student");
  const roleTabTeacher = document.getElementById("signup-role-teacher");
  const accountRoleInput = document.getElementById("account_role");
  const studentFieldsBlock = document.getElementById("student-fields-block");
  const teacherFieldsBlock = document.getElementById("teacher-fields-block");
  const signupSubmitBtn = document.getElementById("btn-signup-submit");
  const fullNameInput = document.getElementById("full_name");

  function setSignupRole(role) {
    if (!accountRoleInput) return;
    accountRoleInput.value = role;

    if (role === "teacher") {
      if (roleTabTeacher) {
        roleTabTeacher.style.borderColor = "var(--color-lime)";
        roleTabTeacher.style.background = "rgba(168, 240, 75, 0.12)";
        roleTabTeacher.style.color = "#ffffff";
      }
      if (roleTabStudent) {
        roleTabStudent.style.borderColor = "var(--border-subtle)";
        roleTabStudent.style.background = "rgba(255, 255, 255, 0.03)";
        roleTabStudent.style.color = "var(--text-muted)";
      }
      if (studentFieldsBlock) studentFieldsBlock.style.display = "none";
      if (teacherFieldsBlock) teacherFieldsBlock.style.display = "block";
      if (signupSubmitBtn) signupSubmitBtn.innerText = "CREATE TEACHER ACCOUNT";
      if (fullNameInput) fullNameInput.placeholder = "e.g. Dr. Muhammad Farooq";
    } else {
      if (roleTabStudent) {
        roleTabStudent.style.borderColor = "var(--color-lime)";
        roleTabStudent.style.background = "rgba(168, 240, 75, 0.12)";
        roleTabStudent.style.color = "#ffffff";
      }
      if (roleTabTeacher) {
        roleTabTeacher.style.borderColor = "var(--border-subtle)";
        roleTabTeacher.style.background = "rgba(255, 255, 255, 0.03)";
        roleTabTeacher.style.color = "var(--text-muted)";
      }
      if (studentFieldsBlock) studentFieldsBlock.style.display = "block";
      if (teacherFieldsBlock) teacherFieldsBlock.style.display = "none";
      if (signupSubmitBtn) signupSubmitBtn.innerText = "CREATE STUDENT ACCOUNT";
      if (fullNameInput) fullNameInput.placeholder = "e.g. Ali Ahmed";
    }
  }

  if (roleTabStudent) roleTabStudent.addEventListener("click", () => setSignupRole("student"));
  if (roleTabTeacher) roleTabTeacher.addEventListener("click", () => setSignupRole("teacher"));

  // ----------------------------------------------------------------------------
  // SIGN IN: Interactive Portal Switcher (Student vs Teacher) & URL Param Init
  // ----------------------------------------------------------------------------
  const loginPortalStudent = document.getElementById("login-portal-student");
  const loginPortalTeacher = document.getElementById("login-portal-teacher");
  const loginPortalRoleInput = document.getElementById("login_portal_role");
  const loginSubmitBtn = document.getElementById("btn-login-submit");
  const regSuccessBanner = document.getElementById("registration-success-banner");
  const urlParams = new URLSearchParams(window.location.search);

  function setLoginPortal(role) {
    if (!loginPortalRoleInput) return;
    loginPortalRoleInput.value = role;

    const passField = document.getElementById("password");
    if (passField) passField.value = "";

    // If user switches away from the registered role, clear banner
    if (urlParams.get("role") && urlParams.get("role") !== role) {
      if (regSuccessBanner) regSuccessBanner.style.display = "none";
    }

    if (role === "teacher") {
      if (loginPortalTeacher) {
        loginPortalTeacher.style.borderColor = "var(--color-lime)";
        loginPortalTeacher.style.background = "rgba(168, 240, 75, 0.12)";
        loginPortalTeacher.style.color = "#ffffff";
      }
      if (loginPortalStudent) {
        loginPortalStudent.style.borderColor = "var(--border-subtle)";
        loginPortalStudent.style.background = "rgba(255, 255, 255, 0.03)";
        loginPortalStudent.style.color = "var(--text-muted)";
      }
      if (loginSubmitBtn) loginSubmitBtn.innerText = "SIGN IN AS TEACHER";
    } else {
      if (loginPortalStudent) {
        loginPortalStudent.style.borderColor = "var(--color-lime)";
        loginPortalStudent.style.background = "rgba(168, 240, 75, 0.12)";
        loginPortalStudent.style.color = "#ffffff";
      }
      if (loginPortalTeacher) {
        loginPortalTeacher.style.borderColor = "var(--border-subtle)";
        loginPortalTeacher.style.background = "rgba(255, 255, 255, 0.03)";
        loginPortalTeacher.style.color = "var(--text-muted)";
      }
      if (loginSubmitBtn) loginSubmitBtn.innerText = "SIGN IN AS STUDENT";
    }
  }

  if (loginPortalStudent) loginPortalStudent.addEventListener("click", () => setLoginPortal("student"));
  if (loginPortalTeacher) loginPortalTeacher.addEventListener("click", () => setLoginPortal("teacher"));

  // Handle post-signup redirect parameters on login page
  if (urlParams.get("registered") === "true") {
    if (regSuccessBanner) regSuccessBanner.style.display = "block";
    const regEmail = urlParams.get("email");
    const regRole = urlParams.get("role") || "student";
    if (regEmail) {
      const emailField = document.getElementById("email");
      if (emailField) emailField.value = regEmail;
    }
    setLoginPortal(regRole);
    showToast(`Account created as ${regRole === "teacher" ? "Teacher" : "Student"}! Please enter your password to sign in.`, "success");
    const passField = document.getElementById("password");
    if (passField) passField.focus();
  }

  // ----------------------------------------------------------------------------
  // Real-Time Email Validation & Security Indicator
  // ----------------------------------------------------------------------------
  const emailInputEl = document.getElementById("email");
  const emailValidationMsg = document.getElementById("email-validation-msg");

  if (emailInputEl) {
    const handleEmailInputCheck = () => {
      const val = emailInputEl.value.trim();
      if (!val) {
        if (emailValidationMsg) emailValidationMsg.style.display = "none";
        emailInputEl.style.borderColor = "";
        return;
      }

      if (val.includes("@") && val.split("@")[1] && val.split("@")[1].includes(".")) {
        const check = window.validateRealEmail ? window.validateRealEmail(val) : { valid: true };
        if (!check.valid) {
          if (emailValidationMsg) {
            emailValidationMsg.style.display = "block";
            emailValidationMsg.style.color = "#ff6b6b";
            emailValidationMsg.innerHTML = `⚠️ ${check.error}`;
          }
          emailInputEl.style.borderColor = "#ff4d4f";
        } else {
          if (emailValidationMsg) {
            emailValidationMsg.style.display = "block";
            emailValidationMsg.style.color = "var(--color-lime)";
            emailValidationMsg.innerHTML = `✓ Legitimate active email`;
          }
          emailInputEl.style.borderColor = "var(--color-lime)";
        }
      } else {
        if (emailValidationMsg) emailValidationMsg.style.display = "none";
        emailInputEl.style.borderColor = "";
      }
    };

    emailInputEl.addEventListener("input", handleEmailInputCheck);
    emailInputEl.addEventListener("blur", handleEmailInputCheck);
  }

  // ----------------------------------------------------------------------------
  // Sign In Form Submission
  // ----------------------------------------------------------------------------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value.trim();
      const password = document.getElementById("password")?.value;
      const submitBtn = loginSubmitBtn || loginForm.querySelector("button[type='submit']");
      const activeRole = loginPortalRoleInput ? loginPortalRoleInput.value : "student";

      if (!email || !password) {
        showToast("Please provide both email and password.", "error");
        return;
      }

      // High-Security Email Validation: Reject fake/disposable emails
      if (window.validateRealEmail) {
        const emailCheck = window.validateRealEmail(email);
        if (!emailCheck.valid) {
          showToast(emailCheck.error, "error");
          const emailField = document.getElementById("email");
          if (emailField) {
            emailField.focus();
            emailField.style.borderColor = "#ff4d4f";
          }
          return;
        }
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = "Verifying Credentials...";
        }

        await window.authClient.signIn(email, password, activeRole);
        const u = window.authClient.getUser();
        const userRole = (u?.user_metadata?.role || activeRole || "student").toLowerCase();
        const isTeacher = userRole === "teacher";

        showToast(`Welcome back, ${u?.user_metadata?.full_name || "User"}! Redirecting...`, "success");

        setTimeout(() => {
          window.location.href = isTeacher ? "teacher-dashboard.html" : "dashboard.html";
        }, 600);
      } catch (err) {
        const msg = err.message || "Invalid email or password.";
        showToast(msg, "error");
        if (msg.includes("switch to the Teacher Portal")) {
          setLoginPortal("teacher");
        } else if (msg.includes("switch to the Student Portal")) {
          setLoginPortal("student");
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          const currentActive = loginPortalRoleInput ? loginPortalRoleInput.value : activeRole;
          submitBtn.innerText = currentActive === "teacher" ? "SIGN IN AS TEACHER" : "SIGN IN AS STUDENT";
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Sign Up Form Submission (First make account, then redirect to login)
  // ----------------------------------------------------------------------------
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("full_name")?.value.trim();
      const email = document.getElementById("email")?.value.trim();
      const role = document.getElementById("account_role")?.value || "student";
      const institution = document.getElementById("institution_name")?.value.trim() || "Faculty of Engineering";
      const gender = document.getElementById("gender")?.value || "male";
      const password = document.getElementById("password")?.value;
      const confirmPassword = document.getElementById("confirm_password")?.value;
      const submitBtn = signupSubmitBtn || signupForm.querySelector("button[type='submit']");

      let program = "";
      let stage = "university";
      let department = "";
      let designation = "Faculty Instructor";

      if (role === "teacher") {
        department = document.getElementById("teacher_department")?.value.trim() || "Computer Science";
        designation = document.getElementById("teacher_designation")?.value || "Faculty Instructor";
        program = department;
        stage = "all";
      } else {
        stage = document.getElementById("stage")?.value || "university";
        program = document.getElementById("program")?.value.trim() || "Software Engineering";
      }

      if (!fullName || !email || !password) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      // High-Security Email Validation: Reject disposable, temporary, and fake domains
      if (window.validateRealEmail) {
        const emailCheck = window.validateRealEmail(email);
        if (!emailCheck.valid) {
          showToast(emailCheck.error, "error");
          const emailField = document.getElementById("email");
          if (emailField) {
            emailField.focus();
            emailField.style.borderColor = "#ff4d4f";
          }
          return;
        }
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters long.", "error");
        return;
      }

      if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = "Creating Account...";
        }

        const uniqueSuffix = Math.floor(10 + Math.random() * 90);
        const autoId = role === "teacher" ? `TCH-0${Math.floor(1 + Math.random() * 9)}` : `STU-${uniqueSuffix}`;

        await window.authClient.signUp(email, password, {
          full_name: fullName,
          gender: gender,
          role: role,
          stage: stage,
          institution_name: institution,
          institution: institution,
          program: program,
          major: program,
          department: department || program,
          designation: designation,
          student_id: autoId,
          id_code: autoId
        });

        showToast("Account created successfully! Please sign in with your password.", "success");

        setTimeout(() => {
          window.location.href = `login.html?registered=true&email=${encodeURIComponent(email)}&role=${role}`;
        }, 700);
      } catch (err) {
        const msg = err.message || "Registration failed. Please try again.";
        showToast(msg, "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = role === "teacher" ? "CREATE TEACHER ACCOUNT" : "CREATE STUDENT ACCOUNT";
        }
      }
    });
  }

});
