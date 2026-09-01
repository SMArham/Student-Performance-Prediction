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
    print(" [>] Student Performance Prediction & Analytics System")
    print(" [>] Page 1 (Dashboard):   http://localhost:8005/dashboard.html")
    print(" [>] Page 2 (Prediction):  http://localhost:8005/prediction.html")
    print(" [>] Page 3 (Analytics):   http://localhost:8005/analytics.html")
    print(" [>] Sign In Screen:       http://localhost:8005/login.html")
    print(" [>] Create Account:       http://localhost:8005/signup.html")
    print("=================================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8005, reload=False)
