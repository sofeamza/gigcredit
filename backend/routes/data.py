from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io

from services.auth_service import get_current_user
from config import profiles_col

router = APIRouter(prefix="/data", tags=["Data"])

REQUIRED_COLUMNS = [
    "worker_id",
    "platform",
    "month",
    "total_tasks_assigned",
    "tasks_completed",
    "cancellation_rate",
    "avg_rating",
    "active_days",
    "gps_consistency",
    "total_earnings"
]


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]

    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {missing}"
        )

    records = []

    for _, row in df.iterrows():
        total_tasks = row["total_tasks_assigned"]
        tasks_completed = row["tasks_completed"]

        if total_tasks <= 0:
            continue

        profile = {
            "user_email": current_user["email"],
            "worker_id": str(row["worker_id"]),
            "platform_name": row["platform"],
            "month": row["month"],
            "task_completion_rate": round(tasks_completed / total_tasks, 2),
            "gps_consistency": float(row["gps_consistency"]),
            "customer_rating": float(row["avg_rating"]),
            "platform_diversity": 1,
            "total_earnings": float(row["total_earnings"])
        }

        records.append(profile)

    if not records:
        raise HTTPException(status_code=400, detail="No valid records found")

    profiles_col.insert_many(records)

    return {
        "message": "CSV uploaded successfully",
        "records_inserted": len(records)
    }


@router.get("/profiles")
async def get_profiles(current_user: dict = Depends(get_current_user)):
    """Get all profile data for the current user"""
    profiles = list(
        profiles_col.find(
            {"user_email": current_user["email"]},
            {"_id": 0}
        ).sort("month", -1)
    )

    return profiles


@router.get("/profiles/latest")
async def get_latest_profile(current_user: dict = Depends(get_current_user)):
    """Get the most recent profile data for the current user"""
    profile = profiles_col.find_one(
        {"user_email": current_user["email"]},
        {"_id": 0},
        sort=[("month", -1)]
    )

    if not profile:
        raise HTTPException(status_code=404, detail="No profile data found")

    return profile

