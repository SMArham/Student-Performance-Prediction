-- ==============================================================================
-- Student Performance Prediction & Analytics System
-- Seed / Sample Data
-- ==============================================================================

-- 1. Insert Initial Production Model Registry Records
INSERT INTO public.model_registry (stage, model_name, model_type, algorithm, version, metrics, features_list, artifact_path, is_active)
VALUES 
(
    'university',
    'University CGPA Multi-Factor Predictor',
    'Regression',
    'Gradient Boosting Regressor',
    'v1.0.0',
    '{"r2": 0.9536, "rmse": 0.1153, "mae": 0.0891, "train_samples": 4000, "test_samples": 1000}'::jsonb,
    '["Age", "Attendance_Pct", "Study_Hours_Per_Day", "Previous_CGPA", "Sleep_Hours", "Social_Hours_Week", "Gender", "Major"]'::jsonb,
    'ml/artifacts/university_gradient_boosting_v1.0.0.joblib',
    TRUE
),
(
    'matric_inter',
    'Matric/Intermediate HSSC-II Predictor',
    'Regression',
    'Ridge Regression',
    'v1.0.0',
    '{"r2": 0.8520, "rmse": 24.12, "mae": 18.35, "train_samples": 72000, "test_samples": 18000}'::jsonb,
    '["SSC_I_Marks", "SSC_II_Marks", "HSSC_I_Marks", "Attendance_Rate", "Study_Hours", "Previous_Failures", "Exam_Attempts", "Region", "Gender", "Enrollment_Type", "Subject_Group", "Parent_Education_Level", "Parent_Income", "Extra_Tuition", "School_Type"]'::jsonb,
    'ml/artifacts/matric_inter_ridge_v1.0.0.joblib',
    TRUE
),
(
    'secondary',
    'Secondary Final Grade (G3) Predictor',
    'Regression',
    'Gradient Boosting Regressor',
    'v1.0.0',
    '{"r2": 0.8083, "rmse": 1.9829, "mae": 1.4215, "train_samples": 316, "test_samples": 79}'::jsonb,
    '["age", "Medu", "Fedu", "traveltime", "studytime", "failures", "famrel", "freetime", "goout", "Dalc", "Walc", "health", "absences", "G1", "G2", "school", "sex", "address", "famsize", "Pstatus", "Mjob", "Fjob", "reason", "guardian", "schoolsup", "famsup", "paid", "activities", "nursery", "higher", "internet", "romantic"]'::jsonb,
    'ml/artifacts/secondary_gradient_boosting_v1.0.0.joblib',
    TRUE
),
(
    'primary',
    'Primary Education Score Multi-Indicator Predictor',
    'Regression',
    'Linear Regression',
    'v1.0.0',
    '{"r2": 0.9738, "rmse": 2.1599, "mae": 1.6840, "train_samples": 464, "test_samples": 116}'::jsonb,
    '["Enrolment score", "Learning score", "Retention score", "School infrastructure score", "Gender parity score", "Total number of schools", "Drinking water", "Electricity", "Toilet", "Province"]'::jsonb,
    'ml/artifacts/primary_linear_regression_v1.0.0.joblib',
    TRUE
)
ON CONFLICT (stage, version) DO UPDATE 
SET metrics = EXCLUDED.metrics,
    is_active = EXCLUDED.is_active,
    artifact_path = EXCLUDED.artifact_path;
