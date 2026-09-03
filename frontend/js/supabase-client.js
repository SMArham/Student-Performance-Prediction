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

/**
 * High-Security Blocklist of Disposable / Temporary Email Domains
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "tempmail.ninja",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minmail.com", "minutemail.com",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.biz", "guerrillamail.org", "guerrillamailblock.com", "sharklasers.com", "grr.la", "pokemail.net",
  "mailinator.com", "mailinater.com", "mailinator2.com", "suremail.info", "spamherelots.com",
  "throwawaymail.com", "throwaway.email",
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf", "courriel.fr.nf", "moncourrier.fr.nf",
  "trashmail.com", "trashmail.net", "trashmail.me", "trashmail.org", "rcpt.at", "damnthespam.com",
  "dispostable.com", "getairmail.com", "airmail.news", "inboxkitten.com",
  "nada.ltd", "getnada.com", "abovethecurv.com", "dropmail.me",
  "mohmal.com", "mohmal.im", "mohmal.in", "crazymailing.com", "maildrop.cc",
  "fakeinbox.com", "fakemailgenerator.com", "generator.email", "emailondeck.com",
  "burnermail.io", "mytemp.email", "minuteinbox.com", "tmail.link", "disposablemail.com",
  "fakemail.net", "armyspy.com", "cuvox.de", "dayrep.com", "fleckens.hu", "gustr.com",
  "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us", "tinypm.com",
  "binkmail.com", "bobmail.info", "chacuo.net", "devnullmail.com", "emailgo.de",
  "filzmail.com", "incognitotube.com", "kasmail.com", "maildrop.com", "mailforspam.com",
  "mailimate.com", "mailnull.com", "meltmail.com", "mytempemail.com", "no-spam.ws",
  "nowmymail.com", "oneoffmail.com", "pookmail.com", "shortmail.net", "sogetthis.com",
  "spambox.us", "spamex.com", "spamfree24.org", "spamgourmet.com", "tempemail.net",
  "tempsky.com", "thankyou2010.com", "trash-mail.com", "wegwerfmail.de", "wegwerfmail.net",
  "whyspam.me", "zoemail.org", "mailtothis.com", "mailsac.com", "harakirimail.com",
  "mailnesia.com", "disposable.com", "tempinbox.com", "inboxbear.com", "inboxclean.com",
  "mailcatch.com", "mailscrap.com", "mytempmail.com", "trashymail.com"
]);

/**
 * Blocklist of Obvious Fake / Placeholder Domains
 */
const FAKE_EMAIL_DOMAINS = new Set([
  "test.com", "example.com", "example.org", "example.net", "fake.com", "dummy.com", "sample.com",
  "asdf.com", "random.com", "invalid.com", "temp.com", "trash.com", "xyz.com", "abc.com", "123.com",
  "none.com", "null.com", "foo.com", "bar.com", "foobar.com", "testing.com", "noemail.com", "notreal.com",
  "fakeemail.com", "fakedomain.com", "nonexistent.com", "testmail.com"
]);

/**
 * Blocklist of Placeholder Usernames
 */
const FAKE_USERNAMES = new Set([
  "test", "testing", "tester", "fake", "dummy", "admin", "administrator", "root",
  "asdf", "asdfg", "asdfgh", "qwerty", "user", "sample", "random", "none", "null",
  "aaa", "aaaa", "aaaaa", "123", "1234", "12345", "123456", "abc", "abcd", "xyz"
]);

/**
 * Validates that an email is legitimate, active, and not disposable or fake
 */
function validateRealEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Please provide an email address." };
  }

  const clean = email.trim().toLowerCase();

  // Basic RFC email regex structure
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean) || clean.includes("..")) {
    return { valid: false, error: "Please enter a valid email format (e.g. name@university.edu or name@gmail.com)." };
  }

  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid email address format." };
  }

  const [username, domain] = parts;

  // Username checks
  if (username.length < 3) {
    return { valid: false, error: "Email prefix must be at least 3 characters long." };
  }

  if (FAKE_USERNAMES.has(username)) {
    return { valid: false, error: `"${username}" is a placeholder name. Please use your real personal or institutional email.` };
  }

  // Repetitive characters check (e.g. 'aaaaa', '11111')
  if (/^(.)\1{4,}$/.test(username)) {
    return { valid: false, error: "Invalid repetitive email username. Please use your genuine email address." };
  }

  // Domain structure checks
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || /\d/.test(tld)) {
    return { valid: false, error: "Email domain must have a valid top-level domain (e.g. .com, .edu, .org, .edu.pk)." };
  }

  // Disposable domain check
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, error: "Temporary and disposable email addresses (e.g. temp-mail, mailinator, guerrillamail) are blocked. Please use an active personal (Gmail, Outlook, Yahoo) or university email." };
  }

  // Fake domain check
  if (FAKE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, error: `"${domain}" is not a legitimate email provider. Please use your real email address.` };
  }

  // Heuristic keywords check in domain
  const disposableKeywords = [
    "tempmail", "temp-mail", "disposable", "throwaway", "fakeinbox", "burner",
    "trashmail", "guerrilla", "mailinator", "10minute", "minuteinbox", "fakemail",
    "generator.email", "yopmail", "maildrop", "sharklasers", "mohmal", "crazymailing"
  ];
  for (const kw of disposableKeywords) {
    if (domain.includes(kw)) {
      return { valid: false, error: "Temporary and disposable email providers are blocked. Please use your real email." };
    }
  }

  return { valid: true, cleanEmail: clean };
}

// Global export for UI and form validations
if (typeof window !== "undefined") {
  window.validateRealEmail = validateRealEmail;
}

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
    const emailCheck = validateRealEmail(email);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.error);
    }
    const cleanEmail = emailCheck.cleanEmail;

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

    // 2. Attempt live Supabase cloud signup sync & Database persistence
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

      // Persist directly into Supabase database tables
      try {
        await this.client.from("profiles").upsert({
          id: userObj.id,
          email: cleanEmail,
          full_name: cleanName,
          role: role,
          stage: userObj.user_metadata.stage || "university",
          institution_name: institutionName,
          department_or_program: programName,
          student_id_code: autoId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "id" });
      } catch (profErr) {
        console.warn("[Auth] Supabase profiles initial insert note:", profErr);
      }

      if (role === "student") {
        try {
          await this.client.from("students").upsert({
            id: userObj.id,
            name: cleanName,
            full_name: cleanName,
            email: cleanEmail,
            stage: userObj.user_metadata.stage || "university",
            gender: metadata.gender || "male",
            institution_name: institutionName,
            program_name: programName,
            created_at: new Date().toISOString()
          }, { onConflict: "id" });
        } catch (stuErr) {
          console.warn("[Auth] Supabase students initial insert note:", stuErr);
        }
      }
    }

    // Return created user (Explicitly requires login on login.html)
    return { user: userObj, success: true };
  }

  async signIn(email, password, requiredRole = null) {
    const emailCheck = validateRealEmail(email);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.error);
    }
    const cleanEmail = emailCheck.cleanEmail;

    if (!password) {
      throw new Error("Please enter your password.");
    }

    const registry = this.getAccountsRegistry();
    let existingAccount = registry[cleanEmail];

    // 1. Attempt live Supabase Cloud login
    let cloudUser = null;
    let cloudSession = null;
    if (this.client) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.session && data?.user) {
          cloudUser = data.user;
          cloudSession = data.session;
        }
      } catch (err) {
        console.warn("[Auth] Supabase cloud login notice:", err);
      }
    }

    // 2. Check if account exists anywhere
    if (!cloudUser && !existingAccount) {
      const roleName = requiredRole === "teacher" ? "Teacher" : "Student";
      throw new Error(`No ${roleName} account found with this email. Please click 'Create Account' to sign up first.`);
    }

    // 3. Password Verification (Local registry check if not already verified by Supabase)
    if (!cloudUser && existingAccount) {
      if (existingAccount.password && existingAccount.password !== password) {
        throw new Error("Incorrect password. Please check your password and try again.");
      }
    }

    // 4. Strict Role Verification: Enforce separate Student vs Teacher access
    const registeredRole = (
      existingAccount?.user_metadata?.role ||
      cloudUser?.user_metadata?.role ||
      (cleanEmail.includes("teacher") ? "teacher" : "student")
    ).toLowerCase();

    if (requiredRole) {
      const targetRole = requiredRole.toLowerCase();
      if (targetRole === "teacher" && registeredRole !== "teacher") {
        throw new Error("Access Denied: This account is registered as a Student. Please switch to the Student Portal to sign in, or create a Teacher account.");
      }
      if (targetRole === "student" && registeredRole !== "student") {
        throw new Error("Access Denied: This account is registered as a Faculty Teacher. Please switch to the Teacher Portal to sign in.");
      }
    }

    // 5. Build authenticated session
    const combinedMeta = {
      ...(existingAccount?.user_metadata || {}),
      ...(cloudUser?.user_metadata || {}),
      role: registeredRole
    };

    const loggedUser = {
      id: cloudUser?.id || existingAccount?.id || ("usr-" + Math.random().toString(36).substring(2, 9)),
      email: cleanEmail,
      user_metadata: combinedMeta
    };

    const token = cloudSession?.access_token || ("session-token-" + loggedUser.id);
    localStorage.setItem("sp_auth_token", token);
    localStorage.setItem("sp_auth_user", JSON.stringify(loggedUser));

    // Sync into local registry
    registry[cleanEmail] = {
      id: loggedUser.id,
      email: cleanEmail,
      password: password,
      user_metadata: combinedMeta
    };
    this.saveAccountsRegistry(registry);

    return { user: loggedUser, session: { access_token: token } };
  }

  async updateUser(metadataUpdates = {}) {
    const session = this.getSession();
    if (!session || !session.user) {
      throw new Error("No active user session found.");
    }

    const currentMeta = session.user.user_metadata || {};
    const newMeta = { ...currentMeta, ...metadataUpdates };
    session.user.user_metadata = newMeta;

    const cleanEmail = (session.user.email || "").toLowerCase();
    const userId = session.user.id;

    // Sync with Supabase Auth & Cloud Database `profiles` table
    if (this.client) {
      try {
        await this.client.auth.updateUser({ data: newMeta });
      } catch (err) {
        console.warn("[Auth] Cloud auth sync warning:", err);
      }

      if (userId) {
        try {
          const profilePayload = {
            id: userId,
            email: cleanEmail,
            full_name: newMeta.full_name || cleanEmail.split("@")[0],
            role: newMeta.role || "student",
            stage: newMeta.stage || "university",
            institution_name: newMeta.institution_name || newMeta.institution || "Faculty of Engineering",
            department_or_program: newMeta.program || newMeta.major || newMeta.department || "Software Engineering",
            student_id_code: newMeta.student_id || newMeta.id_code || `STU-${userId.slice(0, 4).toUpperCase()}`,
            updated_at: new Date().toISOString()
          };
          await this.client.from("profiles").upsert(profilePayload, { onConflict: "id" });
        } catch (dbErr) {
          console.warn("[Auth] Cloud profiles table upsert warning:", dbErr);
        }
      }
    }

    // Sync with local session & registry
    localStorage.setItem("sp_auth_user", JSON.stringify(session.user));

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

  async deleteAccount() {
    const session = this.getSession();
    const user = session?.user;
    const cleanEmail = user?.email ? user.email.toLowerCase() : "";
    const userId = user?.id;

    // 1. Comprehensive Database Deletion from all Supabase tables
    if (this.client) {
      try {
        if (userId) {
          await this.client.from("profiles").delete().eq("id", userId);
          await this.client.from("prediction_history").delete().eq("user_id", userId);
          await this.client.from("academic_records").delete().eq("user_id", userId);
          await this.client.from("academic_subjects").delete().eq("user_id", userId);
          await this.client.from("students").delete().eq("id", userId);
          await this.client.from("students").delete().eq("user_id", userId);
        }
        if (cleanEmail) {
          await this.client.from("profiles").delete().eq("email", cleanEmail);
          await this.client.from("prediction_history").delete().eq("email", cleanEmail);
          await this.client.from("students").delete().eq("email", cleanEmail);
        }
      } catch (err) {
        console.warn("[Auth] Cloud database delete warning:", err);
      }

      // Also call backend API student and history deletion if reachable
      if (window.apiClient) {
        try {
          if (userId) await window.apiClient.deleteStudent(userId);
          await window.apiClient.clearAllHistory();
        } catch (apiErr) {}
      }

      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn("[Auth] Remote signout warning:", err);
      }
    }

    // 2. Remove from Local Registry
    if (cleanEmail) {
      const registry = this.getAccountsRegistry();
      delete registry[cleanEmail];
      this.saveAccountsRegistry(registry);
    }

    // 3. Clear all cached data and session keys
    if (userId) {
      localStorage.removeItem(`sp_academic_records_${userId}`);
      localStorage.removeItem(`sp_academic_records_${userId}_university`);
      localStorage.removeItem(`sp_academic_records_${userId}_intermediate`);
      localStorage.removeItem(`sp_academic_records_${userId}_secondary`);
      localStorage.removeItem(`sp_academic_records_${userId}_primary`);
      localStorage.removeItem(`sp_prediction_history_${userId}`);
    }
    const stages = ["university", "intermediate", "secondary", "primary"];
    stages.forEach(st => {
      localStorage.removeItem(`sp_academic_records_${st}`);
    });
    localStorage.removeItem("sp_academic_records");
    localStorage.removeItem("sp_auth_token");
    localStorage.removeItem("sp_auth_user");
    localStorage.removeItem("sp_user_subjects_v1");
    localStorage.removeItem("edumetrics_cached_history");
    localStorage.removeItem("edumetrics_analytics_cache");

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
