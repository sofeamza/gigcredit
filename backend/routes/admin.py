from fastapi import APIRouter, Depends, HTTPException
from services.auth_service import get_current_user
from config import users_col, profiles_col, scores_col
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: dict = Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]})

    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user


@router.get("/stats")
def get_admin_stats(admin: dict = Depends(require_admin)):
    total_users = users_col.count_documents({})
    total_profiles = profiles_col.count_documents({})
    total_scores = scores_col.count_documents({})

    scores = list(scores_col.find({}, {"_id": 0, "score_value": 1}))

    if scores:
        avg_score = round(sum(s["score_value"] for s in scores) / len(scores))
    else:
        avg_score = 0

    poor = sum(1 for s in scores if s["score_value"] < 580)
    fair = sum(1 for s in scores if 580 <= s["score_value"] < 700)
    good = sum(1 for s in scores if s["score_value"] >= 700)

    return {
        "total_users": total_users,
        "total_profiles": total_profiles,
        "total_scores": total_scores,
        "average_score": avg_score,
        "score_distribution": {
            "poor": poor,
            "fair": fair,
            "good": good
        },
        "api_health": "healthy",
        "checked_at": datetime.utcnow()
    }


@router.get("/users")
def get_users(admin: dict = Depends(require_admin)):
    users = list(users_col.find({}, {
        "_id": 0,
        "email": 1,
        "role": 1
    }))

    return {"users": users}


@router.delete("/users/{email}")
def delete_user(email: str, admin: dict = Depends(require_admin)):
    users_col.delete_one({"email": email})
    profiles_col.delete_many({"user_email": email})
    scores_col.delete_many({"user_email": email})

    return {"message": f"User {email} deleted successfully"}