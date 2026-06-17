from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io

from services.auth_service import get_current_user
from config import profiles_col
from services.column_mapper import REQUIRED_COLUMNS, auto_map_columns, apply_column_mapping
from datetime import datetime

router = APIRouter(prefix="/data", tags=["Data"])


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    
    contents = await file.read()

    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))

        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents))

        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(contents))

        elif filename.endswith(".gpx"):
            raise HTTPException(
                status_code=400,
                detail="GPX support coming soon"
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format"
        )

    mapping, missing = auto_map_columns(df.columns)

    if missing:
        return {
            "status": "mapping_required",
            "message": "Some columns could not be recognized automatically.",
            "detected_mapping": mapping,
            "missing_columns": missing,
            "uploaded_columns": list(df.columns)
        }

    df = apply_column_mapping(df, mapping)

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
            "total_earnings": float(row["total_earnings"]),
            "uploaded_at": datetime.utcnow()
        }

        records.append(profile)

    if not records:
        raise HTTPException(status_code=400, detail="No valid records found")

    profiles_col.insert_many(records)

    return {
        "message": "CSV uploaded successfully",
        "records_inserted": len(records)
    }

@router.get("/my-profile")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    profile = profiles_col.find_one(
        {"user_email": current_user["email"]},
        {"_id": 0},
        sort=[("_id", -1)]
    )

    if not profile:
        raise HTTPException(status_code=404, detail="No uploaded profile found")

    return {
        "user_id": profile["worker_id"],
        "platform_name": profile["platform_name"],
        "task_completion_rate": profile["task_completion_rate"],
        "gps_consistency": profile["gps_consistency"],
        "customer_rating": profile["customer_rating"],
        "platform_diversity": profile["platform_diversity"],
        "daily_earnings": [profile["total_earnings"]]
    }