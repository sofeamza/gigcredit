from fastapi import FastAPI
from config import users_col, profiles_col, scores_col, explanations_col, db
from routes.auth import router as auth_router

app = FastAPI()
app.include_router(auth_router)

@app.on_event("startup")
def create_indexes():
    users_col.create_index("email", unique=True)
    profiles_col.create_index([("user_id", 1), ("platform_name", 1)])
    scores_col.create_index([("user_id", 1), ("calculated_at", -1)])
    explanations_col.create_index("score_id")

    print("Indexes created successfully")

@app.get("/test-db")
def test_db():
    return {"collections": db.list_collection_names()}

from models.profile import Profile

@app.post("/test-profile")
def test_profile(profile: Profile):
    return {"message": "Valid!", "data": profile}

from models.profile import Profile
from services.scoring_engine import get_score



from services.scoring_engine import get_score
from services.shap_explainer import explain_ml

@app.post("/calculate-score")
def calculate_score(profile: Profile):

    result = get_score(profile)

    if result["model_used"] == "ml":
        explanation = explain_ml(profile)
    else:
        explanation = ["Using safe baseline model due to instability in ML prediction"]

    return {
        "score": result["score"],
        "model_used": result["model_used"],
        "explanation": explanation
    }

from fastapi import Depends
from services.auth_service import get_current_user

@app.get("/protected-test")
def protected_test(current_user: dict = Depends(get_current_user)):
    return {
        "message": "You are authenticated",
        "user": current_user
    }

from routes.score import router as score_router

app.include_router(score_router)

from routes.simulation import router as simulation_router

app.include_router(simulation_router)