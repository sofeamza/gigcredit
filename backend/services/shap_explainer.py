import shap
import numpy as np
import joblib

# load trained model
model = joblib.load("ml_model.pkl")

# create SHAP explainer
explainer = shap.TreeExplainer(model)

feature_names = [
    "task_completion_rate",
    "gps_consistency",
    "customer_rating",
    "platform_diversity"
]

def explain_ml(profile):
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

