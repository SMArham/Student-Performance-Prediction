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
  // Academic Terms & Historical Semesters CRUD
  // --------------------------------------------------------------------------
  async getAcademicRecords(stage = "university") {
    return this.request(`/api/v1/academic-records?stage=${encodeURIComponent(stage)}`);
  }

  async createAcademicRecord(termPayload) {
    return this.request("/api/v1/academic-records", {
      method: "POST",
      body: JSON.stringify(termPayload)
    });
  }

  async deleteAcademicRecord(termName, stage = "university") {
    return this.request(`/api/v1/academic-records/${encodeURIComponent(termName)}?stage=${encodeURIComponent(stage)}`, {
      method: "DELETE"
    });
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
