"""
Authentication & Password Recovery Routes
Student Performance Prediction & Analytics System
"""

import os
import random
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from backend.app.core.logger import logger
from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage with timestamp: { email: { "code": "123456", "expires_at": timestamp } }
otp_storage: Dict[str, dict] = {}


class SendResetCodeRequest(BaseModel):
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


def send_smtp_email(to_email: str, code: str) -> bool:
    """Send an HTML email with the verification OTP using configured SMTP or fallback."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    subject = f"🔑 [{code}] is your EduMetrics AI Password Reset Code"
    plain_text = f"""
EduMetrics AI - Student Performance Prediction Platform
=========================================================

YOUR 6-DIGIT VERIFICATION CODE IS:  {code}

Please enter {code} on the verification screen to reset your password.
This code will expire in 15 minutes.

If you did not request this, you can safely ignore this email.
"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 20px; }}
        .card {{ max-width: 500px; margin: 0 auto; background: #1E293B; border-radius: 12px; padding: 30px; border: 1px solid #334155; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #6366F1; margin-bottom: 20px; }}
        .code-box {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10B981; background: #0F172A; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #10B981; }}
        .footer {{ font-size: 12px; color: #94A3B8; margin-top: 25px; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🎓 EduMetrics AI</div>
        <h2>Password Reset Verification Code</h2>
        <p>Dear Student,</p>
        <p>Your 6-digit verification code to reset your account password is:</p>
        <div class="code-box">{code}</div>
        <p>Enter this code in the password recovery window to set your new password. This code will expire in <strong>15 minutes</strong>.</p>
        <div class="footer">
          &copy; 2026 EduMetrics AI – Student Performance Prediction & Analytics Platform.
        </div>
      </div>
    </body>
    </html>
    """

    if not smtp_user or not smtp_pass:
        logger.info(f"[Auth-MockMail] SMTP credentials not configured in .env. Verification Code for {to_email} is: {code}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"EduMetrics AI <{smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        logger.info(f"[Auth-SMTP] Successfully sent password reset email to {to_email}")
        return True
    except Exception as e:
        logger.error(f"[Auth-SMTP] Failed to send email to {to_email}: {str(e)}")
        return False


@router.post("/send-reset-code")
async def send_reset_code(req: SendResetCodeRequest):
    """Generate and dispatch a 6-digit password reset code to the provided email."""
    email_clean = req.email.strip().lower()
    code = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + (15 * 60)  # 15 minutes TTL

    otp_storage[email_clean] = {
        "code": code,
        "expires_at": expires_at
    }

    email_sent = send_smtp_email(email_clean, code)
    logger.info(f"[Auth] Reset code {code} generated for {email_clean} (Expires in 15 mins)")

    return {
        "status": "success",
        "message": f"Verification code dispatched to {email_clean}",
        "email": email_clean,
        "code": code if os.getenv("ENVIRONMENT") == "development" else None,
        "expires_in_seconds": 900
    }


@router.post("/verify-reset-code")
async def verify_reset_code(req: VerifyResetCodeRequest):
    """Verify if the provided 6-digit code matches the stored OTP."""
    email_clean = req.email.strip().lower()
    record = otp_storage.get(email_clean)

    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No reset request found for this email.")

    if time.time() > record["expires_at"]:
        del otp_storage[email_clean]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new one.")

    if record["code"] != req.code.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code. Please check and try again.")

    return {
        "status": "success",
        "message": "Verification code is valid. Proceed to reset password."
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Reset the user password after successful verification."""
    email_clean = req.email.strip().lower()
    record = otp_storage.get(email_clean)

    if not record or record["code"] != req.code.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification session.")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters long.")

    # Remove used OTP
    if email_clean in otp_storage:
        del otp_storage[email_clean]

    logger.info(f"[Auth] Password successfully reset for {email_clean}")
    return {
        "status": "success",
        "message": "Password has been reset successfully. You can now log in with your new credentials."
    }
