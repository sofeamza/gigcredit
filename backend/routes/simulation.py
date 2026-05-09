from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
import hashlib
import json

from models.profile import Profile
from services.scoring_engine import get_score
from services.shap_explainer import explain_ml
from services.auth_service import get_current_user

router = APIRouter(prefix="/simulate", tags=["Simulation"])

simulation_cache = {}
CACHE_TTL_MINUTES = 15


def make_cache_key(profile: Profile, user_email: str):
    data = profile.dict()
    data["user_email"] = user_email
    raw = json.dumps(data, sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


@router.post("")
def simulate_score(
    profile: Profile,
    current_user: dict = Depends(get_current_user)
):
    cache_key = make_cache_key(profile, current_user["email"])

    if cache_key in simulation_cache:
        cached = simulation_cache[cache_key]

        if datetime.utcnow() < cached["expires_at"]:
            return {
                "cached": True,
                "score": cached["score"],
                "model_used": cached["model_used"],
                "explanation": cached["explanation"]
            }

    result = get_score(profile)

    if result["model_used"] == "ml":
        explanation = explain_ml(profile)
    else:
        explanation = ["Using safe baseline model due to instability in ML prediction"]

    simulation_cache[cache_key] = {
        "score": result["score"],
        "model_used": result["model_used"],
        "explanation": explanation,
        "expires_at": datetime.utcnow() + timedelta(minutes=CACHE_TTL_MINUTES)
    }

    return {
        "cached": False,
        "score": result["score"],
        "model_used": result["model_used"],
        "explanation": explanation
    }