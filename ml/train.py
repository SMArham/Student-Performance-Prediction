"""
Machine Learning Training Pipeline
Student Performance Prediction & Analytics System

Trains, evaluates, and serializes versioned ML pipelines for all 4 educational stages:
1. University (Gradient Boosting for CGPA)
2. Matric / Intermediate (Ridge Regression for HSSC-II Marks)
3. Secondary (Gradient Boosting for G3 Final Grade)
4. Primary (Linear Regression for Education Score)
"""

import os
import json
import logging
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ml_train")

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def train_university_model() -> dict:
    """Train Gradient Boosting model for University CGPA prediction."""
    logger.info("--> Training Stage 1: University Gradient Boosting Regressor")
    data_path = os.path.join(os.path.dirname(__file__), "..", "University performance", "University performance.csv")
    df = pd.read_csv(data_path)
    df.columns = df.columns.str.strip()

    num_cols = ["Age", "Attendance_Pct", "Study_Hours_Per_Day", "Previous_CGPA", "Sleep_Hours", "Social_Hours_Week"]
    cat_cols = ["Gender", "Major"]
    target_col = "Final_CGPA"

    X = df[num_cols + cat_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(n_estimators=120, max_depth=4, learning_rate=0.08, random_state=42)),
        ]
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))

    logger.info(f"University Model - R2: {r2:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}")

    version = "v1.0.0"
    artifact_filename = f"university_gradient_boosting_{version}.joblib"
    artifact_path = os.path.join(ARTIFACTS_DIR, artifact_filename)
    joblib.dump(model, artifact_path)

    metadata = {
        "stage": "university",
        "model_name": "University CGPA Multi-Factor Predictor",
        "algorithm": "Gradient Boosting Regressor",
        "version": version,
        "artifact_file": artifact_filename,
        "target": target_col,
        "features": {
            "numeric": num_cols,
            "categorical": cat_cols,
        },
        "metrics": {
            "r2": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    return metadata


def train_matric_inter_model() -> dict:
    """Train Ridge Regression model for Matric/Intermediate HSSC-II prediction."""
    logger.info("--> Training Stage 2: Matric/Intermediate Ridge Regression")
    data_path = os.path.join(os.path.dirname(__file__), "..", "Matric_Intermediate", "Matric _Intermediate  .csv")
    df = pd.read_csv(data_path)
    df.columns = df.columns.str.strip()

    num_cols = ["SSC_I_Marks", "SSC_II_Marks", "HSSC_I_Marks", "Attendance_Rate", "Study_Hours", "Previous_Failures", "Exam_Attempts"]
    cat_cols = ["Region", "Gender", "Enrollment_Type", "Subject_Group", "Parent_Education_Level", "Parent_Income", "Extra_Tuition", "School_Type", "Co_Curricular_Activities"]
    target_col = "HSSC_II_Marks"

    X = df[num_cols + cat_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", Ridge(alpha=10.0)),
        ]
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))

    logger.info(f"Matric/Inter Model - R2: {r2:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}")

    version = "v1.0.0"
    artifact_filename = f"matric_inter_ridge_{version}.joblib"
    artifact_path = os.path.join(ARTIFACTS_DIR, artifact_filename)
    joblib.dump(model, artifact_path)

    metadata = {
        "stage": "matric_inter",
        "model_name": "Matric/Intermediate HSSC-II Marks Predictor",
        "algorithm": "Ridge Regression",
        "version": version,
        "artifact_file": artifact_filename,
        "target": target_col,
        "features": {
            "numeric": num_cols,
            "categorical": cat_cols,
        },
        "metrics": {
            "r2": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    return metadata


def train_secondary_model() -> dict:
    """Train Gradient Boosting model for Secondary School G3 Grade prediction."""
    logger.info("--> Training Stage 3: Secondary School Gradient Boosting Regressor")
    data_path = os.path.join(os.path.dirname(__file__), "..", "Secondary", "Secondary.csv")
    df = pd.read_csv(data_path)
    df.columns = df.columns.str.strip()

    num_cols = ["age", "Medu", "Fedu", "traveltime", "studytime", "failures", "famrel", "freetime", "goout", "Dalc", "Walc", "health", "absences", "G1", "G2"]
    cat_cols = ["school", "sex", "address", "famsize", "Pstatus", "Mjob", "Fjob", "reason", "guardian", "schoolsup", "famsup", "paid", "activities", "nursery", "higher", "internet", "romantic"]
    target_col = "G3"

    X = df[num_cols + cat_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)),
        ]
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))

    logger.info(f"Secondary Model - R2: {r2:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}")

    version = "v1.0.0"
    artifact_filename = f"secondary_gradient_boosting_{version}.joblib"
    artifact_path = os.path.join(ARTIFACTS_DIR, artifact_filename)
    joblib.dump(model, artifact_path)

    metadata = {
        "stage": "secondary",
        "model_name": "Secondary School Final Grade (G3) Predictor",
        "algorithm": "Gradient Boosting Regressor",
        "version": version,
        "artifact_file": artifact_filename,
        "target": target_col,
        "features": {
            "numeric": num_cols,
            "categorical": cat_cols,
        },
        "metrics": {
            "r2": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    return metadata


def train_primary_model() -> dict:
    """Train Linear Regression model for Primary Education Score prediction."""
    logger.info("--> Training Stage 4: Primary Education Linear Regression")
    data_path = os.path.join(os.path.dirname(__file__), "..", "primary system", "Primary _Education system.csv")
    df = pd.read_csv(data_path)
    df.columns = df.columns.str.strip()

    num_cols = ["Enrolment score", "Learning score", "Retention score", "School infrastructure score", "Gender parity score", "Total number of schools", "Drinking water", "Electricity", "Toilet"]
    cat_cols = ["Province"]
    target_col = "Education score"

    df_clean = df.dropna(subset=[target_col]).copy()
    X = df_clean[num_cols + cat_cols]
    y = df_clean[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", LinearRegression()),
        ]
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))

    logger.info(f"Primary Model - R2: {r2:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}")

    version = "v1.0.0"
    artifact_filename = f"primary_linear_regression_{version}.joblib"
    artifact_path = os.path.join(ARTIFACTS_DIR, artifact_filename)
    joblib.dump(model, artifact_path)

    metadata = {
        "stage": "primary",
        "model_name": "Primary Education Multi-Indicator Predictor",
        "algorithm": "Linear Regression",
        "version": version,
        "artifact_file": artifact_filename,
        "target": target_col,
        "features": {
            "numeric": num_cols,
            "categorical": cat_cols,
        },
        "metrics": {
            "r2": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    return metadata


def main():
    logger.info("=== Starting Multi-Stage ML Model Training Pipeline ===")
    registry = {
        "models": {
            "university": train_university_model(),
            "matric_inter": train_matric_inter_model(),
            "secondary": train_secondary_model(),
            "primary": train_primary_model(),
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    registry_path = os.path.join(ARTIFACTS_DIR, "model_registry.json")
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    logger.info(f"=== Model Training Complete! Registry saved to {registry_path} ===")


if __name__ == "__main__":
    main()
