"""
Machine Learning Preprocessing & Calibration Utilities
Student Performance Prediction & Analytics System
"""

from typing import Dict, Any, Tuple


def get_performance_badge(stage: str, score: float) -> Tuple[str, str, str]:
    """
    Calibrate performance score into standardized performance tier badges.
    Returns: (badge_text, badge_color_class, action_recommendation)
    """
    score = float(score)
    stage = stage.lower()

    if stage == "university":
        # 4.0 Scale CGPA
        if score >= 3.60:
            return (
                "Exemplary",
                "badge-success",
                "Outstanding academic trajectory. Eligible for Dean's Honor Roll and scholarship opportunities."
            )
        elif score >= 3.00:
            return (
                "On Track",
                "badge-primary",
                "Consistent academic standing. Maintaining steady progress toward target degree completion."
            )
        elif score >= 2.30:
            return (
                "At Risk",
                "badge-warning",
                "Performance is nearing academic warning threshold. Recommend tutoring and increased study hours."
            )
        else:
            return (
                "Critical Intervention Needed",
                "badge-danger",
                "Urgent academic advisory counseling and individualized remediation plan required immediately."
            )

    elif stage == "matric_inter":
        # Total Marks out of 1100
        if score >= 880:  # 80%+
            return (
                "Exemplary",
                "badge-success",
                "Exceptional A-1 grade caliber. High probability of competitive university admission."
            )
        elif score >= 715:  # 65%-80%
            return (
                "On Track",
                "badge-primary",
                "Solid B to A grade standing. Keep up consistent revision for board examinations."
            )
        elif score >= 550:  # 50%-65%
            return (
                "At Risk",
                "badge-warning",
                "Passing score range. Needs targeted practice in core STEM/humanities subjects."
            )
        else:
            return (
                "Critical Intervention Needed",
                "badge-danger",
                "Below passing standards. Intensive subject remediation and practice exams recommended."
            )

    elif stage == "secondary":
        # Percentage scale (0 - 100%) for Class 5 to Class 8
        if score >= 80.0:
            return (
                "Exemplary",
                "badge-success",
                "Excellent mastery of secondary curriculum (Class 5-8). High probability of distinction in next grade."
            )
        elif score >= 65.0:
            return (
                "On Track",
                "badge-primary",
                "Solid academic progress. Meeting standard middle school competency benchmarks."
            )
        elif score >= 50.0:
            return (
                "At Risk",
                "badge-warning",
                "Passing score range. Suggest reinforcing fundamental concepts before next term."
            )
        else:
            return (
                "Critical Intervention Needed",
                "badge-danger",
                "Significant academic gaps. Individualized remediation and parent-teacher consultation recommended."
            )

    elif stage == "primary":
        # 100-point Education score
        if score >= 80.0:
            return (
                "Exemplary",
                "badge-success",
                "High foundational learning development. Demonstrates strong literacy and numeracy skills."
            )
        elif score >= 65.0:
            return (
                "On Track",
                "badge-primary",
                "Good foundational progress. Meeting standard developmental milestones."
            )
        elif score >= 50.0:
            return (
                "At Risk",
                "badge-warning",
                "Moderate foundational learning gaps. Suggest reinforcing core reading and math skills."
            )
        else:
            return (
                "Critical Intervention Needed",
                "badge-danger",
                "Significant early learning deficits. Dedicated foundational reading/math intervention required."
            )

    # Fallback
    return ("On Track", "badge-primary", "Regular academic progress.")
