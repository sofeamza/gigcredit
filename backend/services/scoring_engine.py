import joblib
import numpy as np

ml_model = joblib.load("ml_model.pkl")


def calculate_baseline(profile):
    n_tc = profile.task_completion_rate
    n_gps = profile.gps_consistency
    n_cr = (profile.customer_rating - 1) / 4
    n_pd = min(profile.platform_diversity / 4, 1.0)

    s_raw = (
        (0.40 * n_tc) +
        (0.30 * n_gps) +
        (0.20 * n_cr) +
        (0.10 * n_pd)
    )

    return round(300 + (s_raw * 550))


def validate_profile(profile):
    if profile.task_completion_rate < 0 or profile.task_completion_rate > 1:
        raise ValueError("Task completion rate must be between 0 and 1")
    if profile.customer_rating < 1 or profile.customer_rating > 5:
        raise ValueError("Customer rating must be between 1 and 5")
    if any(e < 0 for e in profile.daily_earnings):
        raise ValueError("Daily earnings cannot be negative")


def calculate_ml_score(profile):
    features = np.array([[
        profile.task_completion_rate,
        profile.gps_consistency,
        profile.customer_rating,
        profile.platform_diversity,
    ]])
    return float(ml_model.predict(features)[0])


def get_score(profile):
    baseline = calculate_baseline(profile)
    ml_score = calculate_ml_score(profile)

    if abs(ml_score - baseline) > 100:
        return {"score": baseline, "model_used": "baseline"}

    return {"score": round(ml_score), "model_used": "ml"}


def calculate_weighted_rolling_score(monthly_aggregates: list) -> dict:
    """
    monthly_aggregates: list of dicts sorted by month descending (most recent first).
    Applies descending weights so recent months count more.
    Returns score result dict.
    """
    from models.profile import Profile

    profiles = monthly_aggregates[:12]
    n = len(profiles)
    weights = list(range(n, 0, -1))          # [n, n-1, ..., 1]
    total_weight = sum(weights)              # n*(n+1)/2

    def wavg(field):
        return sum(p[field] * w for p, w in zip(profiles, weights)) / total_weight

    task_completion_rate = wavg("task_completion_rate")
    gps_consistency      = wavg("gps_consistency")
    customer_rating      = wavg("customer_rating")

    # Platform diversity: unique platforms across most recent 3 months (or all if fewer)
    recent = profiles[:3]
    platform_diversity = max(len(set(p["platform_name"] for p in recent)), 1)

    earnings = [p["total_earnings"] for p in profiles]

    synthetic = Profile(
        user_id=profiles[0].get("worker_id", ""),
        platform_name=profiles[0].get("platform_name", ""),
        task_completion_rate=round(task_completion_rate, 4),
        gps_consistency=round(gps_consistency, 4),
        customer_rating=round(customer_rating, 4),
        platform_diversity=platform_diversity,
        daily_earnings=earnings,
    )

    return get_score(synthetic)
