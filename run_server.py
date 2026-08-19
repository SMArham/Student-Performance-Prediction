"""
Local Development Server Launcher
Student Performance Prediction & Analytics System
"""

import sys
import os
import uvicorn

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("=================================================================")
    print(" [>] Starting Student Performance Prediction & Analytics System")
    print(" [>] Dashboard UI:  http://localhost:8005/dashboard.html")
    print(" [>] Login Screen:  http://localhost:8005/login.html")
    print(" [>] Signup Screen: http://localhost:8005/signup.html")
    print(" [>] API Docs:      http://localhost:8005/docs")
    print("=================================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8005, reload=False)
