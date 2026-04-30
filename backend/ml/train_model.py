import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

np.random.seed(42)

n = 1000

data = pd.DataFrame({
    "task_completion_rate": np.random.uniform(0.3, 1.0, n),
    "gps_consistency": np.random.uniform(0.3, 1.0, n),
    "customer_rating": np.random.uniform(1.0, 5.0, n),
    "platform_diversity": np.random.randint(1, 5, n)
})

def generate_score(row):
    n_tc = row["task_completion_rate"]
    n_gps = row["gps_consistency"]
    n_cr = (row["customer_rating"] - 1) / 4
    n_pd = min(row["platform_diversity"] / 4, 1.0)

    raw = (0.4*n_tc + 0.3*n_gps + 0.2*n_cr + 0.1*n_pd)

    return 300 + (raw * 550)


data["score"] = data.apply(generate_score, axis=1)

X = data.drop("score", axis=1)
y = data["score"]

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X, y)

joblib.dump(model, "ml_model.pkl")

print("Model trained and saved!")

