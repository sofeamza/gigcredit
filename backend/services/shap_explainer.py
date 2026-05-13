import os
import numpy as np

# Try to load model and create SHAP explainer
model = None
explainer = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_model.pkl")

try:
    import joblib
    import shap
    
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        explainer = shap.TreeExplainer(model)
        print("SHAP explainer initialized")
    else:
        print(f"ML model not found at {MODEL_PATH}, SHAP explanations disabled")
except ImportError as e:
    print(f"Required packages not installed ({e}), SHAP explanations disabled")
except Exception as e:
    print(f"Error initializing SHAP explainer: {e}")


feature_names = [
    "task_completion_rate",
    "gps_consistency",
    "customer_rating",
    "platform_diversity"
]

# Rule-based explanations as fallback
def get_rule_based_explanations(profile):
    """Generate explanations based on simple rules when SHAP is not available"""
    explanations = []
    
    # Task completion rate
    if profile.task_completion_rate >= 0.9:
        explanations.append("High task completion rate (90%+) significantly boosted your score")
    elif profile.task_completion_rate >= 0.7:
        explanations.append("Good task completion rate contributed positively to your score")
    else:
        explanations.append("Lower task completion rate reduced your score potential")
    
    # GPS consistency
    if profile.gps_consistency >= 0.9:
        explanations.append("Excellent GPS consistency improved your reliability rating")
    elif profile.gps_consistency >= 0.7:
        explanations.append("Good GPS consistency helped your score")
    else:
        explanations.append("Improving GPS consistency could boost your score")
    
    # Customer rating
    if profile.customer_rating >= 4.5:
        explanations.append("Outstanding customer rating (4.5+) enhanced your profile")
    elif profile.customer_rating >= 4.0:
        explanations.append("Good customer rating contributed to your score")
    else:
        explanations.append("Improving customer rating would help increase your score")
    
    # Platform diversity
    if profile.platform_diversity >= 3:
        explanations.append("Working across multiple platforms shows income stability")
    elif profile.platform_diversity >= 2:
        explanations.append("Platform diversity is moderate, consider expanding")
    else:
        explanations.append("Single platform usage limits diversification benefits")
    
    return explanations


def explain_ml(profile):
    """Generate SHAP-based explanations if available, otherwise use rule-based"""
    if explainer is None:
        return get_rule_based_explanations(profile)
    
    try:
        features = np.array([[
            profile.task_completion_rate,
            profile.gps_consistency,
            profile.customer_rating,
            profile.platform_diversity
        ]])

        shap_values = explainer.shap_values(features)[0]

        explanations = []

        for name, value in zip(feature_names, shap_values):
            direction = "increased" if value > 0 else "decreased"
            explanations.append(
                f"{name} {direction} your score by {round(abs(value), 2)} points"
            )

        return explanations
    except Exception as e:
        print(f"SHAP explanation failed: {e}, using rule-based")
        return get_rule_based_explanations(profile)
