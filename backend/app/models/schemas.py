"""
Pydantic Data Validation Schemas
Student Performance Prediction & Analytics System
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ------------------------------------------------------------------------------
# Prediction Request Schemas
# ------------------------------------------------------------------------------
class UniversityPredictionRequest(BaseModel):
    Age: int = Field(21, ge=16, le=60, description="Student age in years")
    Attendance_Pct: float = Field(88.5, ge=0.0, le=100.0, description="Class attendance percentage")
    Study_Hours_Per_Day: float = Field(4.5, ge=0.0, le=16.0, description="Daily self-study hours")
    Previous_CGPA: float = Field(3.48, ge=0.0, le=4.0, description="Previous semester cumulative CGPA")
    Sleep_Hours: float = Field(7.0, ge=2.0, le=14.0, description="Average sleep hours per night")
    Social_Hours_Week: int = Field(8, ge=0, le=50, description="Socializing/leisure hours per week")
    Gender: str = Field("Male", description="Gender (Male/Female)")
    Major: str = Field("Engineering", description="Academic Major (e.g. Engineering, Business, Computer Science)")
    # Holistic Behavioral & Teacher Evaluation Fields
    attentiveness_level: Optional[str] = Field("High", description="Classroom attentiveness (High/Moderate/Low)")
    communication_skill: Optional[str] = Field("Good", description="Communication & presentation skill (Excellent/Good/Average/Needs Support)")
    assignment_consistency: Optional[str] = Field("Always", description="Assignment consistency (Always/Mostly/Irregular)")
    class_participation: Optional[str] = Field("Active", description="Class discussion participation (Leader/Active/Passive)")
    problem_solving_pace: Optional[str] = Field("Quick", description="Conceptual grasp pace (Quick/Average/Remediation)")
    teacher_rating: Optional[float] = Field(4.5, ge=1.0, le=5.0, description="Overall Teacher evaluation rating (1.0 to 5.0)")
    evaluator_role: Optional[str] = Field("Teacher", description="Evaluator perspective (Teacher/Student)")
    teacher_notes: Optional[str] = Field(None, description="Optional teacher observations and remarks")


class MatricInterPredictionRequest(BaseModel):
    SSC_I_Marks: int = Field(650, ge=0, le=1100, description="Matric 9th Grade Marks")
    SSC_II_Marks: int = Field(680, ge=0, le=1100, description="Matric 10th Grade Marks")
    HSSC_I_Marks: int = Field(420, ge=0, le=550, description="Intermediate 11th Grade Marks")
    Attendance_Rate: float = Field(85.0, ge=0.0, le=100.0, description="Attendance Rate %")
    Study_Hours: float = Field(4.0, ge=0.0, le=16.0, description="Daily study hours")
    Previous_Failures: int = Field(0, ge=0, le=10, description="Number of previous failed attempts")
    Exam_Attempts: int = Field(1, ge=1, le=5, description="Number of exam attempts")
    Region: str = Field("Mohmand", description="District or Region")
    Gender: str = Field("Male", description="Gender (Male/Female)")
    Enrollment_Type: str = Field("Regular", description="Enrollment Type (Regular/Private)")
    Subject_Group: str = Field("Science", description="Subject Group (Science/Arts/Computer Science)")
    Parent_Education_Level: str = Field("College", description="Parent Education Level")
    Parent_Income: str = Field("Medium", description="Family Income Bracket (Low/Medium/High)")
    Extra_Tuition: str = Field("No", description="Enrolled in extra tuition (Yes/No)")
    School_Type: str = Field("Private", description="School Type (Public/Private)")
    Co_Curricular_Activities: str = Field("Yes", description="Co-curricular participation (Yes/No)")
    # Holistic Behavioral & Teacher Evaluation Fields
    attentiveness_level: Optional[str] = Field("High", description="Classroom attentiveness (High/Moderate/Low)")
    communication_skill: Optional[str] = Field("Good", description="Communication & presentation skill (Excellent/Good/Average/Needs Support)")
    assignment_consistency: Optional[str] = Field("Always", description="Assignment consistency (Always/Mostly/Irregular)")
    class_participation: Optional[str] = Field("Active", description="Class discussion participation (Leader/Active/Passive)")
    problem_solving_pace: Optional[str] = Field("Quick", description="Conceptual grasp pace (Quick/Average/Remediation)")
    teacher_rating: Optional[float] = Field(4.5, ge=1.0, le=5.0, description="Overall Teacher evaluation rating (1.0 to 5.0)")
    evaluator_role: Optional[str] = Field("Teacher", description="Evaluator perspective (Teacher/Student)")
    teacher_notes: Optional[str] = Field(None, description="Optional teacher observations and remarks")


class SecondaryPredictionRequest(BaseModel):
    age: int = Field(16, ge=14, le=22, description="Student age")
    Medu: int = Field(3, ge=0, le=4, description="Mother's education (0=none to 4=higher)")
    Fedu: int = Field(3, ge=0, le=4, description="Father's education (0=none to 4=higher)")
    traveltime: int = Field(1, ge=1, le=4, description="Travel time (1=<15min, 2=15-30min, 3=30-60min, 4=>60min)")
    studytime: int = Field(2, ge=1, le=4, description="Weekly study time (1=<2h, 2=2-5h, 3=5-10h, 4=>10h)")
    failures: int = Field(0, ge=0, le=4, description="Past class failures")
    famrel: int = Field(4, ge=1, le=5, description="Family relationship quality (1=very bad to 5=excellent)")
    freetime: int = Field(3, ge=1, le=5, description="Free time after school (1=very low to 5=very high)")
    goout: int = Field(3, ge=1, le=5, description="Going out with friends (1=very low to 5=very high)")
    Dalc: int = Field(1, ge=1, le=5, description="Workday alcohol consumption (1=very low to 5=very high)")
    Walc: int = Field(1, ge=1, le=5, description="Weekend alcohol consumption (1=very low to 5=very high)")
    health: int = Field(4, ge=1, le=5, description="Current health status (1=very bad to 5=very good)")
    absences: int = Field(4, ge=0, le=93, description="School absences")
    G1: int = Field(14, ge=0, le=20, description="First period grade (0-20)")
    G2: int = Field(15, ge=0, le=20, description="Second period grade (0-20)")
    school: str = Field("GP", description="School acronym (GP/MS)")
    sex: str = Field("F", description="Sex (F/M)")
    address: str = Field("U", description="Home address type (U=urban, R=rural)")
    famsize: str = Field("GT3", description="Family size (LE3/GT3)")
    Pstatus: str = Field("T", description="Parent cohabitation status (T=together, A=apart)")
    Mjob: str = Field("teacher", description="Mother job")
    Fjob: str = Field("services", description="Father job")
    reason: str = Field("course", description="Reason to choose school")
    guardian: str = Field("mother", description="Guardian")
    schoolsup: str = Field("no", description="Extra educational support (yes/no)")
    famsup: str = Field("yes", description="Family educational support (yes/no)")
    paid: str = Field("no", description="Extra paid classes (yes/no)")
    activities: str = Field("yes", description="Extra-curricular activities (yes/no)")
    nursery: str = Field("yes", description="Attended nursery (yes/no)")
    higher: str = Field("yes", description="Wants to take higher education (yes/no)")
    internet: str = Field("yes", description="Internet access at home (yes/no)")
    romantic: str = Field("no", description="In a romantic relationship (yes/no)")
    # Holistic Behavioral & Teacher Evaluation Fields
    attentiveness_level: Optional[str] = Field("High", description="Classroom attentiveness (High/Moderate/Low)")
    communication_skill: Optional[str] = Field("Good", description="Communication & presentation skill (Excellent/Good/Average/Needs Support)")
    assignment_consistency: Optional[str] = Field("Always", description="Assignment consistency (Always/Mostly/Irregular)")
    class_participation: Optional[str] = Field("Active", description="Class discussion participation (Leader/Active/Passive)")
    problem_solving_pace: Optional[str] = Field("Quick", description="Conceptual grasp pace (Quick/Average/Remediation)")
    teacher_rating: Optional[float] = Field(4.5, ge=1.0, le=5.0, description="Overall Teacher evaluation rating (1.0 to 5.0)")
    evaluator_role: Optional[str] = Field("Teacher", description="Evaluator perspective (Teacher/Student)")
    teacher_notes: Optional[str] = Field(None, description="Optional teacher observations and remarks")


class PrimaryPredictionRequest(BaseModel):
    Enrolment_score: float = Field(78.5, ge=0.0, le=100.0, description="Enrolment score index")
    Learning_score: float = Field(74.0, ge=0.0, le=100.0, description="Learning score index")
    Retention_score: float = Field(82.0, ge=0.0, le=100.0, description="Retention score index")
    School_infrastructure_score: float = Field(70.0, ge=0.0, le=100.0, description="Infrastructure score")
    Gender_parity_score: float = Field(88.0, ge=0.0, le=100.0, description="Gender parity score")
    Total_number_of_schools: int = Field(520, ge=10, le=5000, description="Total district schools")
    Drinking_water: float = Field(85.0, ge=0.0, le=100.0, description="Drinking water facility %")
    Electricity: float = Field(80.0, ge=0.0, le=100.0, description="Electricity facility %")
    Toilet: float = Field(90.0, ge=0.0, le=100.0, description="Sanitation/toilet facility %")
    Province: str = Field("Punjab", description="Province / Administrative division")
    # Holistic Behavioral & Teacher Evaluation Fields
    attentiveness_level: Optional[str] = Field("High", description="Classroom attentiveness (High/Moderate/Low)")
    communication_skill: Optional[str] = Field("Good", description="Communication & presentation skill (Excellent/Good/Average/Needs Support)")
    assignment_consistency: Optional[str] = Field("Always", description="Assignment consistency (Always/Mostly/Irregular)")
    class_participation: Optional[str] = Field("Active", description="Class discussion participation (Leader/Active/Passive)")
    problem_solving_pace: Optional[str] = Field("Quick", description="Conceptual grasp pace (Quick/Average/Remediation)")
    teacher_rating: Optional[float] = Field(4.5, ge=1.0, le=5.0, description="Overall Teacher evaluation rating (1.0 to 5.0)")
    evaluator_role: Optional[str] = Field("Teacher", description="Evaluator perspective (Teacher/Student)")
    teacher_notes: Optional[str] = Field(None, description="Optional teacher observations and remarks")


# ------------------------------------------------------------------------------
# Prediction Response Schemas
# ------------------------------------------------------------------------------
class PredictionResponse(BaseModel):
    success: bool = True
    stage: str
    model_name: str
    model_version: str
    predicted_score: float
    formatted_score: str
    predicted_grade: Optional[str] = None
    confidence_interval_low: float
    confidence_interval_high: float
    status_badge: str
    status_color: str
    recommendation: str
    feature_contributions: Dict[str, Any] = {}
    created_at: str


# ------------------------------------------------------------------------------
# Dashboard KPI & Trend Schemas
# ------------------------------------------------------------------------------
class StudentInfo(BaseModel):
    user_id: str
    full_name: str
    email: str
    avatar_url: str
    role: str
    stage: str
    student_id_code: str
    institution_name: str
    program_or_major: str
    current_grade_level: str


class KPICards(BaseModel):
    current_gpa: float
    cumulative_cgpa: float
    predicted_gpa: float
    target_cgpa: float
    delta_cgpa: float
    trend_direction: str  # "up", "down", "neutral"
    status_badge: str     # "Exemplary", "On Track", "At Risk", "Critical Intervention Needed"
    status_color: str     # "badge-success", "badge-primary", "badge-warning", "badge-danger"
    status_message: str


class ProgressionChartData(BaseModel):
    labels: List[str]
    past_gpa_series: List[Optional[float]]
    current_gpa_series: List[Optional[float]]
    predicted_target_series: List[Optional[float]]


class HistoryItem(BaseModel):
    id: str
    stage: str
    model_name: str
    model_version: str
    predicted_score: float
    status_badge: str
    status_color: str
    created_at: str


class DashboardSummaryResponse(BaseModel):
    success: bool = True
    student_info: StudentInfo
    kpis: KPICards
    progression_trend: ProgressionChartData
    recent_predictions: List[HistoryItem]
    has_records: bool = True
    quick_tips: List[str]


# ------------------------------------------------------------------------------
# Model Registry Schemas
# ------------------------------------------------------------------------------
class ModelRegistryItem(BaseModel):
    stage: str
    model_name: str
    algorithm: str
    version: str
    metrics: Dict[str, Any]
    target: str
    features: Dict[str, List[str]]
    trained_at: str
