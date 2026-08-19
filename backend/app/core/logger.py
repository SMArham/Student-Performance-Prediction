"""
Centralized Structured Logging Module
Student Performance Prediction & Analytics System
"""

import logging
import sys
from backend.app.config import settings


def setup_logger(name: str = "app") -> logging.Logger:
    """Configure and return a standardized logger instance."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
        
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger


logger = setup_logger("analytics_backend")
