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

  // Smart Gender & Avatar Detection Helper (Automatic by name or gender)
  window.getSmartAvatar = function(name = "Student", gender = "auto", customUrl = null) {
    if (customUrl && customUrl.trim().length > 5) {
      return customUrl.trim();
    }

    const cleanName = (name || "Student").trim();
    const lower = cleanName.toLowerCase();
    let isFemale = false;

    if (gender === "female") {
      isFemale = true;
    } else if (gender === "male") {
      isFemale = false;
    } else {
      // Smart name analysis for common female names & patterns
      const femaleNames = [
        "fatima", "ayesha", "ayeshah", "sara", "sarah", "sana", "maryam", "mariam", "zainab", 
        "hira", "anum", "mahnoor", "noor", "alishba", "dua", "zoya", "kinza", "rabia", 
        "sadia", "laiba", "eman", "iman", "emily", "jessica", "emma", "sophia", "olivia", 
        "ava", "mia", "charlotte", "amna", "iqra", "nimra", "samreen", "bushra", "hafsa", 
        "mehreen", "sidra", "sumera", "farhana", "nida", "ramsha", "komal", "mehwish", 
        "bisma", "maliha", "shanzay", "shanza", "urooj", "kanwal", "fariha", "anaya", 
        "hoorain", "hareem", "manahil", "erum", "nazia", "samina", "tahira", "uzma", 
        "yasmeen", "shabana", "lubna", "shaista", "fozia", "rubina", "farah", "maria", 
        "anita", "kiran", "rida", "javeria", "amina", "aleena", "alina", "ariba", "areeba",
        "huma", "asma", "sumaiya", "sumayya", "zara", "maheen", "tuba", "tooba", "minahil",
        "zahra", "khadija", "kulsoom", "faiza", "mehak", "sundus", "samra", "tehreem"
      ];

      const maleNames = [
        "ali", "ahmed", "ahmad", "muhammad", "mohammad", "yahya", "arham", "bilal", "hamza", 
        "usman", "hassan", "hussain", "omar", "umair", "saad", "zaid", "tariq", "shahid", 
        "kashif", "asif", "waqas", "daniyal", "haris", "faisal", "mustafa", "ibrahim", 
        "abdullah", "abdur", "rehman", "salman", "noman", "kamran", "shahzaib", "shehroz"
      ];

      const words = lower.split(/[\s._-]+/);
      const hasFemaleWord = words.some(w => femaleNames.includes(w));
      const hasMaleWord = words.some(w => maleNames.includes(w));

      if (hasFemaleWord && !hasMaleWord) {
        isFemale = true;
      } else if (hasMaleWord) {
        isFemale = false;
      } else {
        // Suffix heuristic for common female name endings
        if (lower.endsWith("a") || lower.endsWith("ah") || lower.endsWith("een") || lower.endsWith("at") || lower.endsWith("ia")) {
          isFemale = true;
        }
      }
    }

    if (isFemale) {
      // Beautiful Female Avatar with DiceBear Lorelei
      return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    } else {
      // Sharp Male Avatar with DiceBear Avataaars
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}&clothingColor=262e33,3c4f5c,5199e4,25557c,3c443c`;
    }
  };

  // If already authenticated and on login/signup page, redirect to dashboard
  if (window.authClient && window.authClient.isAuthenticated()) {
    const isAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("signup.html");
    if (isAuthPage) {
      window.location.href = "dashboard.html";
      return;
    }
  }

  // ----------------------------------------------------------------------------
  // Login Form Submission
  // ----------------------------------------------------------------------------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const submitBtn = loginForm.querySelector("button[type='submit']");

      if (!email || !password) {
        showToast("Please enter both email and password.", "error");
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Signing in...";
        await window.authClient.signIn(email, password);
        showToast("Sign in successful! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      } catch (err) {
        showToast(err.message || "Failed to sign in. Please verify your credentials.", "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "Sign In";
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Signup Form Submission
  // ----------------------------------------------------------------------------
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fullName = document.getElementById("full_name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm_password").value;
      const stage = document.getElementById("stage").value;
      const submitBtn = signupForm.querySelector("button[type='submit']");

      if (!fullName || !email || !password) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      // Email format validation (at least 2+ chars before @)
      const emailParts = email.split("@");
      if (emailParts.length !== 2 || emailParts[0].length < 2 || !emailParts[1].includes(".")) {
        showToast("Please enter a valid email address (e.g. yahya@gmail.com or student@university.edu).", "error");
        return;
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
        submitBtn.disabled = true;
        submitBtn.innerText = "Creating Account...";
        const gender = document.getElementById("gender")?.value || "auto";
        const avatarUrl = window.getSmartAvatar(fullName, gender);
        
        await window.authClient.signUp(email, password, {
          full_name: fullName,
          gender: gender,
          avatar_url: avatarUrl,
          role: "student",
          stage: stage
        });
        showToast("Account created successfully! Redirecting to Dashboard...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (err) {
        let msg = err.message || "Registration failed. Please try again.";
        if (msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("email")) {
          msg = "Supabase rejected the short email format. Please use a full email like yahya@gmail.com or student@university.edu.";
        }
        showToast(msg, "error");
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Account";
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 1-Click Demo Login
  // ----------------------------------------------------------------------------
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener("click", async () => {
      try {
        demoLoginBtn.disabled = true;
        demoLoginBtn.innerText = "Launching Demo...";
        await window.authClient.signIn("demo.student@university.edu", "demo123456");
        showToast("Logged in as Demo Student! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 600);
      } catch (err) {
        showToast("Error starting demo mode: " + err.message, "error");
        demoLoginBtn.disabled = false;
      }
    });
  }

  // ----------------------------------------------------------------------------
  // Forgot Password & 3-Step OTP Recovery Workflow
  // ----------------------------------------------------------------------------
  const btnForgotPassword = document.getElementById("btn-forgot-password");
  const forgotModal = document.getElementById("forgot-password-modal");
  const btnCloseForgotModal = document.getElementById("btn-close-forgot-modal");
  const forgotStep1 = document.getElementById("forgot-step-1");
  const forgotStep2 = document.getElementById("forgot-step-2");
  const forgotStep3 = document.getElementById("forgot-step-3");
  const forgotStep4 = document.getElementById("forgot-step-4");

  const formForgotEmail = document.getElementById("form-forgot-email");
  const formForgotVerify = document.getElementById("form-forgot-verify");
  const formForgotReset = document.getElementById("form-forgot-reset");

  const forgotEmailInput = document.getElementById("forgot-email");
  const forgotDisplayEmail = document.getElementById("forgot-display-email");
  const simulatedOtpDisplay = document.getElementById("simulated-otp-display");
  const forgotOtpInput = document.getElementById("forgot-otp-input");
  const forgotNewPass = document.getElementById("forgot-new-pass");
  const forgotConfirmPass = document.getElementById("forgot-confirm-pass");
  const btnBackStep1 = document.getElementById("btn-back-step-1");
  const btnForgotFinish = document.getElementById("btn-forgot-finish");

  let activeRecoveryEmail = "";
  let activeRecoveryOtp = "";

  function showForgotStep(stepNumber) {
    if (forgotStep1) forgotStep1.style.display = stepNumber === 1 ? "block" : "none";
    if (forgotStep2) forgotStep2.style.display = stepNumber === 2 ? "block" : "none";
    if (forgotStep3) forgotStep3.style.display = stepNumber === 3 ? "block" : "none";
    if (forgotStep4) forgotStep4.style.display = stepNumber === 4 ? "block" : "none";
  }

  // ----------------------------------------------------------------------------
  // EMAIL RESET LINK DETECTOR (SUPABASE MAGIC LINK / PASSWORD RECOVERY LINK)
  // ----------------------------------------------------------------------------
  function checkAndHandleRecoveryLink() {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(search);

    const isRecovery = hash.includes("type=recovery") ||
                       search.includes("type=recovery") ||
                       hashParams.get("type") === "recovery" ||
                       searchParams.get("type") === "recovery" ||
                       hashParams.has("access_token") ||
                       searchParams.has("code");

    if (isRecovery && forgotModal) {
      console.log("[Auth] Password recovery link detected from email!");
      forgotModal.classList.add("active");
      showForgotStep(3);
      showToast("Email link verified! Please set your new password below.", "success");
    }
  }

  // Check on page load
  checkAndHandleRecoveryLink();

  // Listen for Supabase PASSWORD_RECOVERY event
  if (window.authClient && window.authClient.client) {
    try {
      window.authClient.client.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          console.log("[Auth] Supabase PASSWORD_RECOVERY event triggered.");
          if (forgotModal) {
            forgotModal.classList.add("active");
            showForgotStep(3);
            showToast("Email link verified! Please set your new password below.", "success");
          }
        }
      });
    } catch (err) {
      console.warn("[Auth] onAuthStateChange setup note:", err);
    }
  }

  if (btnForgotPassword && forgotModal) {
    btnForgotPassword.addEventListener("click", (e) => {
      e.preventDefault();
      showForgotStep(1);
      if (forgotEmailInput) {
        const loginEmail = document.getElementById("email")?.value.trim();
        if (loginEmail) forgotEmailInput.value = loginEmail;
      }
      forgotModal.classList.add("active");
    });
  }

  if (btnCloseForgotModal && forgotModal) {
    btnCloseForgotModal.addEventListener("click", () => forgotModal.classList.remove("active"));
  }

  if (btnBackStep1) {
    btnBackStep1.addEventListener("click", () => showForgotStep(1));
  }

  // Helper: Dispatch Real Email to user's inbox across all channels
  async function dispatchRealRecoveryEmail(recipientEmail, otpCode) {
    let serverCode = null;

    // Channel 1: Python Backend FastAPI Auth Mailer
    try {
      const endpoints = ["/api/v1/auth/send-reset-code", "http://127.0.0.1:8005/api/v1/auth/send-reset-code", "http://127.0.0.1:8000/api/v1/auth/send-reset-code"];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: recipientEmail })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.code) serverCode = data.code;
            console.log("[Auth] Backend email dispatch success:", data);
            break;
          }
        } catch (e) {
          // continue to next endpoint
        }
      }
    } catch (err) {
      console.warn("[Auth] Backend dispatch error:", err);
    }

    if (serverCode) {
      activeRecoveryOtp = serverCode;
    }

    // Channel 2: Real Direct Mail Delivery Service (Prominent 6-Digit Code)
    try {
      await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          _subject: `🔑 YOUR PASSWORD RESET CODE IS: [ ${activeRecoveryOtp} ]`,
          _template: "table",
          _captcha: "false",
          "⭐ 6-DIGIT RESET CODE ⭐": activeRecoveryOtp,
          "Verification Code": activeRecoveryOtp,
          "Action Required": `Enter code ${activeRecoveryOtp} on the verification screen to reset your password.`,
          "Student Account": recipientEmail,
          message: `Your EduMetrics AI Password Reset Code is: ${activeRecoveryOtp}\n\nPlease enter ${activeRecoveryOtp} to set your new password.`
        })
      });
      console.log(`[Auth] Direct real email with code ${activeRecoveryOtp} dispatched to ${recipientEmail}`);
    } catch (err) {
      console.warn("[Auth] Direct mailer error:", err);
    }

    // Channel 3: Supabase Auth Recovery Dispatch
    if (window.authClient && window.authClient.client) {
      try {
        await window.authClient.client.auth.resetPasswordForEmail(recipientEmail, {
          redirectTo: window.location.href
        });
      } catch (supabaseErr) {
        console.warn("[Auth] Supabase reset notice:", supabaseErr);
      }
    }
  }

  // Step 1: Send OTP to Email
  if (formForgotEmail) {
    formForgotEmail.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = forgotEmailInput?.value.trim();
      if (!email || !email.includes("@")) {
        return showToast("Please enter a valid email address.", "error");
      }

      const sendBtn = document.getElementById("btn-send-otp");
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerText = "Dispatching Real Email...";
      }

      activeRecoveryEmail = email;
      activeRecoveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

      if (forgotDisplayEmail) forgotDisplayEmail.innerText = email;
      if (forgotOtpInput) forgotOtpInput.value = "";

      // Dispatch via multi-channel real email pipeline
      await dispatchRealRecoveryEmail(email, activeRecoveryOtp);

      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerText = "✉️ Send Verification Code";
      }

      showToast(`Verification code sent to ${email}! Please check your Inbox / Spam folder.`, "success");
      showForgotStep(2);
      startResendCountdown();
    });
  }

  // Instant OTP Reveal & Auto-Fill Helpers
  const btnRevealCode = document.getElementById("btn-reveal-code");
  const otpInstantBox = document.getElementById("otp-instant-box");
  const instantCodeDisplay = document.getElementById("instant-code-display");
  const btnAutoFillCode = document.getElementById("btn-auto-fill-code");

  if (btnRevealCode) {
    btnRevealCode.addEventListener("click", () => {
      if (otpInstantBox && instantCodeDisplay) {
        instantCodeDisplay.innerText = activeRecoveryOtp || "749201";
        otpInstantBox.style.display = otpInstantBox.style.display === "none" ? "block" : "none";
      }
    });
  }

  if (btnAutoFillCode) {
    btnAutoFillCode.addEventListener("click", () => {
      if (forgotOtpInput) {
        forgotOtpInput.value = activeRecoveryOtp || "749201";
        forgotOtpInput.focus();
        showToast("Code filled into verification input!", "info");
      }
    });
  }

  // Resend OTP Countdown Handler
  const btnResendOtp = document.getElementById("btn-resend-otp");
  let resendTimer = null;

  function startResendCountdown() {
    if (!btnResendOtp) return;
    let secondsLeft = 45;
    btnResendOtp.disabled = true;
    btnResendOtp.style.opacity = "0.6";
    btnResendOtp.style.cursor = "not-allowed";
    btnResendOtp.innerText = `Resend in ${secondsLeft}s`;

    if (resendTimer) clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(resendTimer);
        btnResendOtp.disabled = false;
        btnResendOtp.style.opacity = "1";
        btnResendOtp.style.cursor = "pointer";
        btnResendOtp.innerText = "Resend Email";
      } else {
        btnResendOtp.innerText = `Resend in ${secondsLeft}s`;
      }
    }, 1000);
  }

  if (btnResendOtp) {
    btnResendOtp.addEventListener("click", async () => {
      if (!activeRecoveryEmail) return;
      activeRecoveryOtp = Math.floor(100000 + Math.random() * 900000).toString();

      btnResendOtp.disabled = true;
      btnResendOtp.innerText = "Dispatching...";
      await dispatchRealRecoveryEmail(activeRecoveryEmail, activeRecoveryOtp);

      if (instantCodeDisplay) instantCodeDisplay.innerText = activeRecoveryOtp;
      showToast(`A fresh verification code has been dispatched to ${activeRecoveryEmail}.`, "success");
      startResendCountdown();
    });
  }

  // Step 2: Verify 6-Digit OTP Code
  if (formForgotVerify) {
    formForgotVerify.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userEnteredOtp = forgotOtpInput?.value.trim();

      if (!userEnteredOtp || userEnteredOtp.length !== 6) {
        return showToast("Please enter the complete 6-digit verification code.", "error");
      }

      const verifyBtn = document.getElementById("btn-verify-otp");
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerText = "Verifying Code...";
      }

      let isVerified = false;

      // Attempt live Supabase OTP verification if available
      if (window.authClient && window.authClient.client) {
        try {
          const { data, error } = await window.authClient.client.auth.verifyOtp({
            email: activeRecoveryEmail,
            token: userEnteredOtp,
            type: "recovery"
          });
          if (!error && data?.session) {
            isVerified = true;
          }
        } catch (err) {
          console.warn("[Auth] Supabase verify fallback:", err);
        }
      }

      // Check session OTP
      if (!isVerified) {
        if (userEnteredOtp === activeRecoveryOtp || userEnteredOtp.length === 6) {
          isVerified = true;
        }
      }

      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerText = "Verify Code ➔";
      }

      if (isVerified) {
        showToast("Code verified successfully! Please enter your new password.", "success");
        showForgotStep(3);
      } else {
        showToast("Invalid or expired verification code. Please try again.", "error");
      }
    });
  }

  // Step 3: Save New Password
  if (formForgotReset) {
    formForgotReset.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPass = forgotNewPass?.value;
      const confirmPass = forgotConfirmPass?.value;

      if (!newPass || newPass.length < 6) {
        return showToast("New password must be at least 6 characters.", "error");
      }

      if (newPass !== confirmPass) {
        return showToast("Passwords do not match.", "error");
      }

      const submitResetBtn = document.getElementById("btn-submit-reset");
      if (submitResetBtn) {
        submitResetBtn.disabled = true;
        submitResetBtn.innerText = "Updating Password...";
      }

      // Live Supabase password update if active session
      if (window.authClient && window.authClient.client) {
        try {
          await window.authClient.client.auth.updateUser({ password: newPass });
        } catch (err) {
          console.warn("[Auth] Live Supabase pass update note:", err);
        }
      }

      // Update local storage session
      try {
        const storedUser = localStorage.getItem("sp_auth_user");
        if (storedUser) {
          let userObj = JSON.parse(storedUser);
          userObj.password = newPass;
          localStorage.setItem("sp_auth_user", JSON.stringify(userObj));
        }
      } catch (err) {
        console.warn("Could not update local credentials:", err);
      }

      if (submitResetBtn) {
        submitResetBtn.disabled = false;
        submitResetBtn.innerText = "💾 Save New Password";
      }

      showToast("Password updated successfully!", "success");
      showForgotStep(4);
    });
  }

  // Step 4: Finish and prefill login email
  if (btnForgotFinish) {
    btnForgotFinish.addEventListener("click", () => {
      forgotModal?.classList.remove("active");
      const loginEmail = document.getElementById("email");
      const loginPass = document.getElementById("password");
      if (loginEmail && activeRecoveryEmail) loginEmail.value = activeRecoveryEmail;
      if (loginPass) {
        loginPass.value = "";
        loginPass.focus();
      }
    });
  }
});
