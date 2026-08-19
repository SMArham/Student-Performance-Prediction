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
        await window.authClient.signUp(email, password, {
          full_name: fullName,
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
});
