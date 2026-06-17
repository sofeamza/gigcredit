from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Literal
from services.auth_service import get_current_user, hash_password
from config import users_col, profiles_col, scores_col, fi_access_logs_col
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Guards ────────────────────────────────────────────────────────────────────

def require_admin(current_user: dict = Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_admin_or_fi(current_user: dict = Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]})
    if not user or user.get("role") not in ("admin", "financial_institution"):
        raise HTTPException(status_code=403, detail="Access restricted")
    return current_user


def require_active_fi(current_user: dict = Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]})
    if not user or user.get("role") != "financial_institution":
        raise HTTPException(status_code=403, detail="Financial institution access required")
    if user.get("fi_status") != "active":
        raise HTTPException(status_code=403, detail="Your account is suspended. Contact an administrator.")
    return current_user


# ── Admin stats ───────────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_stats(admin: dict = Depends(require_admin)):
    total_users = users_col.count_documents({})
    total_profiles = profiles_col.count_documents({})
    total_scores = scores_col.count_documents({})

    scores = list(scores_col.find({}, {"_id": 0, "score_value": 1}))

    avg_score = round(sum(s["score_value"] for s in scores) / len(scores)) if scores else 0
    poor = sum(1 for s in scores if s["score_value"] < 580)
    fair = sum(1 for s in scores if 580 <= s["score_value"] < 700)
    good = sum(1 for s in scores if s["score_value"] >= 700)

    return {
        "total_users": total_users,
        "total_profiles": total_profiles,
        "total_scores": total_scores,
        "average_score": avg_score,
        "score_distribution": {"poor": poor, "fair": fair, "good": good},
        "api_health": "healthy",
        "checked_at": datetime.utcnow(),
    }


# ── User management ───────────────────────────────────────────────────────────

@router.get("/users")
def get_users(admin: dict = Depends(require_admin)):
    users = list(users_col.find({}, {"_id": 0, "email": 1, "role": 1}))
    return {"users": users}


@router.delete("/users/{email}")
def delete_user(email: str, admin: dict = Depends(require_admin)):
    users_col.delete_one({"email": email})
    profiles_col.delete_many({"user_email": email})
    scores_col.delete_many({"user_email": email})
    return {"message": f"User {email} deleted successfully"}


# ── Financial institution management ─────────────────────────────────────────

class CreateFIRequest(BaseModel):
    institution_name: str
    email: EmailStr
    password: str


class UpdateFIStatusRequest(BaseModel):
    status: Literal["active", "suspended"]


@router.post("/financial-institutions")
def create_financial_institution(req: CreateFIRequest, admin: dict = Depends(require_admin)):
    if users_col.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    users_col.insert_one({
        "email": req.email,
        "hashed_password": hash_password(req.password),
        "role": "financial_institution",
        "institution_name": req.institution_name,
        "fi_status": "active",
        "created_at": datetime.utcnow(),
    })

    return {"message": f"Financial institution '{req.institution_name}' created"}


@router.get("/financial-institutions")
def get_financial_institutions(admin: dict = Depends(require_admin)):
    institutions = list(users_col.find(
        {"role": "financial_institution"},
        {"_id": 0, "email": 1, "institution_name": 1, "fi_status": 1, "created_at": 1},
    ))

    for inst in institutions:
        inst["profile_views"] = fi_access_logs_col.count_documents({"fi_email": inst["email"]})

    total = len(institutions)
    active = sum(1 for i in institutions if i.get("fi_status") == "active")
    suspended = sum(1 for i in institutions if i.get("fi_status") == "suspended")
    total_views = sum(i["profile_views"] for i in institutions)

    return {
        "institutions": institutions,
        "summary": {
            "total": total,
            "active": active,
            "suspended": suspended,
            "total_views": total_views,
        },
    }


@router.patch("/financial-institutions/{email}/status")
def update_fi_status(email: str, req: UpdateFIStatusRequest, admin: dict = Depends(require_admin)):
    result = users_col.update_one(
        {"email": email, "role": "financial_institution"},
        {"$set": {"fi_status": req.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Financial institution not found")
    return {"message": f"Status updated to {req.status}"}


# ── FI access log ─────────────────────────────────────────────────────────────

@router.get("/fi-access-logs")
def get_fi_access_logs(admin: dict = Depends(require_admin)):
    logs = list(fi_access_logs_col.find(
        {},
        {"_id": 0, "fi_email": 1, "institution_name": 1, "worker_id": 1, "score_value": 1, "accessed_at": 1},
        sort=[("accessed_at", -1)],
    ).limit(200))
    return {"logs": logs}


class LogFIAccessRequest(BaseModel):
    worker_email: str
    score_value: float


@router.post("/fi-access-logs")
def log_fi_access(req: LogFIAccessRequest, current_user: dict = Depends(require_active_fi)):
    user = users_col.find_one({"email": current_user["email"]})
    fi_access_logs_col.insert_one({
        "fi_email": current_user["email"],
        "institution_name": user.get("institution_name", ""),
        "worker_id": req.worker_email,
        "score_value": req.score_value,
        "accessed_at": datetime.utcnow(),
    })
    return {"message": "Access logged"}


# ── Read-only stats for FI ────────────────────────────────────────────────────

@router.get("/worker-scores")
def get_worker_scores(current_user: dict = Depends(require_admin_or_fi)):
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$user_email",
            "score_value":  {"$first": "$score_value"},
            "model_used":   {"$first": "$model_used"},
            "explanation":  {"$first": "$explanation"},
            "eligibility":  {"$first": "$eligibility"},
            "months_count": {"$first": "$months_count"},
            "version":      {"$first": "$version"},
            "created_at":   {"$first": "$created_at"},
        }},
        {"$project": {
            "_id": 0,
            "user_email":   "$_id",
            "score_value":  1,
            "model_used":   1,
            "explanation":  1,
            "eligibility":  1,
            "months_count": 1,
            "version":      1,
            "created_at":   1,
        }},
    ]
    scores = list(scores_col.aggregate(pipeline))
    return {"scores": scores}


@router.get("/view-stats")
def get_view_stats(current_user: dict = Depends(require_admin_or_fi)):
    total_profiles = profiles_col.count_documents({})
    total_scores = scores_col.count_documents({})
    scores = list(scores_col.find({}, {"_id": 0, "score_value": 1}))
    avg_score = round(sum(s["score_value"] for s in scores) / len(scores)) if scores else 0
    poor = sum(1 for s in scores if s["score_value"] < 580)
    fair = sum(1 for s in scores if 580 <= s["score_value"] < 700)
    good = sum(1 for s in scores if s["score_value"] >= 700)

    return {
        "total_profiles": total_profiles,
        "total_scores": total_scores,
        "average_score": avg_score,
        "score_distribution": {"poor": poor, "fair": fair, "good": good},
    }
