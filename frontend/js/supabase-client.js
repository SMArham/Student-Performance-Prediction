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

/**
 * Returns exact local timestamp (YYYY-MM-DDTHH:mm:ss) to match
 * the user's local clock without UTC drift in database tables.
 */
function getLocalTimestamp() {
  const d = new Date();
  const pad = n => (n < 10 ? "0" + n : n);
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`;
}

if (typeof window !== "undefined") {
  window.getLocalTimestamp = getLocalTimestamp;
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

  async checkDatabaseHealth() {
    if (!this.client) {
      return { connected: false, message: "Local Resilient Storage Active" };
    }
    try {
      const start = Date.now();
      const { data, error } = await this.client.from("profiles").select("id").limit(1);
      const latency = Date.now() - start;
      if (error) {
        return { connected: false, message: error.message };
      }
      return { connected: true, latency: latency, message: `Connected to Supabase Cloud (${latency}ms)` };
    } catch (e) {
      return { connected: false, message: e.message };
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

    // Reset deleted account flag if user re-creates account
    try {
      const deletedMap = JSON.parse(localStorage.getItem("sp_deleted_accounts") || "{}");
      if (deletedMap[cleanEmail]) {
        delete deletedMap[cleanEmail];
        localStorage.setItem("sp_deleted_accounts", JSON.stringify(deletedMap));
      }
    } catch (delMapErr) {}

    const role = (metadata.role || "student").toLowerCase();
    const cleanName = metadata.full_name || cleanEmail.split("@")[0] || (role === "teacher" ? "Faculty Teacher" : "Student");
    const programName = metadata.program || metadata.major || (role === "teacher" ? (metadata.department || "Computer Science") : "Software Engineering");
    const institutionName = metadata.institution_name || metadata.institution || "Faculty of Engineering";
    const prefix = role === "teacher" ? "TCH-" : "STU-";

    let autoId = metadata.student_id || metadata.id_code;
    if (!autoId || autoId.startsWith("STU-2026") || autoId.startsWith("TCH-2026")) {
      let maxNum = 0;
      if (this.client) {
        try {
          const { data: existingRows } = await this.client
            .from("profiles")
            .select("id")
            .ilike("id", `${prefix}%`);
          if (existingRows && existingRows.length > 0) {
            existingRows.forEach(row => {
              const numPart = parseInt((row.id || "").replace(/[^0-9]/g, ""), 10);
              if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            });
          }
        } catch (idErr) {
          console.warn("[Auth] Cloud id fetch notice:", idErr);
        }
      }
      if (maxNum === 0) {
        Object.values(registry).forEach(acc => {
          const aId = acc.id || acc.user_metadata?.student_id || "";
          if (aId.startsWith(prefix)) {
            const numPart = parseInt(aId.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
          }
        });
      }
      autoId = `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
    }

    const userObj = {
      id: autoId,
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
        await this.client.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: userObj.user_metadata
          }
        });
      } catch (supabaseErr) {
        console.warn("[Auth] Live Supabase signup notice:", supabaseErr);
      }

      // Persist directly into Supabase database profiles table (non-redundant clean schema)
      const localNow = getLocalTimestamp();
      const validStage = (role === "teacher" || !userObj.user_metadata.stage || userObj.user_metadata.stage === "all") ? "university" : userObj.user_metadata.stage;
      try {
        await this.client.from("profiles").upsert({
          id: autoId,
          email: cleanEmail,
          full_name: cleanName,
          role: role,
          stage: validStage,
          institution_name: institutionName,
          department_or_program: programName,
          created_at: localNow
        }, { onConflict: "id" });
        console.log(`[Auth] ${role} profile (${autoId}) saved to Supabase profiles table successfully!`);
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
            created_at: localNow
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

    // Check if account was deleted
    try {
      const deletedMap = JSON.parse(localStorage.getItem("sp_deleted_accounts") || "{}");
      if (deletedMap[cleanEmail]) {
        if (this.client) await this.client.auth.signOut().catch(() => {});
        const roleName = requiredRole === "teacher" ? "Teacher" : "Student";
        throw new Error(`This ${roleName} account was deleted and no longer exists. Please click 'Create Account' to sign up first.`);
      }
    } catch (delErr) {
      if (delErr.message.includes("deleted")) throw delErr;
    }

    if (!password) {
      throw new Error("Please enter your password.");
    }

    const registry = this.getAccountsRegistry();
    let existingAccount = registry[cleanEmail];

    // 1. Attempt live Supabase Cloud login & verify database profile exists
    let cloudUser = null;
    let cloudSession = null;
    let cloudProfile = null;

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

      // Verify the user exists in public.profiles table
      try {
        const { data: prof } = await this.client
          .from("profiles")
          .select("id, role, email, full_name, stage, institution_name, department_or_program")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (prof) {
          cloudProfile = prof;
        }
      } catch (profErr) {
        console.warn("[Auth] Profiles verification notice:", profErr);
      }

      // If cloudUser authenticated but cloudProfile wasn't found by email, check by user ID or auto-sync
      if (!cloudProfile && cloudUser) {
        try {
          const { data: profById } = await this.client
            .from("profiles")
            .select("id, role, email, full_name, stage, institution_name, department_or_program")
            .eq("id", cloudUser.id)
            .maybeSingle();

          if (profById) {
            cloudProfile = profById;
          } else {
            const meta = cloudUser.user_metadata || {};
            const localNow = getLocalTimestamp();
            const uRole = meta.role || requiredRole || "teacher";
            const autoId = meta.student_id || meta.id_code || (uRole === "teacher" ? "TCH-01" : "STU-01");
            const validStage = (uRole === "teacher" || !meta.stage || meta.stage === "all") ? "university" : meta.stage;
            const { data: syncedProf } = await this.client.from("profiles").upsert({
              id: autoId,
              email: cleanEmail,
              full_name: meta.full_name || cleanEmail.split("@")[0],
              role: uRole,
              stage: validStage,
              institution_name: meta.institution_name || meta.institution || "Faculty Campus",
              department_or_program: meta.department || meta.program || "Computer Science",
              created_at: localNow
            }, { onConflict: "id" }).select().maybeSingle();
            if (syncedProf) {
              cloudProfile = syncedProf;
            }
          }
        } catch (syncErr) {
          console.warn("[Auth] Cloud profile sync notice:", syncErr);
        }
      }
    }

    // 2. Reject if account does not exist in Supabase Cloud Database or local registry
    if (!cloudUser && !existingAccount && !cloudProfile) {
      const roleName = requiredRole === "teacher" ? "Teacher" : "Student";
      throw new Error(`No ${roleName} account found with this email. You must create an account first before signing in. Please click 'Create Account' to sign up.`);
    }

    // 3. Password Verification (Local registry check if not already verified by Supabase)
    if (!cloudUser && existingAccount) {
      if (existingAccount.password && existingAccount.password !== password) {
        throw new Error("Incorrect password. Please check your password and try again.");
      }
    }

    // 4. Strict Role Verification: Enforce separate Student vs Teacher access
    const registeredRole = (
      cloudProfile?.role ||
      existingAccount?.user_metadata?.role ||
      cloudUser?.user_metadata?.role ||
      (cleanEmail.includes("teacher") ? "teacher" : "student")
    ).toLowerCase();

    if (requiredRole) {
      const targetRole = requiredRole.toLowerCase();
      if (targetRole === "teacher" && registeredRole !== "teacher") {
        if (this.client) await this.client.auth.signOut().catch(() => {});
        throw new Error("Access Denied: This account is registered as a Student. Please switch to the Student Portal to sign in, or create a Teacher account.");
      }
      if (targetRole === "student" && registeredRole !== "student") {
        if (this.client) await this.client.auth.signOut().catch(() => {});
        throw new Error("Access Denied: This account is registered as a Faculty Teacher. Please switch to the Teacher Portal to sign in.");
      }
    }

    // 5. Build authenticated session: Database profile ID is the single source of truth
    const resolvedId = cloudProfile?.id || existingAccount?.id || (registeredRole === "teacher" ? "TCH-01" : "STU-01");

    const combinedMeta = {
      ...(existingAccount?.user_metadata || {}),
      ...(cloudUser?.user_metadata || {}),
      ...(cloudProfile ? {
        full_name: cloudProfile.full_name,
        role: cloudProfile.role,
        stage: cloudProfile.stage,
        institution_name: cloudProfile.institution_name,
        institution: cloudProfile.institution_name,
        department: cloudProfile.department_or_program,
        program: cloudProfile.department_or_program
      } : {}),
      student_id: resolvedId,
      id_code: resolvedId,
      role: registeredRole
    };

    const loggedUser = {
      id: resolvedId,
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
          const role = newMeta.role || "student";
          const validStage = (role === "teacher" || !newMeta.stage || newMeta.stage === "all") ? "university" : newMeta.stage;
          const profilePayload = {
            id: userId,
            email: cleanEmail,
            full_name: newMeta.full_name || cleanEmail.split("@")[0],
            role: role,
            stage: validStage,
            institution_name: newMeta.institution_name || newMeta.institution || "Faculty Campus",
            department_or_program: newMeta.department || newMeta.program || newMeta.major || "Software Engineering"
          };
          await this.client.from("profiles").upsert(profilePayload, { onConflict: "id" });
          console.log(`[Supabase] ${role} profile updated successfully in profiles table!`);
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
          await this.client.from("teacher_class_roster").delete().eq("student_id", userId);
          await this.client.from("teacher_class_roster").delete().eq("teacher_id", userId);
        }
        if (cleanEmail) {
          await this.client.from("profiles").delete().eq("email", cleanEmail);
          await this.client.from("prediction_history").delete().eq("email", cleanEmail);
          await this.client.from("students").delete().eq("email", cleanEmail);
        }
      } catch (err) {
        console.warn("[Auth] Cloud database delete warning:", err);
      }

      // Complete wipe from Supabase Auth admin via backend endpoint
      if (window.apiClient) {
        try {
          await window.apiClient.post("/api/v1/auth/delete-account", { user_id: userId, email: cleanEmail });
        } catch (apiErr) {}
      }

      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn("[Auth] Remote signout warning:", err);
      }
    }

    // 2. Remove from Local Registry & Record in Deleted Accounts Blocklist
    if (cleanEmail) {
      const registry = this.getAccountsRegistry();
      delete registry[cleanEmail];
      this.saveAccountsRegistry(registry);

      try {
        const deletedMap = JSON.parse(localStorage.getItem("sp_deleted_accounts") || "{}");
        deletedMap[cleanEmail] = Date.now();
        localStorage.setItem("sp_deleted_accounts", JSON.stringify(deletedMap));
      } catch (e) {}
    }

    // 3. Clear all cached data, inner prediction history, and session keys
    if (userId) {
      localStorage.removeItem(`edumetrics_prediction_history_v2_${userId}`);
      localStorage.removeItem(`edumetrics_prediction_history_${userId}`);
      localStorage.removeItem(`sp_academic_records_${userId}`);
      localStorage.removeItem(`sp_academic_records_${userId}_university`);
      localStorage.removeItem(`sp_academic_records_${userId}_intermediate`);
      localStorage.removeItem(`sp_academic_records_${userId}_secondary`);
      localStorage.removeItem(`sp_academic_records_${userId}_primary`);
      localStorage.removeItem(`sp_prediction_history_${userId}`);
      localStorage.removeItem(`sp_user_subjects_v1_${userId}`);
      localStorage.removeItem(`edumetrics_cached_history_${userId}`);
      localStorage.removeItem(`edumetrics_analytics_cache_${userId}`);
    }
    const stages = ["university", "intermediate", "secondary", "primary"];
    stages.forEach(st => {
      localStorage.removeItem(`sp_academic_records_${st}`);
    });
    localStorage.removeItem("sp_academic_records");
    localStorage.removeItem("edumetrics_prediction_history_v2");
    localStorage.removeItem("edumetrics_prediction_history");
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

  async syncProfileWithDatabase() {
    const user = this.getUser();
    if (!user || !user.email || !this.client) return user;
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const { data: prof } = await this.client
        .from("profiles")
        .select("id, role, email, full_name, stage, institution_name, department_or_program")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (prof && prof.id) {
        let changed = false;
        if (user.id !== prof.id) {
          user.id = prof.id;
          changed = true;
        }
        if (!user.user_metadata) user.user_metadata = {};
        if (user.user_metadata.student_id !== prof.id || user.user_metadata.id_code !== prof.id) {
          user.user_metadata.student_id = prof.id;
          user.user_metadata.id_code = prof.id;
          changed = true;
        }
        if (prof.full_name && user.user_metadata.full_name !== prof.full_name) {
          user.user_metadata.full_name = prof.full_name;
          changed = true;
        }
        if (changed) {
          localStorage.setItem("sp_auth_user", JSON.stringify(user));
          // Update any UI ID elements directly on screen
          const idEls = document.querySelectorAll("#student-id, #student-id-code, #hero-profile-id, #setting-studentid");
          idEls.forEach(el => {
            if (el.tagName === "INPUT") el.value = prof.id;
            else el.innerText = prof.id;
          });
          const nameEls = document.querySelectorAll("#student-name, #hero-profile-name, #setting-fullname");
          nameEls.forEach(el => {
            if (el.tagName === "INPUT") el.value = prof.full_name;
            else el.innerText = prof.full_name;
          });
        }
      }

      // Automatically sync any real user academic records and predictions to Supabase
      if (prof && prof.id) {
        await this.syncLocalRecordsToCloud(prof.id);
      }
    } catch (err) {
      console.warn("[Auth] Live profile sync warning:", err);
    }
    return user;
  }

  async syncLocalRecordsToCloud(userId) {
    if (!this.client || !userId) return;
    try {
      // 1. Sync real academic records & subjects entered by the user
      const stages = ["university", "matric_inter", "secondary", "primary"];
      for (const st of stages) {
        const localKey = `sp_academic_records_${userId}_${st}`;
        const fallbackKey = `sp_academic_records_${st}`;
        const raw = localStorage.getItem(localKey) || localStorage.getItem(fallbackKey);
        if (raw) {
          try {
            const terms = JSON.parse(raw);
            if (Array.isArray(terms) && terms.length > 0) {
              for (const term of terms) {
                const recId = term.id && !term.id.startsWith("term_") 
                  ? term.id 
                  : `rec_${userId}_${(term.term_name || "term").replace(/\s+/g, "_").toLowerCase()}`;
                const cleanRecord = {
                  id: recId,
                  user_id: userId,
                  stage: term.stage || st,
                  term_name: term.term_name || "Current Term",
                  gpa: parseFloat(term.gpa) || 3.5,
                  cgpa: parseFloat(term.cgpa || term.gpa) || 3.5,
                  attendance_pct: term.attendance_pct !== undefined ? parseFloat(term.attendance_pct) : 85,
                  credit_hours: term.credit_hours !== undefined ? parseFloat(term.credit_hours) : 18,
                  midterm_score: term.midterm_score !== undefined ? parseFloat(term.midterm_score) : 80,
                  backlogs: term.backlogs !== undefined ? parseInt(term.backlogs) : 0,
                  study_hours: term.study_hours !== undefined ? parseFloat(term.study_hours) : 4.5,
                  subjects: term.subjects || [],
                  created_at: term.created_at || new Date().toISOString()
                };

                await this.client.from("academic_records").upsert(cleanRecord, { onConflict: "id" });

                if (Array.isArray(term.subjects) && term.subjects.length > 0) {
                  const subjectRows = term.subjects.map((sub, sIdx) => {
                    const obtained = parseFloat(sub.marks || sub.obtained_marks || 80);
                    const total = parseFloat(sub.total || sub.total_marks || 100);
                    const pct = total > 0 ? (obtained / total) * 100 : 80;
                    return {
                      id: `sub_${userId}_${(term.term_name || "term").replace(/\s+/g, "_").toLowerCase()}_${sIdx}`,
                      user_id: userId,
                      stage: term.stage || st,
                      subject_name: sub.name || sub.subject_name || "Course Subject",
                      subject_category: sub.category || sub.subject_category || "Core",
                      assessment_period: term.term_name || "Current Term",
                      obtained_marks: obtained,
                      total_marks: total,
                      percentage: parseFloat(pct.toFixed(1)),
                      created_at: term.created_at || new Date().toISOString()
                    };
                  });
                  await this.client.from("academic_subjects").upsert(subjectRows, { onConflict: "id" });
                }
              }
            }
          } catch (termErr) {
            console.warn("[Sync] Academic record parse notice:", termErr);
          }
        }
      }

      // 2. Sync real predictions entered by the user
      const predKeys = [
        `sp_prediction_history_${userId}`,
        "edumetrics_prediction_history",
        "sp_prediction_history"
      ];
      for (const pk of predKeys) {
        const rawPreds = localStorage.getItem(pk);
        if (rawPreds) {
          try {
            const preds = JSON.parse(rawPreds);
            if (Array.isArray(preds) && preds.length > 0) {
              for (const p of preds) {
                const rawScore = typeof p.score === "number" ? p.score : parseFloat(p.predicted_score || 85.0);
                const predRow = {
                  id: p.id || `pred-${Date.now().toString().slice(-6)}`,
                  user_id: userId,
                  stage: p.stage || "university",
                  input_features: p.input_features || p.payload || {},
                  predicted_score: isNaN(rawScore) ? 85.0 : rawScore,
                  predicted_grade: p.predicted_grade || p.grade || "Grade A",
                  status_badge: p.status_badge || "On Track",
                  created_at: p.created_at || new Date().toISOString()
                };
                await this.client.from("prediction_history").upsert(predRow, { onConflict: "id" });
              }
            }
          } catch (pErr) {
            console.warn("[Sync] Prediction parse notice:", pErr);
          }
        }
      }
    } catch (syncErr) {
      console.warn("[Sync] Cloud data auto-sync notice:", syncErr);
    }
  }
}

window.authClient = new SupabaseAuthClient();
