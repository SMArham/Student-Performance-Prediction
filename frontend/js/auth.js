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
});
