import os
import numpy as np

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

    final_score = 300 + (s_raw * 550)

    return round(final_score)

def validate_profile(profile):
    if profile.task_completion_rate < 0 or profile.task_completion_rate > 1:
        raise ValueError("Task completion rate must be between 0 and 1")

    if profile.customer_rating < 1 or profile.customer_rating > 5:
        raise ValueError("Customer rating must be between 1 and 5")

    if any(e < 0 for e in profile.daily_earnings):
        raise ValueError("Daily earnings cannot be negative")


# Try to load ML model, fall back to None if not available
ml_model = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_model.pkl")

try:
    import joblib
    if os.path.exists(MODEL_PATH):
        ml_model = joblib.load(MODEL_PATH)
        print(f"ML model loaded from {MODEL_PATH}")
    else:
        print(f"ML model not found at {MODEL_PATH}, using baseline scoring")
except ImportError:
    print("joblib not installed, using baseline scoring")
except Exception as e:
    print(f"Error loading ML model: {e}, using baseline scoring")


def calculate_ml_score(profile):
    if ml_model is None:
        return None
    
    features = np.array([[
        profile.task_completion_rate,
        profile.gps_consistency,
        profile.customer_rating,
        profile.platform_diversity
    ]])

    return float(ml_model.predict(features)[0])


def get_score(profile):
    baseline = calculate_baseline(profile)
    
    # Try ML scoring if model is available
    if ml_model is not None:
        try:
            ml_score = calculate_ml_score(profile)
            
            if ml_score is not None:
                # safety check
                if abs(ml_score - baseline) > 100:
                    return {
                        "score": baseline,
                        "model_used": "baseline",
                        "explanation_mode": "rule_based"
                    }

                return {
                    "score": round(ml_score),
                    "model_used": "ml",
                    "explanation_mode": "shap"
                }
        except Exception as e:
            print(f"ML scoring failed: {e}, falling back to baseline")
    
    # Fall back to baseline scoring
    return {
        "score": baseline,
        "model_used": "baseline",
        "explanation_mode": "rule_based"
    }
