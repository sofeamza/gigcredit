from fastapi import APIRouter, Depends, HTTPException
from collections import defaultdict
from datetime import datetime, timedelta

from services.scoring_engine import calculate_weighted_rolling_score, get_score
from services.shap_explainer import explain_ml
from services.auth_service import get_current_user
from config import scores_col, profiles_col, daily_records_col
import calendar as cal
from models.profile import Profile

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


def _build_synthetic(window: list) -> Profile:
    """Build a weighted synthetic Profile from a window of monthly aggregates (most recent first)."""
    n = min(len(window), 12)
    weights = list(range(n, 0, -1))
    total_w = sum(weights)

    def wavg(field):
        return sum(window[i][field] * weights[i] for i in range(n)) / total_w

    return Profile(
        user_id=window[0].get("worker_id", ""),
        platform_name=window[0]["platform_name"],
        task_completion_rate=round(wavg("task_completion_rate"), 4),
        gps_consistency=round(wavg("gps_consistency"), 4),
        customer_rating=round(wavg("customer_rating"), 4),
        platform_diversity=max(len(set(m["platform_name"] for m in window[:3])), 1),
        daily_earnings=[m["total_earnings"] for m in window[:n]],
    )


def _compute_all_monthly_scores(user_email: str, all_monthly: list) -> list:
    """
    Compute a rolling score for every month of data.
    all_monthly: most recent first.
    Returns list of score docs, newest first.
    """
    months_asc = list(reversed(all_monthly))  # oldest first
    now = datetime.utcnow()
    results = []

    for i, month_data in enumerate(months_asc):
        # Rolling window: all months up to and including this one, most recent first
        window = list(reversed(months_asc[: i + 1]))

        synthetic = _build_synthetic(window)
        result = get_score(synthetic)

        months_count = i + 1
        if months_count < 3:
            eligibility = "insufficient"
        elif months_count < 6:
            eligibility = "preliminary"
        else:
            eligibility = "official"

        explanation = (
            explain_ml(synthetic)
            if result["model_used"] == "ml"
            else ["Using safe baseline model due to instability in ML prediction"]
        )

        results.append({
            "user_email":   user_email,
            "score_value":  result["score"],
            "model_used":   result["model_used"],
            "explanation":  explanation,
            "eligibility":  eligibility,
            "months_count": months_count,
            "data_period":  month_data["month"],
            "version":      i + 1,
            "created_at":   now,
            "expires_at":   now + timedelta(days=30),
        })

    return list(reversed(results))  # newest first


@router.post("/calculate", summary="Calculate credit scores", description="Computes a rolling weighted credit score for every month of uploaded data. Uses a trained ML model with SHAP explainability. Deletes stale entries and regenerates one score document per data month.")
def calculate_score(current_user: dict = Depends(get_current_user)):
    raw_profiles = list(profiles_col.find(
        {"user_email": current_user["email"]},
        {"_id": 0},
    ).sort("month", 1))

    if not raw_profiles:
        raise HTTPException(status_code=404, detail="No profile data found. Please upload your data first.")

    all_monthly = _aggregate_monthly(raw_profiles)  # most recent first
    monthly_scores = _compute_all_monthly_scores(current_user["email"], all_monthly)

    # Replace all existing score entries with fresh per-month calculations
    scores_col.delete_many({"user_email": current_user["email"]})
    if monthly_scores:
        scores_col.insert_many(monthly_scores)

    latest = monthly_scores[0]
    return {
        "score":        latest["score_value"],
        "model_used":   latest["model_used"],
        "explanation":  latest["explanation"],
        "eligibility":  latest["eligibility"],
        "months_count": latest["months_count"],
        "version":      latest["version"],
    }


@router.get("/daily", summary="Daily score progression for a month", description="Returns a day-by-day running credit score for the specified month (format: YYYY-MM). Each data point reflects cumulative performance up to that day, combined with the rolling window of prior months.")
def get_daily_scores(month: str, current_user: dict = Depends(get_current_user)):
    """
    Return day-by-day running score for a specific month.
    Each day's score is computed using cumulative stats up to that day
    combined with the rolling window of previous months.
    """
    # Previous months' profiles (for rolling window)
    raw_profiles = list(profiles_col.find(
        {"user_email": current_user["email"], "month": {"$lt": month}},
        {"_id": 0},
    ).sort("month", -1))
    prev_monthly = _aggregate_monthly(raw_profiles) if raw_profiles else []

    # Raw daily rows for the requested month
    daily_rows = list(daily_records_col.find(
        {"user_email": current_user["email"], "month": month},
        {"_id": 0},
    ).sort("date", 1))

    if not daily_rows:
        return {"daily": []}

    year, mon = int(month.split("-")[0]), int(month.split("-")[1])
    days_in_month = cal.monthrange(year, mon)[1]

    results = []
    cum_completed = 0
    cum_cancelled = 0
    cum_earnings  = 0
    cum_hours     = []
    cum_ratings   = []
    active_days   = 0
    total_days    = 0

    rows_by_date: dict = {}
    for r in daily_rows:
        rows_by_date.setdefault(r["date"], []).append(r)

    all_dates = sorted(rows_by_date.keys())

    for date_str in all_dates:
        day_rows = rows_by_date[date_str]
        total_days += 1

        day_completed = sum(r["jobs_completed"] for r in day_rows)
        day_cancelled = sum(r["jobs_cancelled"] for r in day_rows)
        day_earnings  = sum(r["total_earnings"]  for r in day_rows)
        day_hours     = sum(r["hours_online"]     for r in day_rows)
        day_ratings   = [r["average_rating"] for r in day_rows if r["average_rating"] > 0]

        cum_completed += day_completed
        cum_cancelled += day_cancelled
        cum_earnings  += day_earnings
        cum_hours.append(day_hours)
        cum_ratings.extend(day_ratings)
        if day_hours > 0:
            active_days += 1

        total_tasks = cum_completed + cum_cancelled
        task_completion_rate = cum_completed / total_tasks if total_tasks > 0 else 0.0
        gps_consistency      = active_days / days_in_month
        customer_rating      = sum(cum_ratings) / len(cum_ratings) if cum_ratings else 3.0

        platforms_in_month = list(set(r["platform"] for r in daily_rows))
        platform_diversity = max(len(platforms_in_month), 1)

        partial_month = {
            "month":                month,
            "task_completion_rate": round(task_completion_rate, 4),
            "gps_consistency":      round(gps_consistency, 4),
            "customer_rating":      round(customer_rating, 4),
            "platform_name":        day_rows[0]["platform"],
            "platform_diversity":   platform_diversity,
            "total_earnings":       round(cum_earnings, 2),
            "worker_id":            current_user["email"].split("@")[0],
        }

        window = [partial_month] + prev_monthly
        synthetic = _build_synthetic(window)
        result = get_score(synthetic)

        results.append({
            "date":  date_str,
            "score": result["score"],
        })

    return {"daily": results, "month": month}


@router.get("/history", summary="Monthly score history", description="Returns all monthly credit score entries for the authenticated worker, sorted newest first. Each entry includes the score value, eligibility status, SHAP-based explanation, and the data period it represents.")
def get_score_history(current_user: dict = Depends(get_current_user)):
    history = list(
        scores_col.find(
            {"user_email": current_user["email"]},
            {"_id": 0},
        ).sort("data_period", -1)
    )
    return {"history": history}
