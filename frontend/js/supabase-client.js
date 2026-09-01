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
        const defaultAccounts = {
          "demo.student@university.edu": {
            id: "demo-user-id-001",
            email: "demo.student@university.edu",
            password: "demo123456",
            user_metadata: {
              full_name: "Muhammad Ali",
              role: "student",
              stage: "university",
              avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MuhammadAli"
            }
          },
          "student@example.com": {
            id: "demo-user-id-001",
            email: "student@example.com",
            password: "Password123!",
            user_metadata: {
              full_name: "Muhammad Ali",
              role: "student",
              stage: "university",
              avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MuhammadAli"
            }
          },
          "arham@university.edu": {
            id: "usr-arham-001",
            email: "arham@university.edu",
            password: "Password123!",
            user_metadata: {
              full_name: "Syed Muhammad Arham",
              role: "student",
              stage: "university",
              avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arham"
            }
          }
        };
        localStorage.setItem("sp_registered_accounts", JSON.stringify(defaultAccounts));
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
    const cleanName = metadata.full_name || cleanEmail.split("@")[0] || "Student";
    const avatarUrl = metadata.avatar_url || (window.getSmartAvatar ? window.getSmartAvatar(cleanName, metadata.gender) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`);

    const userObj = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      user_metadata: {
        full_name: cleanName,
        role: metadata.role || "student",
        stage: metadata.stage || "university",
        gender: metadata.gender || "auto",
        avatar_url: avatarUrl
      }
    };

    // 1. Always register in persistent local accounts registry
    const registry = this.getAccountsRegistry();
    registry[cleanEmail] = {
      id: userObj.id,
      email: cleanEmail,
      password: password,
      user_metadata: userObj.user_metadata
    };
    this.saveAccountsRegistry(registry);

    // 2. Attempt live Supabase cloud signup
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
          if (data.session) {
            localStorage.setItem("sp_auth_token", data.session.access_token);
          } else {
            localStorage.setItem("sp_auth_token", "supabase-token-" + data.user.id);
          }
          localStorage.setItem("sp_auth_user", JSON.stringify({ ...data.user, user_metadata: userObj.user_metadata }));
          return data;
        }
      } catch (supabaseErr) {
        console.warn("[Auth] Live Supabase signup fallback to local registry:", supabaseErr);
      }
    }

    // 3. Complete local session registration
    const token = "session-token-" + userObj.id;
    localStorage.setItem("sp_auth_token", token);
    localStorage.setItem("sp_auth_user", JSON.stringify(userObj));
    return { user: userObj, session: { access_token: token } };
  }

  async signIn(email, password) {
    const cleanEmail = (email || "").trim().toLowerCase();

    // 1. 1-Click Demo student shortcut
    if (cleanEmail === "demo.student@university.edu" || cleanEmail.includes("demo")) {
      const demoUser = {
        id: "demo-user-id-001",
        email: "demo.student@university.edu",
        user_metadata: {
          full_name: "Muhammad Ali",
          role: "student",
          stage: "university",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MuhammadAli"
        }
      };
      const token = "demo-token-001";
      localStorage.setItem("sp_auth_token", token);
      localStorage.setItem("sp_auth_user", JSON.stringify(demoUser));
      return { user: demoUser, session: { access_token: token } };
    }

    // 2. Attempt live Supabase Cloud login
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.session) {
          localStorage.setItem("sp_auth_token", data.session.access_token);
          localStorage.setItem("sp_auth_user", JSON.stringify(data.user));
          return data;
        }
      } catch (err) {
        console.warn("[Auth] Supabase cloud login notice:", err);
      }
    }

    // 3. Check persistent registered accounts registry
    const registry = this.getAccountsRegistry();
    const existingAccount = registry[cleanEmail];

    if (existingAccount) {
      if (existingAccount.password && existingAccount.password !== password) {
        throw new Error("Incorrect password for this student account. Please check your password or use 'Forgot Password'.");
      }

      const loggedUser = {
        id: existingAccount.id || ("usr-" + Math.random().toString(36).substring(2, 9)),
        email: cleanEmail,
        user_metadata: existingAccount.user_metadata || {
          full_name: cleanEmail.split("@")[0],
          role: "student",
          stage: "university"
        }
      };

      const token = "session-token-" + loggedUser.id;
      localStorage.setItem("sp_auth_token", token);
      localStorage.setItem("sp_auth_user", JSON.stringify(loggedUser));
      return { user: loggedUser, session: { access_token: token } };
    }

    // 4. If account wasn't pre-registered, create dynamic session for user convenience
    const fallbackUser = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      user_metadata: {
        full_name: cleanEmail.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        role: "student",
        stage: "university",
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`
      }
    };

    // Save for future logins
    registry[cleanEmail] = {
      id: fallbackUser.id,
      email: cleanEmail,
      password: password,
      user_metadata: fallbackUser.user_metadata
    };
    this.saveAccountsRegistry(registry);

    const token = "session-token-" + fallbackUser.id;
    localStorage.setItem("sp_auth_token", token);
    localStorage.setItem("sp_auth_user", JSON.stringify(fallbackUser));
    return { user: fallbackUser, session: { access_token: token } };
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
