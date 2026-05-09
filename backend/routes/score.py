from fastapi import APIRouter, Depends
from datetime import datetime, timedelta

from models.profile import Profile
from services.scoring_engine import get_score
from services.shap_explainer import explain_ml
from services.auth_service import get_current_user
from config import scores_col

router = APIRouter(prefix="/score", tags=["Score"])


@router.post("/calculate")
def calculate_score(
    profile: Profile,
    current_user: dict = Depends(get_current_user)
):
    result = get_score(profile)

    if result["model_used"] == "ml":
        explanation = explain_ml(profile)
    else:
        explanation = ["Using safe baseline model due to instability in ML prediction"]

    score_document = {
        "user_email": current_user["email"],
        "score_value": result["score"],
        "model_used": result["model_used"],
        "explanation": explanation,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30)
    }

    scores_col.insert_one(score_document)

    return {
        "score": result["score"],
        "model_used": result["model_used"],
        "explanation": explanation
    }


@router.get("/history")
def get_score_history(current_user: dict = Depends(get_current_user)):
    history = list(
        scores_col.find(
            {"user_email": current_user["email"]},
            {"_id": 0}
        ).sort("created_at", -1)
    )

    return {"history": history}