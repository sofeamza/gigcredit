from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import pandas as pd
import io

from services.auth_service import get_current_user
from config import profiles_col
from services.column_mapper import REQUIRED_COLUMNS, auto_map_columns, apply_column_mapping
from datetime import datetime

router = APIRouter(prefix="/data", tags=["Data"])

MIN_ACTIVE_DAYS   = 10
MIN_TASKS         = 30


@router.post("/upload")
async def upload_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    contents = await file.read()
    filename  = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents))
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(contents))
        elif filename.endswith(".gpx"):
            raise HTTPException(status_code=400, detail="GPX support coming soon")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file format")

    mapping, missing = auto_map_columns(df.columns)

    if missing:
        return {
            "status": "mapping_required",
            "message": "Some columns could not be recognized automatically.",
            "detected_mapping": mapping,
            "missing_columns": missing,
            "uploaded_columns": list(df.columns),
        }

    df = apply_column_mapping(df, mapping)

    validation_results = []
    inserted = 0
    failed   = 0

    for _, row in df.iterrows():
        month          = str(row["month"]).strip()
        platform       = str(row["platform"]).strip()
        total_tasks    = int(row["total_tasks_assigned"])
        tasks_done     = int(row["tasks_completed"])
        active_days    = int(row.get("active_days", 0))
        total_earnings = float(row["total_earnings"])

        # ── Validation ───────────────────────────────────────────────────────
        reasons = []
        if active_days < MIN_ACTIVE_DAYS:
            reasons.append(f"Only {active_days} active days (minimum {MIN_ACTIVE_DAYS})")
        if tasks_done < MIN_TASKS:
            reasons.append(f"Only {tasks_done} completed tasks (minimum {MIN_TASKS})")
        if total_earnings <= 0:
            reasons.append("Earnings record is zero or invalid")
        if total_tasks <= 0:
            reasons.append("Total tasks assigned is zero")

        if reasons:
            validation_results.append({
                "month": month,
                "platform": platform,
                "status": "failed",
                "reasons": reasons,
            })
            failed += 1
            continue

        # ── Build profile doc ─────────────────────────────────────────────────
        profile_doc = {
            "user_email":           current_user["email"],
            "worker_id":            str(row["worker_id"]),
            "platform_name":        platform,
            "month":                month,
            "task_completion_rate": round(tasks_done / total_tasks, 4),
            "gps_consistency":      float(row["gps_consistency"]),
            "customer_rating":      float(row["avg_rating"]),
            "platform_diversity":   1,
            "total_earnings":       total_earnings,
            "tasks_completed":      tasks_done,
            "active_days":          active_days,
            "uploaded_at":          datetime.utcnow(),
        }

        # Upsert: same user + month + platform replaces previous upload
        profiles_col.update_one(
            {
                "user_email":    current_user["email"],
                "month":         month,
                "platform_name": platform,
            },
            {"$set": profile_doc},
            upsert=True,
        )

        validation_results.append({
            "month":    month,
            "platform": platform,
            "status":   "passed",
        })
        inserted += 1

    if inserted == 0:
        return {
            "status":             "validation_failed",
            "message":            "No records passed validation. Please check the requirements below.",
            "records_inserted":   0,
            "records_failed":     failed,
            "validation_results": validation_results,
        }

    return {
        "status":             "success",
        "message":            f"{inserted} month(s) of data uploaded successfully.",
        "records_inserted":   inserted,
        "records_failed":     failed,
        "validation_results": validation_results,
    }


@router.get("/my-profile")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    profiles = list(profiles_col.find(
        {"user_email": current_user["email"]},
        {"_id": 0},
    ).sort("month", -1))

    if not profiles:
        raise HTTPException(status_code=404, detail="No uploaded profile found")

    # Aggregate by month
    from collections import defaultdict
    monthly: dict = defaultdict(list)
    for p in profiles:
        monthly[p["month"]].append(p)

    months_count = len(monthly)

    if months_count < 3:
        eligibility = "insufficient"
    elif months_count < 6:
        eligibility = "preliminary"
    else:
        eligibility = "official"

    # Most recent month for display fields
    latest = profiles[0]

    return {
        "user_id":              latest["worker_id"],
        "platform_name":        latest["platform_name"],
        "task_completion_rate": latest["task_completion_rate"],
        "gps_consistency":      latest["gps_consistency"],
        "customer_rating":      latest["customer_rating"],
        "platform_diversity":   latest["platform_diversity"],
        "daily_earnings":       [latest["total_earnings"]],
        "months_count":         months_count,
        "eligibility":          eligibility,
    }
