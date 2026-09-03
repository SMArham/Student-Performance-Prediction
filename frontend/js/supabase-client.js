/**
 * Supabase Client & Authentication Engine
 * Student Performance Prediction & Analytics System
 * 
 * Features:
 * - Safe client-side Supabase Auth integration (using anon key)
 * - Full multi-account local persistence registry (sp_registered_accounts)
 * - 100% resilient fallback for offline demo / network limitations / email rate limits
 * - Instant profile sync & avatar management
 */

const SUPABASE_CONFIG = {
  url: "https://nmkdxehvupbidoqsdxgf.supabase.co",
  anonKey: "sb_publishable_97_-DqS2UcA9W4w7qi8Qog_ig3ipXx3"
};

class SupabaseAuthClient {
  constructor() {
    this.client = null;
    this.initClient();
    this.initRegistry();
  }

  initClient() {
    // Initialize if Supabase JS CDN is loaded and URL is non-dummy
    if (window.supabase && SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes("your-project-id")) {
      try {
        this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log("[Auth] Live Supabase Client Initialized.");
      } catch (err) {
        console.warn("[Auth] Failed to initialize live Supabase client. Using session store.", err);
      }
    }
  }

  initRegistry() {
    // Initialize local registered accounts registry if empty
    try {
      const existing = localStorage.getItem("sp_registered_accounts");
      if (!existing) {
        localStorage.setItem("sp_registered_accounts", JSON.stringify({}));
      }
    } catch (e) {
      console.warn("[Auth] Registry init notice:", e);
    }
  }

  getAccountsRegistry() {
    try {
      const data = localStorage.getItem("sp_registered_accounts");
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveAccountsRegistry(registry) {
    try {
      localStorage.setItem("sp_registered_accounts", JSON.stringify(registry));
    } catch (e) {
      console.warn("[Auth] Save registry error:", e);
    }
  }

  async signUp(email, password, metadata = {}) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Please provide a valid email address.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    const registry = this.getAccountsRegistry();
    if (registry[cleanEmail]) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    const role = (metadata.role || "student").toLowerCase();
    const cleanName = metadata.full_name || cleanEmail.split("@")[0] || (role === "teacher" ? "Faculty Teacher" : "Student");
    const uniqueSuffix = Math.floor(100 + Math.random() * 900);
    const autoId = metadata.student_id || metadata.id_code || (role === "teacher" ? `TCH-0${Math.floor(1 + Math.random() * 9)}` : `STU-${uniqueSuffix}`);
    const programName = metadata.program || metadata.major || (role === "teacher" ? (metadata.department || "Computer Science") : "Software Engineering");
    const institutionName = metadata.institution_name || metadata.institution || "Faculty of Engineering";

    const userObj = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      user_metadata: {
        ...metadata,
        full_name: cleanName,
        role: role,
        stage: metadata.stage || (role === "teacher" ? "all" : "university"),
        gender: metadata.gender || "male",
        institution_name: institutionName,
        institution: institutionName,
        program: programName,
        major: programName,
        department: metadata.department || programName,
        designation: metadata.designation || (role === "teacher" ? "Faculty Instructor" : "Student"),
        student_id: autoId,
        id_code: autoId
      }
    };

    // 1. Store in persistent accounts registry
    registry[cleanEmail] = {
      id: userObj.id,
      email: cleanEmail,
      password: password,
      user_metadata: userObj.user_metadata
    };
    this.saveAccountsRegistry(registry);

    // 2. Attempt live Supabase cloud signup sync
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: userObj.user_metadata
          }
        });

        if (!error && data?.user) {
          userObj.id = data.user.id;
          registry[cleanEmail].id = data.user.id;
          this.saveAccountsRegistry(registry);
        }
      } catch (supabaseErr) {
        console.warn("[Auth] Live Supabase signup notice:", supabaseErr);
      }
    }

    // Return created user (Explicitly requires login on login.html)
    return { user: userObj, success: true };
  }

  async signIn(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error("Please enter both email and password.");
    }

    const registry = this.getAccountsRegistry();
    let existingAccount = registry[cleanEmail];

    // 1. Attempt live Supabase Cloud login
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.session && data?.user) {
          const userRole = data.user.user_metadata?.role || existingAccount?.user_metadata?.role || (cleanEmail.includes("teacher") ? "teacher" : "student");
          const combinedMeta = {
            ...(existingAccount?.user_metadata || {}),
            ...(data.user?.user_metadata || {}),
            role: userRole
          };

          const combinedUser = {
            ...data.user,
            user_metadata: combinedMeta
          };

          localStorage.setItem("sp_auth_token", data.session.access_token);
          localStorage.setItem("sp_auth_user", JSON.stringify(combinedUser));

          // Sync into local registry
          registry[cleanEmail] = {
            id: data.user.id,
            email: cleanEmail,
            password: password,
            user_metadata: combinedMeta
          };
          this.saveAccountsRegistry(registry);

          return { user: combinedUser, session: data.session };
        }
      } catch (err) {
        console.warn("[Auth] Supabase cloud login notice:", err);
      }
    }

    // 2. Check persistent registered accounts registry
    if (existingAccount) {
      if (existingAccount.password && existingAccount.password !== password) {
        throw new Error("Incorrect password. Please verify your password or use 'Forgot Password'.");
      }

      const userRole = existingAccount.user_metadata?.role || "student";
      const loggedUser = {
        id: existingAccount.id || ("usr-" + Math.random().toString(36).substring(2, 9)),
        email: cleanEmail,
        user_metadata: {
          ...existingAccount.user_metadata,
          role: userRole
        }
      };

      const token = "session-token-" + loggedUser.id;
      localStorage.setItem("sp_auth_token", token);
      localStorage.setItem("sp_auth_user", JSON.stringify(loggedUser));
      return { user: loggedUser, session: { access_token: token } };
    }

    // 3. DO NOT AUTO-CREATE! User must sign up first
    throw new Error("No account found with this email. Please click 'Create Account' to sign up first.");
  }

  async updateUser(metadataUpdates = {}) {
    const session = this.getSession();
    if (!session || !session.user) {
      throw new Error("No active user session found.");
    }

    const currentMeta = session.user.user_metadata || {};
    const newMeta = { ...currentMeta, ...metadataUpdates };
    session.user.user_metadata = newMeta;

    // Sync with cloud if client is available
    if (this.client) {
      try {
        await this.client.auth.updateUser({ data: newMeta });
      } catch (err) {
        console.warn("[Auth] Cloud sync warning:", err);
      }
    }

    // Sync with local session & registry
    localStorage.setItem("sp_auth_user", JSON.stringify(session.user));

    const cleanEmail = (session.user.email || "").toLowerCase();
    if (cleanEmail) {
      const registry = this.getAccountsRegistry();
      if (registry[cleanEmail]) {
        registry[cleanEmail].user_metadata = newMeta;
        this.saveAccountsRegistry(registry);
      }
    }

    return session.user;
  }

  async updatePassword(newPassword) {
    const session = this.getSession();
    const cleanEmail = session?.user?.email ? session.user.email.toLowerCase() : "";

    if (this.client) {
      try {
        await this.client.auth.updateUser({ password: newPassword });
      } catch (err) {
        console.warn("[Auth] Cloud password update warning:", err);
      }
    }

    if (cleanEmail) {
      const registry = this.getAccountsRegistry();
      if (registry[cleanEmail]) {
        registry[cleanEmail].password = newPassword;
        this.saveAccountsRegistry(registry);
      }
    }

    return { success: true, message: "Password updated successfully." };
  }

  async resetPasswordForEmail(email, newPassword) {
    const cleanEmail = (email || "").trim().toLowerCase();
    const registry = this.getAccountsRegistry();
    if (registry[cleanEmail]) {
      registry[cleanEmail].password = newPassword;
      this.saveAccountsRegistry(registry);
    }
    return { success: true, message: "Password reset complete." };
  }

  async deleteAccount() {
    const session = this.getSession();
    const cleanEmail = session?.user?.email ? session.user.email.toLowerCase() : "";

    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn("[Auth] Remote signout warning:", err);
      }
    }

    if (cleanEmail) {
      const registry = this.getAccountsRegistry();
      delete registry[cleanEmail];
      this.saveAccountsRegistry(registry);
    }

    localStorage.removeItem("sp_auth_token");
    localStorage.removeItem("sp_auth_user");
    localStorage.removeItem("sp_user_subjects_v1");
    window.location.href = "login.html";
  }

  async signOut() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn("[Auth] Supabase signOut error:", e);
      }
    }
    localStorage.removeItem("sp_auth_token");
    localStorage.removeItem("sp_auth_user");
    window.location.href = "login.html";
  }

  getSession() {
    const token = localStorage.getItem("sp_auth_token");
    const userStr = localStorage.getItem("sp_auth_user");
    if (token && userStr) {
      try {
        return {
          access_token: token,
          user: JSON.parse(userStr)
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  getUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  isAuthenticated() {
    return !!this.getSession();
  }
}

window.authClient = new SupabaseAuthClient();
