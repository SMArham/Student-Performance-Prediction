"""
Local Development Server Launcher
Student Performance Prediction
"""

import sys
import os
import uvicorn

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    print("=================================================================")
    print(" [>] Student Performance Prediction")
    print(" [>] Isolated Running Port: 9005")
    print(" [>] Starting Page (Sign Up): http://localhost:9005/signup.html (or http://localhost:9005/)")
    print(" [>] Sign In Screen:          http://localhost:9005/login.html")
    print(" [>] Page 1 (Dashboard):      http://localhost:9005/dashboard.html")
    print(" [>] Page 2 (Prediction):     http://localhost:9005/prediction.html")
    print(" [>] Page 3 (Analytics):      http://localhost:9005/analytics.html")
    print("=================================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=9005, reload=False)
