from fastapi import APIRouter, Depends, HTTPException
from collections import defaultdict
from datetime import datetime, timedelta

from services.scoring_engine import calculate_weighted_rolling_score
from services.shap_explainer import explain_ml
from services.auth_service import get_current_user
from config import scores_col, profiles_col

router = APIRouter(prefix="/score", tags=["Score"])


def _aggregate_monthly(profiles: list) -> list:
    """Group raw profile docs by month and compute per-month averages."""
    monthly: dict = defaultdict(list)
    for p in profiles:
        monthly[p["month"]].append(p)

    aggregated = []
    for month, month_profiles in sorted(monthly.items(), reverse=True):
        aggregated.append({
            "month":                month,
            "task_completion_rate": sum(p["task_completion_rate"] for p in month_profiles) / len(month_profiles),
            "gps_consistency":      sum(p["gps_consistency"] for p in month_profiles) / len(month_profiles),
            "customer_rating":      sum(p["customer_rating"] for p in month_profiles) / len(month_profiles),
            "platform_name":        month_profiles[0]["platform_name"],
            "platform_diversity":   len(set(p["platform_name"] for p in month_profiles)),
            "total_earnings":       sum(p["total_earnings"] for p in month_profiles),
            "worker_id":            month_profiles[0]["worker_id"],
        })

    return aggregated  # most recent first


@router.post("/calculate")
def calculate_score(current_user: dict = Depends(get_current_user)):
    raw_profiles = list(profiles_col.find(
        {"user_email": current_user["email"]},
        {"_id": 0},
    ).sort("month", -1))

    if not raw_profiles:
        raise HTTPException(status_code=404, detail="No profile data found. Please upload your data first.")

    monthly = _aggregate_monthly(raw_profiles)
    months_count = len(monthly)

    if months_count < 3:
        eligibility = "insufficient"
    elif months_count < 6:
        eligibility = "preliminary"
    else:
        eligibility = "official"

    result = calculate_weighted_rolling_score(monthly)

    # SHAP explanation uses the weighted synthetic profile created inside the engine;
    # rebuild it here for the explainer.
    from models.profile import Profile
    from services.scoring_engine import calculate_weighted_rolling_score as _cwr

    n = min(len(monthly), 12)
    weights = list(range(n, 0, -1))
    total_w = sum(weights)

    def wavg(field):
        return sum(monthly[i][field] * weights[i] for i in range(n)) / total_w

    synthetic = Profile(
        user_id=monthly[0]["worker_id"],
        platform_name=monthly[0]["platform_name"],
        task_completion_rate=round(wavg("task_completion_rate"), 4),
        gps_consistency=round(wavg("gps_consistency"), 4),
        customer_rating=round(wavg("customer_rating"), 4),
        platform_diversity=max(len(set(m["platform_name"] for m in monthly[:3])), 1),
        daily_earnings=[m["total_earnings"] for m in monthly[:n]],
    )

    explanation = (
        explain_ml(synthetic)
        if result["model_used"] == "ml"
        else ["Using safe baseline model due to instability in ML prediction"]
    )

    version = scores_col.count_documents({"user_email": current_user["email"]}) + 1

    score_doc = {
        "user_email":    current_user["email"],
        "score_value":   result["score"],
        "model_used":    result["model_used"],
        "explanation":   explanation,
        "eligibility":   eligibility,
        "months_count":  months_count,
        "version":       version,
        "created_at":    datetime.utcnow(),
        "expires_at":    datetime.utcnow() + timedelta(days=30),
    }

    scores_col.insert_one(score_doc)

    return {
        "score":         result["score"],
        "model_used":    result["model_used"],
        "explanation":   explanation,
        "eligibility":   eligibility,
        "months_count":  months_count,
        "version":       version,
    }


@router.get("/history")
def get_score_history(current_user: dict = Depends(get_current_user)):
    history = list(
        scores_col.find(
            {"user_email": current_user["email"]},
            {"_id": 0},
        ).sort("created_at", -1)
    )
    return {"history": history}
