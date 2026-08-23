/**
 * Page 2: Academic Records & Prediction Input Form Logic
 * Student Performance Prediction & Analytics System
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Supabase Session Auth Guard Check
  if (window.authClient && !window.authClient.isAuthenticated()) {
    console.warn("[Auth Guard] User not authenticated. Redirecting to login.html...");
    window.location.href = "login.html";
    return;
  }

  // Populate sidebar user profile
  const user = window.authClient ? window.authClient.getUser() : null;
  if (user) {
    const nameEl = document.getElementById("sidebar-user-name");
    const idEl = document.getElementById("sidebar-user-id");
    const avatarEl = document.getElementById("sidebar-user-avatar");
    if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email.split("@")[0];
    if (idEl) idEl.textContent = user.user_metadata?.student_id_code || user.id.slice(0, 10);
    if (avatarEl) avatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
  }

  // Logout button handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      window.authClient.signOut();
    });
  }

  // Sidebar toggle for mobile/responsive view
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Elements
  const stageSelect = document.getElementById("education-stage-select");
  const dynamicFieldsContainer = document.getElementById("dynamic-form-fields");
  const formSectionTitle = document.getElementById("form-section-title");
  const modelBadge = document.getElementById("model-algorithm-badge");
  const errorBanner = document.getElementById("error-banner");
  const predForm = document.getElementById("prediction-form");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = document.getElementById("btn-text");
  const resultCard = document.getElementById("result-card");

  // Show inline error helper
  function showError(msg) {
    if (!errorBanner) return;
    errorBanner.innerHTML = `⚠️ <strong>Validation / API Error:</strong> ${msg}`;
    errorBanner.style.display = "block";
    errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideError() {
    if (!errorBanner) return;
    errorBanner.style.display = "none";
    errorBanner.innerHTML = "";
  }

  // Stage configurations and fields
  const stageConfigs = {
    university: {
      title: "University Academic Profile Inputs",
      algorithm: "Gradient Boosting Regressor",
      render: () => `
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="field_Major">Academic Major</label>
            <select id="field_Major" class="form-select">
              <option value="Engineering" selected>Engineering</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Business">Business / Management</option>
              <option value="Medicine">Medicine / Health</option>
              <option value="Arts">Arts & Humanities</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Gender">Gender</label>
            <select id="field_Gender" class="form-select">
              <option value="Male" selected>Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Age">Age (Years)</label>
            <input type="number" min="16" max="60" id="field_Age" class="form-input" value="21" required>
            <span class="form-help">Valid range: 16 - 60</span>
          </div>
        </div>

        <div class="form-grid-3" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_Previous_CGPA">Previous CGPA (0.00 - 4.00)</label>
            <input type="number" step="0.01" min="0.0" max="4.0" id="field_Previous_CGPA" class="form-input" value="3.48" required>
            <span class="form-help">Valid range: 0.00 - 4.00</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Attendance_Pct">Class Attendance Rate (%)</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_Attendance_Pct" class="form-input" value="88.5" required>
            <span class="form-help">Valid range: 0.0 - 100.0%</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Study_Hours_Per_Day">Daily Study (Hours/Day)</label>
            <input type="number" step="0.1" min="0.0" max="16.0" id="field_Study_Hours_Per_Day" class="form-input" value="4.5" required>
            <span class="form-help">Valid range: 0.0 - 16.0 hrs</span>
          </div>
        </div>

        <div class="form-grid-2" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_Sleep_Hours">Average Sleep (Hours/Night)</label>
            <input type="number" step="0.1" min="2.0" max="14.0" id="field_Sleep_Hours" class="form-input" value="7.2" required>
            <span class="form-help">Valid range: 2.0 - 14.0 hrs</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Social_Hours_Week">Social / Leisure (Hours/Week)</label>
            <input type="number" min="0" max="50" id="field_Social_Hours_Week" class="form-input" value="8" required>
            <span class="form-help">Valid range: 0 - 50 hrs</span>
          </div>
        </div>
      `,
      getPayload: () => ({
        Major: document.getElementById("field_Major").value,
        Gender: document.getElementById("field_Gender").value,
        Age: parseInt(document.getElementById("field_Age").value, 10),
        Previous_CGPA: parseFloat(document.getElementById("field_Previous_CGPA").value),
        Attendance_Pct: parseFloat(document.getElementById("field_Attendance_Pct").value),
        Study_Hours_Per_Day: parseFloat(document.getElementById("field_Study_Hours_Per_Day").value),
        Sleep_Hours: parseFloat(document.getElementById("field_Sleep_Hours").value),
        Social_Hours_Week: parseInt(document.getElementById("field_Social_Hours_Week").value, 10),
      }),
      validate: (p) => {
        if (isNaN(p.Age) || p.Age < 16 || p.Age > 60) return "Age must be an integer between 16 and 60.";
        if (isNaN(p.Previous_CGPA) || p.Previous_CGPA < 0.0 || p.Previous_CGPA > 4.0) return "Previous CGPA must be between 0.00 and 4.00.";
        if (isNaN(p.Attendance_Pct) || p.Attendance_Pct < 0.0 || p.Attendance_Pct > 100.0) return "Attendance Percentage must be between 0% and 100%.";
        if (isNaN(p.Study_Hours_Per_Day) || p.Study_Hours_Per_Day < 0.0 || p.Study_Hours_Per_Day > 16.0) return "Daily Study Hours must be between 0 and 16.";
        if (isNaN(p.Sleep_Hours) || p.Sleep_Hours < 2.0 || p.Sleep_Hours > 14.0) return "Sleep Hours must be between 2 and 14.";
        if (isNaN(p.Social_Hours_Week) || p.Social_Hours_Week < 0 || p.Social_Hours_Week > 50) return "Social Hours must be between 0 and 50.";
        return null;
      }
    },

    matric_inter: {
      title: "Matric & Intermediate Performance Inputs",
      algorithm: "Ridge Regression Model",
      render: () => `
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="field_Subject_Group">Subject Group</label>
            <select id="field_Subject_Group" class="form-select">
              <option value="Science" selected>Pre-Engineering / Medical (Science)</option>
              <option value="Computer Science">ICS (Computer Science)</option>
              <option value="Arts">Humanities / General Arts</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Gender">Gender</label>
            <select id="field_Gender" class="form-select">
              <option value="Male" selected>Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_School_Type">School Type</label>
            <select id="field_School_Type" class="form-select">
              <option value="Private" selected>Private Institution</option>
              <option value="Public">Public / Government School</option>
            </select>
          </div>
        </div>

        <div class="form-grid-3" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_SSC_I_Marks">SSC-I (9th Grade Marks)</label>
            <input type="number" min="0" max="1100" id="field_SSC_I_Marks" class="form-input" value="650" required>
            <span class="form-help">Valid range: 0 - 1100</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_SSC_II_Marks">SSC-II (10th Grade Marks)</label>
            <input type="number" min="0" max="1100" id="field_SSC_II_Marks" class="form-input" value="680" required>
            <span class="form-help">Valid range: 0 - 1100</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_HSSC_I_Marks">HSSC-I (11th Grade Marks)</label>
            <input type="number" min="0" max="550" id="field_HSSC_I_Marks" class="form-input" value="420" required>
            <span class="form-help">Valid range: 0 - 550</span>
          </div>
        </div>

        <div class="form-grid-3" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_Attendance_Rate">Attendance Rate (%)</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_Attendance_Rate" class="form-input" value="85.0" required>
            <span class="form-help">Valid range: 0.0 - 100.0%</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Study_Hours">Daily Study (Hours)</label>
            <input type="number" step="0.1" min="0.0" max="16.0" id="field_Study_Hours" class="form-input" value="4.0" required>
            <span class="form-help">Valid range: 0 - 16 hrs</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Region">District / Region</label>
            <select id="field_Region" class="form-select">
              <option value="Mohmand" selected>Mohmand</option>
              <option value="Peshawar">Peshawar</option>
              <option value="Swat">Swat</option>
              <option value="Mardan">Mardan</option>
              <option value="Lahore">Lahore</option>
            </select>
          </div>
        </div>
      `,
      getPayload: () => ({
        Subject_Group: document.getElementById("field_Subject_Group").value,
        Gender: document.getElementById("field_Gender").value,
        School_Type: document.getElementById("field_School_Type").value,
        SSC_I_Marks: parseInt(document.getElementById("field_SSC_I_Marks").value, 10),
        SSC_II_Marks: parseInt(document.getElementById("field_SSC_II_Marks").value, 10),
        HSSC_I_Marks: parseInt(document.getElementById("field_HSSC_I_Marks").value, 10),
        Attendance_Rate: parseFloat(document.getElementById("field_Attendance_Rate").value),
        Study_Hours: parseFloat(document.getElementById("field_Study_Hours").value),
        Region: document.getElementById("field_Region").value,
        Previous_Failures: 0,
        Exam_Attempts: 1,
        Enrollment_Type: "Regular",
        Parent_Education_Level: "College",
        Parent_Income: "Medium",
        Extra_Tuition: "No",
        Co_Curricular_Activities: "Yes",
      }),
      validate: (p) => {
        if (isNaN(p.SSC_I_Marks) || p.SSC_I_Marks < 0 || p.SSC_I_Marks > 1100) return "SSC-I Marks must be between 0 and 1100.";
        if (isNaN(p.SSC_II_Marks) || p.SSC_II_Marks < 0 || p.SSC_II_Marks > 1100) return "SSC-II Marks must be between 0 and 1100.";
        if (isNaN(p.HSSC_I_Marks) || p.HSSC_I_Marks < 0 || p.HSSC_I_Marks > 550) return "HSSC-I Marks must be between 0 and 550.";
        if (isNaN(p.Attendance_Rate) || p.Attendance_Rate < 0.0 || p.Attendance_Rate > 100.0) return "Attendance Rate must be between 0% and 100%.";
        if (isNaN(p.Study_Hours) || p.Study_Hours < 0.0 || p.Study_Hours > 16.0) return "Study Hours must be between 0 and 16.";
        return null;
      }
    },

    secondary: {
      title: "Secondary School Performance Inputs",
      algorithm: "Gradient Boosting Regressor",
      render: () => `
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="field_G1">Period 1 Grade - G1 (0 - 20)</label>
            <input type="number" min="0" max="20" id="field_G1" class="form-input" value="14" required>
            <span class="form-help">Valid scale: 0 - 20</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_G2">Period 2 Grade - G2 (0 - 20)</label>
            <input type="number" min="0" max="20" id="field_G2" class="form-input" value="15" required>
            <span class="form-help">Valid scale: 0 - 20</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_studytime">Weekly Study Time Scale</label>
            <select id="field_studytime" class="form-select">
              <option value="1">1 (&lt; 2 hours/week)</option>
              <option value="2" selected>2 (2 to 5 hours/week)</option>
              <option value="3">3 (5 to 10 hours/week)</option>
              <option value="4">4 (&gt; 10 hours/week)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-3" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_absences">School Absences</label>
            <input type="number" min="0" max="93" id="field_absences" class="form-input" value="4" required>
            <span class="form-help">Valid range: 0 - 93 days</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_age">Age (Years)</label>
            <input type="number" min="14" max="22" id="field_age" class="form-input" value="16" required>
            <span class="form-help">Valid range: 14 - 22</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_sex">Gender</label>
            <select id="field_sex" class="form-select">
              <option value="F" selected>Female (F)</option>
              <option value="M">Male (M)</option>
            </select>
          </div>
        </div>
      `,
      getPayload: () => ({
        G1: parseInt(document.getElementById("field_G1").value, 10),
        G2: parseInt(document.getElementById("field_G2").value, 10),
        studytime: parseInt(document.getElementById("field_studytime").value, 10),
        absences: parseInt(document.getElementById("field_absences").value, 10),
        age: parseInt(document.getElementById("field_age").value, 10),
        sex: document.getElementById("field_sex").value,
        failures: 0,
        health: 4,
        Medu: 3,
        Fedu: 3,
        traveltime: 1,
        famrel: 4,
        freetime: 3,
        goout: 3,
        Dalc: 1,
        Walc: 1,
        school: "GP",
        address: "U",
        famsize: "GT3",
        Pstatus: "T",
        Mjob: "teacher",
        Fjob: "services",
        reason: "course",
        guardian: "mother",
        schoolsup: "no",
        famsup: "yes",
        paid: "no",
        activities: "yes",
        nursery: "yes",
        higher: "yes",
        internet: "yes",
        romantic: "no"
      }),
      validate: (p) => {
        if (isNaN(p.G1) || p.G1 < 0 || p.G1 > 20) return "G1 Grade must be between 0 and 20.";
        if (isNaN(p.G2) || p.G2 < 0 || p.G2 > 20) return "G2 Grade must be between 0 and 20.";
        if (isNaN(p.absences) || p.absences < 0 || p.absences > 93) return "Absences must be between 0 and 93.";
        if (isNaN(p.age) || p.age < 14 || p.age > 22) return "Age must be between 14 and 22.";
        return null;
      }
    },

    primary: {
      title: "Primary Education Assessment Inputs",
      algorithm: "Linear Regression Model",
      render: () => `
        <div class="form-grid-3">
          <div class="form-group">
            <label class="form-label" for="field_Enrolment_score">Math & Enrolment Index Score</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_Enrolment_score" class="form-input" value="78.5" required>
            <span class="form-help">Valid scale: 0.0 - 100.0</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Learning_score">Reading & Learning Index Score</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_Learning_score" class="form-input" value="74.0" required>
            <span class="form-help">Valid scale: 0.0 - 100.0</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Retention_score">Retention Index Score</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_Retention_score" class="form-input" value="82.0" required>
            <span class="form-help">Valid scale: 0.0 - 100.0</span>
          </div>
        </div>

        <div class="form-grid-3" style="margin-top: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="field_School_infrastructure_score">School Infrastructure Score</label>
            <input type="number" step="0.1" min="0.0" max="100.0" id="field_School_infrastructure_score" class="form-input" value="70.0" required>
            <span class="form-help">Valid scale: 0.0 - 100.0</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Gender">Gender</label>
            <select id="field_Gender" class="form-select">
              <option value="Male" selected>Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="field_Province">Province / Division</label>
            <select id="field_Province" class="form-select">
              <option value="Punjab" selected>Punjab</option>
              <option value="Sindh">Sindh</option>
              <option value="KPK">Khyber Pakhtunkhwa (KPK)</option>
              <option value="Balochistan">Balochistan</option>
              <option value="Federal">Federal Capital</option>
            </select>
          </div>
        </div>
      `,
      getPayload: () => ({
        Enrolment_score: parseFloat(document.getElementById("field_Enrolment_score").value),
        Learning_score: parseFloat(document.getElementById("field_Learning_score").value),
        Retention_score: parseFloat(document.getElementById("field_Retention_score").value),
        School_infrastructure_score: parseFloat(document.getElementById("field_School_infrastructure_score").value),
        Gender_parity_score: 88.0,
        Total_number_of_schools: 520,
        Drinking_water: 85.0,
        Electricity: 80.0,
        Toilet: 90.0,
        Province: document.getElementById("field_Province").value,
      }),
      validate: (p) => {
        if (isNaN(p.Enrolment_score) || p.Enrolment_score < 0.0 || p.Enrolment_score > 100.0) return "Enrolment Score must be between 0.0 and 100.0.";
        if (isNaN(p.Learning_score) || p.Learning_score < 0.0 || p.Learning_score > 100.0) return "Learning Score must be between 0.0 and 100.0.";
        if (isNaN(p.Retention_score) || p.Retention_score < 0.0 || p.Retention_score > 100.0) return "Retention Score must be between 0.0 and 100.0.";
        if (isNaN(p.School_infrastructure_score) || p.School_infrastructure_score < 0.0 || p.School_infrastructure_score > 100.0) return "Infrastructure Score must be between 0.0 and 100.0.";
        return null;
      }
    }
  };

  // Render active stage fields
  function loadStageForm(stageKey) {
    hideError();
    if (resultCard) resultCard.style.display = "none";
    const cfg = stageConfigs[stageKey] || stageConfigs.university;
    if (formSectionTitle) formSectionTitle.querySelector("span").textContent = cfg.title;
    if (modelBadge) modelBadge.textContent = cfg.algorithm;
    if (dynamicFieldsContainer) dynamicFieldsContainer.innerHTML = cfg.render();
  }

  // Handle stage dropdown change
  if (stageSelect) {
    stageSelect.addEventListener("change", (e) => {
      loadStageForm(e.target.value);
    });
    // Initial render
    loadStageForm(stageSelect.value);
  }

  // Handle Form Submit
  if (predForm) {
    predForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();

      const stageKey = stageSelect ? stageSelect.value : "university";
      const cfg = stageConfigs[stageKey] || stageConfigs.university;
      const payload = cfg.getPayload();

      // Bounds validation
      const valErr = cfg.validate(payload);
      if (valErr) {
        showError(valErr);
        return;
      }

      // Prepare UI for loading
      submitBtn.disabled = true;
      btnText.innerHTML = `<span class="spinner"></span> Running Inference...`;

      try {
        const uid = user ? user.id : "demo-user-id-001";
        // Submit payload to FastAPI backend
        const result = await window.apiClient.runPrediction(stageKey, payload);
        console.log("[Prediction Success]", result);

        // Display Result Card
        renderResultCard(stageKey, result);
      } catch (err) {
        console.error("[Prediction Failed]", err);
        showError(err.message || "Failed to execute prediction. Backend may be offline or unreachable.");
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = "⚡ Generate Prediction";
      }
    });
  }

  // Render prediction result card
  function renderResultCard(stageKey, result) {
    if (!resultCard) return;

    const resStageBadge = document.getElementById("res-stage-badge");
    const resStatusBadge = document.getElementById("res-status-badge");
    const resStatusText = document.getElementById("res-status-text");
    const resScore = document.getElementById("res-predicted-score");
    const resGrade = document.getElementById("res-grade-text");
    const resCiRange = document.getElementById("res-ci-range");
    const resPosFactors = document.getElementById("res-positive-factors");
    const resRecText = document.getElementById("res-recommendation-text");
    const resTimestamp = document.getElementById("res-timestamp");

    if (resStageBadge) resStageBadge.textContent = `${stageKey.replace("_", " ").toUpperCase()} STAGE`;
    if (resStatusText) resStatusText.textContent = result.status_badge || "On Track";
    
    // Status Badge styling
    if (resStatusBadge) {
      resStatusBadge.className = `badge ${result.status_color || "badge-success"}`;
    }

    // Main Score Display
    if (resScore) resScore.textContent = result.formatted_score || `${result.predicted_score}`;
    if (resGrade) resGrade.textContent = result.predicted_grade ? `Letter Grade: ${result.predicted_grade}` : "Status: Calibrated";

    // 95% Confidence Interval
    if (resCiRange) {
      const low = result.confidence_interval_low !== undefined ? result.confidence_interval_low : (result.predicted_score - 0.15).toFixed(2);
      const high = result.confidence_interval_high !== undefined ? result.confidence_interval_high : (result.predicted_score + 0.15).toFixed(2);
      resCiRange.textContent = `[ ${low} — ${high} ]`;
    }

    // Key Contributing Factors
    if (resPosFactors) {
      const contribs = result.feature_contributions || {};
      const posList = contribs.top_positive_factors || [
        "High attendance rate positively reinforces performance",
        "Consistent daily self-study habits solidifies retention"
      ];
      resPosFactors.innerHTML = posList.map(item => `
        <li class="ai-rec-item" style="padding: 6px 0; font-size: 13px;">
          <span class="ai-rec-icon" style="color:#10b981;">✔</span>
          <span>${item}</span>
        </li>
      `).join("");
    }

    // Actionable AI recommendation
    if (resRecText) {
      resRecText.innerHTML = `<p style="margin:0;">${result.recommendation || "Maintain your current study discipline to achieve your target milestone."}</p>`;
    }

    if (resTimestamp) {
      const dt = result.created_at ? new Date(result.created_at).toLocaleString() : new Date().toLocaleString();
      resTimestamp.textContent = `Executed at: ${dt}`;
    }

    resultCard.style.display = "block";
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
