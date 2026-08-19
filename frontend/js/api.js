/**
 * REST API Client for FastAPI Backend
 * Student Performance Prediction & Analytics System
 */

const API_BASE_URL = window.location.origin.includes("http") ? "" : "http://127.0.0.1:8005";

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
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  async getHealth() {
    return this.request("/health");
  }

  async getDashboardSummary(stage = "university") {
    return this.request(`/api/v1/dashboard/summary?stage=${encodeURIComponent(stage)}`);
  }

  async runPrediction(stage, features) {
    return this.request(`/api/v1/predictions/${encodeURIComponent(stage)}`, {
      method: "POST",
      body: JSON.stringify(features)
    });
  }

  async getHistory(limit = 10) {
    return this.request(`/api/v1/history?limit=${limit}`);
  }

  async getModels() {
    return this.request("/api/v1/models");
  }
}

window.apiClient = new APIClient();
