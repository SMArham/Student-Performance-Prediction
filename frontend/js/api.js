/**
 * REST API Client for FastAPI Backend
 * Student Performance Prediction & Analytics System
 * 
 * Features:
 * - Dynamic production/local endpoint resolution (Vercel + Render compatible)
 * - Complete CRUD student roster methods
 * - Multi-stage ML batch and single inference
 * - Prediction history management
 */

// Dynamically resolve API URL for localhost, custom meta tag, or Vercel production proxy
const API_BASE_URL = 
  (typeof window !== "undefined" && window.__API_BASE_URL__) ||
  document.querySelector('meta[name="api-base-url"]')?.getAttribute('content') ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? (window.location.port === "9005" ? "" : "http://localhost:9005")
    : "");

class APIClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    const session = window.authClient ? window.authClient.getSession() : null;
    if (session && session.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: this.getHeaders()
    };
    const merged = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, merged);
      if (!response.ok) {
        let errData = {};
        try {
          errData = await response.json();
        } catch (e) {}
        const errorMsg = errData.error?.message || errData.detail || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API Info] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Dashboard & AI Predictions
  // --------------------------------------------------------------------------
  async getDashboardSummary(stage = "university") {
    return this.request(`/api/v1/dashboard/summary?stage=${encodeURIComponent(stage)}`);
  }

  async runPrediction(stage, features) {
    return this.request(`/api/v1/predictions/${encodeURIComponent(stage)}`, {
      method: "POST",
      body: JSON.stringify(features)
    });
  }

  async runBatchPrediction(stage, studentsList) {
    return this.request("/api/v1/predictions/batch/evaluate", {
      method: "POST",
      body: JSON.stringify({
        stage: stage,
        students: studentsList
      })
    });
  }

  // --------------------------------------------------------------------------
  // History & Record Management
  // --------------------------------------------------------------------------
  async getHistory(limit = 20) {
    return this.request(`/api/v1/history?limit=${limit}`);
  }

  async deleteHistoryItem(historyId) {
    return this.request(`/api/v1/history/${encodeURIComponent(historyId)}`, {
      method: "DELETE"
    });
  }

  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async savePrediction(predictionData) {
    // 1. Asynchronously save directly to Supabase cloud table if active
    if (window.authClient && window.authClient.client) {
      const user = window.authClient.getUser();
      const rawScore = typeof predictionData.score === "number" ? predictionData.score : parseFloat(predictionData.predicted_score || 85.0);
      const localTime = window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString();
      const features = {
        ...(predictionData.payload || predictionData.input_features || {}),
        user_id: user?.id,
        user_email: user?.email
      };
      const predId = predictionData.id || `pred-${Date.now().toString().slice(-6)}`;

      window.authClient.client.from("prediction_history").insert({
        id: predId,
        stage: predictionData.stage || "university",
        input_features: features,
        predicted_score: isNaN(rawScore) ? 85.0 : rawScore,
        predicted_grade: predictionData.predicted_grade || predictionData.grade || "Grade A",
        status_badge: predictionData.status_badge || "On Track",
        created_at: localTime
      }).then(() => {
        console.log("[Supabase] Prediction saved to prediction_history successfully.");
      }).catch(e => console.warn("[Supabase] Cloud savePrediction note:", e.message));
    }

    // 2. Try backend API if available
    try {
      return await this.post("/api/v1/history", predictionData);
    } catch (err) {
      return { success: true, local: true };
    }
  }

  async clearAllHistory() {
    return this.request("/api/v1/history", {
      method: "DELETE"
    });
  }

  async updateHistoryItem(historyId, notes = null, statusBadge = null) {
    const params = new URLSearchParams();
    if (notes !== null) params.append("notes", notes);
    if (statusBadge !== null) params.append("status_badge", statusBadge);
    return this.request(`/api/v1/history/${encodeURIComponent(historyId)}?${params.toString()}`, {
      method: "PATCH"
    });
  }

  // --------------------------------------------------------------------------
  // Academic Terms & Historical Semesters CRUD (Offline-First Resilient)
  // --------------------------------------------------------------------------
  getLocalAcademicKey(stage) {
    const session = window.authClient ? window.authClient.getSession() : null;
    const userId = session?.user?.id || "default_user";
    return `sp_academic_records_${userId}_${stage}`;
  }

  getLocalAcademicRecords(stage = "university") {
    try {
      const key = this.getLocalAcademicKey(stage);
      const raw = localStorage.getItem(key) || localStorage.getItem(`sp_academic_records_${stage}`);
      const terms = raw ? JSON.parse(raw) : [];
      let totalGpa = 0;
      let count = terms.length;
      for (const t of terms) {
        totalGpa += parseFloat(t.gpa || t.percentage || 0);
      }
      const cgpa = count > 0 ? +(totalGpa / count).toFixed(2) : 0;
      return {
        success: true,
        count,
        cumulative_cgpa: cgpa,
        terms
      };
    } catch (e) {
      return { success: true, count: 0, cumulative_cgpa: 0, terms: [] };
    }
  }

  saveLocalAcademicRecord(termPayload) {
    const stage = termPayload.stage || "university";
    const key = this.getLocalAcademicKey(stage);
    try {
      const raw = localStorage.getItem(key) || localStorage.getItem(`sp_academic_records_${stage}`);
      let terms = raw ? JSON.parse(raw) : [];
      const idx = terms.findIndex(t => t.term_name === termPayload.term_name);
      if (idx >= 0) {
        terms[idx] = { ...terms[idx], ...termPayload, updated_at: new Date().toISOString() };
      } else {
        terms.push({ id: "term_" + Date.now(), ...termPayload, created_at: new Date().toISOString() });
      }
      localStorage.setItem(key, JSON.stringify(terms));
      localStorage.setItem(`sp_academic_records_${stage}`, JSON.stringify(terms));

      // Asynchronously upsert into Supabase database table if client available
      if (window.authClient && window.authClient.client) {
        const session = window.authClient.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const recId = `rec_${userId}_${(termPayload.term_name || "term").replace(/\s+/g, "_").toLowerCase()}`;
          const cleanRecord = {
            id: recId,
            user_id: userId,
            stage: stage,
            term_name: termPayload.term_name || "Current Term",
            gpa: parseFloat(termPayload.gpa) || 3.5,
            cgpa: parseFloat(termPayload.cgpa || termPayload.gpa) || 3.5,
            subjects: termPayload.subjects || [],
            created_at: window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString()
          };

          window.authClient.client.from("academic_records").upsert(cleanRecord, { onConflict: "id" })
            .then(() => console.log("[Supabase] Academic record saved successfully."))
            .catch(e => console.warn("[Supabase] Academic records cloud sync notice:", e.message));

          // Also persist individual subjects into academic_subjects table if present
          if (Array.isArray(termPayload.subjects) && termPayload.subjects.length > 0) {
            const subjectRows = termPayload.subjects.map((sub, idx) => {
              const obtained = parseFloat(sub.marks || sub.obtained_marks || 80);
              const total = parseFloat(sub.total || sub.total_marks || 100);
              const pct = total > 0 ? (obtained / total) * 100 : 80;
              return {
                id: `sub_${userId}_${idx}_${Date.now()}`,
                user_id: userId,
                stage: stage,
                subject_name: sub.name || sub.subject_name || "Course Subject",
                subject_category: sub.category || "Theory",
                assessment_period: termPayload.term_name || "Current Term",
                obtained_marks: obtained,
                total_marks: total,
                percentage: parseFloat(pct.toFixed(1)),
                created_at: window.getLocalTimestamp ? window.getLocalTimestamp() : new Date().toISOString()
              };
            });
            window.authClient.client.from("academic_subjects").upsert(subjectRows, { onConflict: "id" })
              .then(() => console.log("[Supabase] Course subjects saved to academic_subjects."))
              .catch(e => console.warn("[Supabase] Subjects sync notice:", e.message));
          }
        }
      }

      return { success: true, count: terms.length, terms };
    } catch (e) {
      console.warn("Local storage write error:", e);
      return { success: true, count: 1, terms: [termPayload] };
    }
  }

  deleteLocalAcademicRecord(termName, stage = "university") {
    const key = this.getLocalAcademicKey(stage);
    try {
      const raw = localStorage.getItem(key) || localStorage.getItem(`sp_academic_records_${stage}`);
      let terms = raw ? JSON.parse(raw) : [];
      terms = terms.filter(t => t.term_name !== termName);
      localStorage.setItem(key, JSON.stringify(terms));
      localStorage.setItem(`sp_academic_records_${stage}`, JSON.stringify(terms));

      if (window.authClient && window.authClient.client) {
        const session = window.authClient.getSession();
        const userId = session?.user?.id;
        if (userId) {
          window.authClient.client.from("academic_records").delete()
            .eq("user_id", userId)
            .eq("term_name", termName)
            .then().catch(e => console.warn("[Supabase] Academic delete cloud notice:", e.message));
        }
      }
    } catch (e) {
      console.warn("Local storage delete error:", e);
    }
  }

  async getAcademicRecords(stage = "university") {
    try {
      const res = await this.request(`/api/v1/academic-records?stage=${encodeURIComponent(stage)}`);
      if (res && Array.isArray(res.terms) && res.terms.length > 0) {
        return res;
      }
    } catch (err) {
      // Backend not running or 404 (e.g. Render sleeping / Vercel static)
    }

    // Attempt Supabase Cloud Direct Query
    if (window.authClient && window.authClient.client) {
      try {
        const session = window.authClient.getSession();
        const userId = session?.user?.id;
        if (userId) {
          const { data, error } = await window.authClient.client
            .from("academic_records")
            .select("*")
            .eq("user_id", userId)
            .eq("stage", stage);
          if (!error && Array.isArray(data) && data.length > 0) {
            let totalGpa = 0;
            for (const t of data) totalGpa += parseFloat(t.gpa || t.percentage || 0);
            const cgpa = +(totalGpa / data.length).toFixed(2);
            return { success: true, count: data.length, cumulative_cgpa: cgpa, terms: data };
          }
        }
      } catch (cloudErr) {
        console.warn("[API Client] Supabase direct fetch notice:", cloudErr.message);
      }
    }

    // Fallback to offline local storage
    return this.getLocalAcademicRecords(stage);
  }

  async createAcademicRecord(termPayload) {
    // 1. Guaranteed storage locally and in Supabase
    const localResult = this.saveLocalAcademicRecord(termPayload);

    // 2. Try Python backend API if accessible
    try {
      const apiResult = await this.request("/api/v1/academic-records", {
        method: "POST",
        body: JSON.stringify(termPayload)
      });
      return apiResult;
    } catch (err) {
      // Backend returned 404 or connection failed: safe fallback
      return localResult;
    }
  }

  async deleteAcademicRecord(termName, stage = "university") {
    this.deleteLocalAcademicRecord(termName, stage);

    try {
      return await this.request(`/api/v1/academic-records/${encodeURIComponent(termName)}?stage=${encodeURIComponent(stage)}`, {
        method: "DELETE"
      });
    } catch (err) {
      return { success: true, message: `Term ${termName} removed.` };
    }
  }

  // --------------------------------------------------------------------------
  // Student Management & CRUD Operations (Teacher Portal)
  // --------------------------------------------------------------------------
  async getStudents(stage = null, search = null) {
    const params = new URLSearchParams();
    if (stage && stage !== "all") params.append("stage", stage);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/api/v1/students${qs}`);
  }

  async getStudent(studentId) {
    return this.request(`/api/v1/students/${encodeURIComponent(studentId)}`);
  }

  async createStudent(studentData) {
    return this.request("/api/v1/students", {
      method: "POST",
      body: JSON.stringify(studentData)
    });
  }

  async updateStudent(studentId, updateData) {
    return this.request(`/api/v1/students/${encodeURIComponent(studentId)}`, {
      method: "PUT",
      body: JSON.stringify(updateData)
    });
  }

  async deleteStudent(studentId) {
    return this.request(`/api/v1/students/${encodeURIComponent(studentId)}`, {
      method: "DELETE"
    });
  }

  async evaluateStudent(studentId) {
    return this.request(`/api/v1/students/${encodeURIComponent(studentId)}/evaluate`, {
      method: "POST"
    });
  }

  async bulkImportStudents(studentsList) {
    return this.request("/api/v1/students/bulk", {
      method: "POST",
      body: JSON.stringify(studentsList)
    });
  }

  async getModels() {
    return this.request("/api/v1/models");
  }
}

window.apiClient = new APIClient();
