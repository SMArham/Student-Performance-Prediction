"""
Database & Supabase Client Module
Student Performance Prediction & Analytics System
"""

from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from backend.app.config import settings
from backend.app.core.logger import logger

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Returns singleton Supabase client or None if running in standalone mock mode."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("https://your-project"):
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Connected to live Supabase client successfully.")
            return _supabase_client
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to internal state store.")
            return None



# ------------------------------------------------------------------------------
# In-Memory Fallback State Store (Ensures 100% offline & local demo functionality)
# ------------------------------------------------------------------------------
class InMemoryDataStore:
    def __init__(self):
        self.profiles: Dict[str, Dict[str, Any]] = {}
        self.student_profiles: Dict[str, Dict[str, Any]] = {}
        self.academic_records: List[Dict[str, Any]] = []
        self.prediction_history: List[Dict[str, Any]] = []
        self.students_roster: List[Dict[str, Any]] = []


memory_db = InMemoryDataStore()
